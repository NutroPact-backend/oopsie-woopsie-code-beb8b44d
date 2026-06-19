
-- PERF-002/003/004: Move admin dashboard aggregation from app code into Postgres.
-- The previous implementation downloaded up to 5,000 orders + 20,000 visit rows
-- on every dashboard load and aggregated in JS. This single SECURITY DEFINER
-- function computes everything in SQL and returns a compact JSONB payload.

CREATE OR REPLACE FUNCTION public.get_dashboard_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid      uuid := auth.uid();
  _is_admin boolean;
  _now      timestamptz := now();
  _since    timestamptz := _now - make_interval(days => _days);
  _prev_since timestamptz := _now - make_interval(days => _days * 2);
  _today    timestamptz := date_trunc('day', _now);
  _result   jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _uid AND role IN ('admin','manager','super_admin')
  ) INTO _is_admin;
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  WITH
  cur_orders AS (
    SELECT * FROM public.orders
     WHERE created_at >= _since AND created_at <= _now
  ),
  prev_orders AS (
    SELECT * FROM public.orders
     WHERE created_at >= _prev_since AND created_at < _since
  ),
  cur_paid AS (
    SELECT * FROM cur_orders WHERE payment_status = 'paid' OR payment_method = 'cod'
  ),
  prev_paid AS (
    SELECT * FROM prev_orders WHERE payment_status = 'paid' OR payment_method = 'cod'
  ),
  kpi AS (
    SELECT
      COALESCE((SELECT SUM(total)::numeric FROM cur_paid), 0)              AS revenue,
      COALESCE((SELECT SUM(total)::numeric FROM prev_paid), 0)             AS prev_revenue,
      (SELECT COUNT(*)::int FROM cur_orders)                                AS order_count,
      (SELECT COUNT(*)::int FROM prev_orders)                               AS prev_order_count,
      (SELECT COUNT(DISTINCT COALESCE(user_id::text, customer_email))::int
         FROM cur_orders
        WHERE user_id IS NOT NULL OR customer_email IS NOT NULL)            AS customers,
      (SELECT COUNT(DISTINCT COALESCE(user_id::text, customer_email))::int
         FROM prev_orders
        WHERE user_id IS NOT NULL OR customer_email IS NOT NULL)            AS prev_customers,
      COALESCE((SELECT SUM(discount)::numeric FROM cur_orders), 0)          AS discount,
      COALESCE((SELECT SUM(shipping_cost)::numeric FROM cur_orders), 0)     AS shipping,
      (SELECT COUNT(*)::int FROM cur_orders WHERE order_status = 'cancelled')                                AS cancelled,
      (SELECT COUNT(*)::int FROM cur_orders WHERE order_status = 'delivered')                                AS delivered,
      (SELECT COUNT(*)::int FROM cur_orders WHERE order_status IN ('shipped','out_for_delivery'))            AS shipped,
      (SELECT COUNT(*)::int FROM cur_orders WHERE order_status IN ('pending','confirmed','processing'))     AS pending
  ),
  items_exploded AS (
    SELECT
      o.created_at,
      o.coupon_code,
      o.discount,
      o.total,
      o.user_id,
      o.customer_email,
      o.customer_name,
      o.order_status,
      o.payment_method,
      o.payment_status,
      o.shipping_address,
      it
    FROM cur_orders o, LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) it
  ),
  units_total AS (
    SELECT COALESCE(SUM((it->>'quantity')::int), 0)::int AS units
      FROM items_exploded
  ),
  top_products AS (
    SELECT jsonb_agg(t ORDER BY t.revenue DESC) AS rows
      FROM (
        SELECT
          COALESCE(it->>'productId', it->>'id', it->>'name', 'unknown') AS key,
          COALESCE(it->>'name', it->>'id', 'unknown')                    AS name,
          SUM((it->>'quantity')::int)::int                               AS qty,
          SUM(((it->>'price')::numeric) * (it->>'quantity')::int)::numeric AS revenue
          FROM items_exploded
         GROUP BY 1, 2
         ORDER BY revenue DESC NULLS LAST
         LIMIT 8
      ) t
  ),
  top_categories AS (
    SELECT jsonb_agg(t ORDER BY t.revenue DESC) AS rows
      FROM (
        SELECT
          COALESCE(it->>'category', 'Uncategorised') AS key,
          SUM((it->>'quantity')::int)::int           AS qty,
          SUM(((it->>'price')::numeric) * (it->>'quantity')::int)::numeric AS revenue
          FROM items_exploded
         GROUP BY 1
         ORDER BY revenue DESC NULLS LAST
         LIMIT 6
      ) t
  ),
  top_customers AS (
    SELECT jsonb_agg(t ORDER BY t.spend DESC) AS rows
      FROM (
        SELECT
          COALESCE(user_id::text, customer_email) AS key,
          MAX(customer_name)                       AS name,
          MAX(customer_email)                      AS email,
          COUNT(*)::int                            AS orders,
          SUM(total)::numeric                      AS spend
          FROM cur_orders
         WHERE user_id IS NOT NULL OR customer_email IS NOT NULL
         GROUP BY 1
         ORDER BY spend DESC
         LIMIT 6
      ) t
  ),
  top_coupons AS (
    SELECT jsonb_agg(t ORDER BY t.uses DESC) AS rows
      FROM (
        SELECT
          UPPER(coupon_code) AS key,
          COUNT(*)::int      AS uses,
          SUM(discount)::numeric AS discount
          FROM cur_orders
         WHERE coupon_code IS NOT NULL AND coupon_code <> ''
         GROUP BY 1
         ORDER BY uses DESC
         LIMIT 6
      ) t
  ),
  top_states AS (
    SELECT jsonb_agg(t ORDER BY t.revenue DESC) AS rows
      FROM (
        SELECT
          COALESCE(NULLIF(shipping_address->>'state',''), 'Unknown') AS key,
          COUNT(*)::int           AS orders,
          SUM(total)::numeric     AS revenue
          FROM cur_orders
         GROUP BY 1
         ORDER BY revenue DESC
         LIMIT 6
      ) t
  ),
  status_map AS (
    SELECT COALESCE(jsonb_object_agg(order_status, c), '{}'::jsonb) AS m
      FROM (SELECT order_status, COUNT(*)::int AS c FROM cur_orders GROUP BY 1) s
  ),
  pm_map AS (
    SELECT COALESCE(jsonb_object_agg(COALESCE(payment_method,'unknown'), c), '{}'::jsonb) AS m
      FROM (SELECT payment_method, COUNT(*)::int AS c FROM cur_orders GROUP BY 1) s
  ),
  hour_map AS (
    SELECT jsonb_agg(jsonb_build_object('orders', orders, 'revenue', revenue) ORDER BY h) AS rows
      FROM (
        SELECT g.h,
               COALESCE(c.cnt, 0)::int AS orders,
               COALESCE(c.rev, 0)::numeric AS revenue
          FROM generate_series(0,23) g(h)
          LEFT JOIN (
            SELECT EXTRACT(HOUR FROM created_at)::int AS h,
                   COUNT(*)::int AS cnt,
                   SUM(total)::numeric AS rev
              FROM cur_orders GROUP BY 1
          ) c ON c.h = g.h
      ) x
  ),
  dow_map AS (
    SELECT jsonb_agg(jsonb_build_object('orders', orders, 'revenue', revenue) ORDER BY d) AS rows
      FROM (
        SELECT g.d,
               COALESCE(c.cnt, 0)::int AS orders,
               COALESCE(c.rev, 0)::numeric AS revenue
          FROM generate_series(0,6) g(d)
          LEFT JOIN (
            SELECT EXTRACT(DOW FROM created_at)::int AS d,
                   COUNT(*)::int AS cnt,
                   SUM(total)::numeric AS rev
              FROM cur_orders GROUP BY 1
          ) c ON c.d = g.d
      ) x
  ),
  daily_series AS (
    SELECT jsonb_agg(jsonb_build_object(
             'day', to_char(g.day, 'YYYY-MM-DD'),
             'rev', COALESCE(cp.rev, 0),
             'count', COALESCE(co.cnt, 0),
             'prevRev', COALESCE(pp.rev, 0)
           ) ORDER BY g.day) AS rows
      FROM generate_series(date_trunc('day', _since), date_trunc('day', _now), interval '1 day') g(day)
      LEFT JOIN (
        SELECT date_trunc('day', created_at) AS d, SUM(total)::numeric AS rev
          FROM cur_paid GROUP BY 1
      ) cp ON cp.d = g.day
      LEFT JOIN (
        SELECT date_trunc('day', created_at) AS d, COUNT(*)::int AS cnt
          FROM cur_paid GROUP BY 1
      ) co ON co.d = g.day
      LEFT JOIN (
        SELECT date_trunc('day', created_at + make_interval(days => _days)) AS d,
               SUM(total)::numeric AS rev
          FROM prev_paid GROUP BY 1
      ) pp ON pp.d = g.day
  ),
  inventory AS (
    SELECT
      COUNT(*) FILTER (WHERE is_active AND COALESCE(stock_count,0) <= COALESCE(low_stock_threshold,5))::int AS low_count,
      COUNT(*) FILTER (WHERE is_active AND COALESCE(stock_count,0) = 0)::int                                AS out_count,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', id, 'name', name,
                 'stock', stock_count, 'threshold', low_stock_threshold
               ) ORDER BY stock_count NULLS FIRST)
          FROM (
            SELECT id, name, stock_count, low_stock_threshold
              FROM public.products
             WHERE is_active
               AND COALESCE(stock_count,0) <= COALESCE(low_stock_threshold,5)
             ORDER BY stock_count NULLS FIRST
             LIMIT 6
          ) x
      ), '[]'::jsonb) AS low_items
    FROM public.products
  ),
  carts AS (
    SELECT
      COUNT(*)::int                                                       AS total,
      COUNT(*) FILTER (WHERE status = 'recovered')::int                   AS recovered,
      COALESCE(SUM(subtotal) FILTER (WHERE status <> 'recovered'), 0)::numeric AS abandoned_value
      FROM public.abandoned_carts
     WHERE created_at >= _since
  ),
  visits_agg AS (
    SELECT
      COUNT(DISTINCT session_id)::int                                AS sessions,
      COUNT(DISTINCT session_id) FILTER (WHERE device = 'mobile')::int  AS mobile,
      COUNT(DISTINCT session_id) FILTER (WHERE device = 'desktop')::int AS desktop,
      COUNT(DISTINCT session_id) FILTER (WHERE device = 'tablet')::int  AS tablet,
      COUNT(DISTINCT session_id) FILTER (WHERE device IS NULL OR device NOT IN ('mobile','desktop','tablet'))::int AS unknown
    FROM public.site_visits WHERE created_at >= _since
  ),
  prev_visits_agg AS (
    SELECT COUNT(DISTINCT session_id)::int AS prev_sessions
      FROM public.site_visits WHERE created_at >= _prev_since AND created_at < _since
  ),
  traffic AS (
    SELECT COALESCE(jsonb_agg(t ORDER BY t.sessions DESC), '[]'::jsonb) AS rows
      FROM (
        SELECT src AS source, COUNT(DISTINCT session_id)::int AS sessions
          FROM (
            SELECT session_id,
              CASE
                WHEN utm_source IS NOT NULL AND utm_source <> '' THEN lower(utm_source)
                WHEN referrer IS NULL OR referrer = '' THEN 'direct'
                WHEN lower(referrer) LIKE '%google%' THEN 'google'
                WHEN lower(referrer) LIKE '%facebook%' OR lower(referrer) LIKE '%fb.%' THEN 'facebook'
                WHEN lower(referrer) LIKE '%instagram%' THEN 'instagram'
                WHEN lower(referrer) LIKE '%wa.me%' OR lower(referrer) LIKE '%whatsapp%' THEN 'whatsapp'
                WHEN lower(referrer) LIKE '%youtube%' THEN 'youtube'
                WHEN lower(referrer) LIKE '%bing%' THEN 'bing'
                ELSE 'other'
              END AS src
              FROM public.site_visits WHERE created_at >= _since
          ) s GROUP BY 1
      ) t
  ),
  cohorts AS (
    SELECT
      COUNT(*) FILTER (WHERE NOT had_prior)::int AS new_cust,
      COUNT(*) FILTER (WHERE had_prior)::int     AS returning_cust
    FROM (
      SELECT k,
        EXISTS (
          SELECT 1 FROM public.orders o2
           WHERE o2.created_at < _since
             AND COALESCE(o2.user_id::text, o2.customer_email) = k
        ) AS had_prior
      FROM (
        SELECT DISTINCT COALESCE(user_id::text, customer_email) AS k
          FROM cur_orders
         WHERE user_id IS NOT NULL OR customer_email IS NOT NULL
      ) ck
    ) c
  ),
  repeat_rate AS (
    SELECT
      COUNT(*)::int                              AS total_cust_ever,
      COUNT(*) FILTER (WHERE n > 1)::int         AS repeat_cust
    FROM (
      SELECT COALESCE(user_id::text, customer_email) AS k, COUNT(*)::int AS n
        FROM public.orders
       WHERE user_id IS NOT NULL OR customer_email IS NOT NULL
       GROUP BY 1
    ) r
  ),
  today_stats AS (
    SELECT
      (SELECT COUNT(*)::int FROM public.orders WHERE created_at >= _today)               AS orders,
      COALESCE((SELECT SUM(total)::numeric FROM public.orders
                 WHERE created_at >= _today
                   AND (payment_status = 'paid' OR payment_method = 'cod')), 0)          AS revenue,
      (SELECT COUNT(DISTINCT session_id)::int FROM public.site_visits
        WHERE created_at >= _today)                                                       AS sessions
  ),
  actionables AS (
    SELECT
      (SELECT COUNT(*)::int FROM cur_orders WHERE order_status = 'pending')             AS pending_orders,
      (SELECT COUNT(*)::int FROM public.contact_submissions WHERE status = 'new')        AS new_contacts,
      (SELECT COUNT(*)::int FROM public.product_questions WHERE status = 'pending')      AS pending_qa
  ),
  recent_orders AS (
    SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::jsonb) AS rows
      FROM (
        SELECT order_number, total, customer_name, order_status, payment_status, created_at
          FROM cur_orders
         ORDER BY created_at DESC
         LIMIT 8
      ) r
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('days', _days, 'from', _since, 'to', _now),
    'kpis', jsonb_build_object(
      'revenue', kpi.revenue, 'prevRevenue', kpi.prev_revenue,
      'orderCount', kpi.order_count, 'prevOrderCount', kpi.prev_order_count,
      'aov', CASE WHEN kpi.order_count > 0 THEN kpi.revenue / kpi.order_count ELSE 0 END,
      'prevAov', CASE WHEN kpi.prev_order_count > 0 THEN kpi.prev_revenue / kpi.prev_order_count ELSE 0 END,
      'customers', kpi.customers, 'prevCustomers', kpi.prev_customers,
      'units', (SELECT units FROM units_total),
      'cancelled', kpi.cancelled, 'delivered', kpi.delivered,
      'shipped', kpi.shipped, 'pending', kpi.pending,
      'discount', kpi.discount, 'shipping', kpi.shipping
    ),
    'series',         COALESCE((SELECT rows FROM daily_series), '[]'::jsonb),
    'topProducts',    COALESCE((SELECT rows FROM top_products), '[]'::jsonb),
    'topCategories',  COALESCE((SELECT rows FROM top_categories), '[]'::jsonb),
    'topCustomers',   COALESCE((SELECT rows FROM top_customers), '[]'::jsonb),
    'topCoupons',     COALESCE((SELECT rows FROM top_coupons), '[]'::jsonb),
    'topStates',      COALESCE((SELECT rows FROM top_states), '[]'::jsonb),
    'statusMap',      (SELECT m FROM status_map),
    'pmMap',          (SELECT m FROM pm_map),
    'hourMap',        COALESCE((SELECT rows FROM hour_map), '[]'::jsonb),
    'dowMap',         COALESCE((SELECT rows FROM dow_map), '[]'::jsonb),
    'inventory', jsonb_build_object(
      'lowCount',  (SELECT low_count FROM inventory),
      'outCount',  (SELECT out_count FROM inventory),
      'lowItems',  (SELECT low_items FROM inventory)
    ),
    'funnel', jsonb_build_object(
      'abandoned',      (SELECT total FROM carts),
      'recovered',      (SELECT recovered FROM carts),
      'orders',         kpi.order_count,
      'abandonedValue', (SELECT abandoned_value FROM carts),
      'recoveryRate',   CASE WHEN (SELECT total FROM carts) > 0
                             THEN ((SELECT recovered FROM carts)::numeric / (SELECT total FROM carts)) * 100
                             ELSE 0 END
    ),
    'actionables', jsonb_build_object(
      'pendingOrders', (SELECT pending_orders FROM actionables),
      'lowStock',      (SELECT low_count FROM inventory),
      'outOfStock',    (SELECT out_count FROM inventory),
      'newContacts',   (SELECT new_contacts FROM actionables),
      'pendingQA',     (SELECT pending_qa FROM actionables)
    ),
    'recentOrders', (SELECT rows FROM recent_orders),
    'visitors', jsonb_build_object(
      'sessions',          (SELECT sessions FROM visits_agg),
      'prevSessions',      (SELECT prev_sessions FROM prev_visits_agg),
      'conversionRate',    CASE WHEN (SELECT sessions FROM visits_agg) > 0
                                THEN (kpi.order_count::numeric / (SELECT sessions FROM visits_agg)) * 100
                                ELSE 0 END,
      'prevConversionRate',CASE WHEN (SELECT prev_sessions FROM prev_visits_agg) > 0
                                THEN (kpi.prev_order_count::numeric / (SELECT prev_sessions FROM prev_visits_agg)) * 100
                                ELSE 0 END,
      'deviceMap', jsonb_build_object(
        'mobile',  (SELECT mobile FROM visits_agg),
        'desktop', (SELECT desktop FROM visits_agg),
        'tablet',  (SELECT tablet FROM visits_agg),
        'unknown', (SELECT unknown FROM visits_agg)
      ),
      'trafficSource', (SELECT rows FROM traffic)
    ),
    'cohorts', jsonb_build_object(
      'newCust',       (SELECT new_cust FROM cohorts),
      'returningCust', (SELECT returning_cust FROM cohorts),
      'repeatRate',    CASE WHEN (SELECT total_cust_ever FROM repeat_rate) > 0
                            THEN ((SELECT repeat_cust FROM repeat_rate)::numeric / (SELECT total_cust_ever FROM repeat_rate)) * 100
                            ELSE 0 END,
      'repeatCust',    (SELECT repeat_cust FROM repeat_rate),
      'totalCustEver', (SELECT total_cust_ever FROM repeat_rate)
    ),
    'today', jsonb_build_object(
      'orders',   (SELECT orders FROM today_stats),
      'revenue',  (SELECT revenue FROM today_stats),
      'sessions', (SELECT sessions FROM today_stats)
    )
  )
  INTO _result
  FROM kpi;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_overview(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview(integer) TO service_role;
