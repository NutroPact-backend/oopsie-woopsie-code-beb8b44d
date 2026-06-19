
-- BIZ-010: SQL-side audience evaluation. Push the per-user aggregation and
-- rule filtering into Postgres so the worker never has to hold raw orders in
-- memory. All rule params are nullable — NULL means "no filter".
CREATE OR REPLACE FUNCTION public.evaluate_campaign_audience(
  _min_orders                int     DEFAULT NULL,
  _min_ltv                   numeric DEFAULT NULL,
  _last_order_days_ago_min   int     DEFAULT NULL,
  _last_order_days_ago_max   int     DEFAULT NULL,
  _city                      text    DEFAULT NULL,
  _state                     text    DEFAULT NULL,
  _pincode                   text    DEFAULT NULL,
  _has_subscription          boolean DEFAULT NULL,
  _registered_only           boolean DEFAULT NULL,
  _channel_required          text    DEFAULT NULL,  -- 'email' | 'phone' | 'any' | NULL
  _include_zero_order_profiles boolean DEFAULT FALSE,
  _max_rows                  int     DEFAULT 10000
) RETURNS TABLE (
  user_id  uuid,
  email    text,
  phone    text,
  name     text,
  orders   int,
  ltv      numeric,
  last_at  timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH order_aggs AS (
    SELECT
      COALESCE(o.user_id::text,
               CASE WHEN NULLIF(lower(o.customer_email), '') IS NOT NULL
                    THEN 'e:' || lower(o.customer_email)
                    WHEN NULLIF(o.customer_phone, '') IS NOT NULL
                    THEN 'p:' || o.customer_phone
               END) AS key,
      MAX(o.user_id)                                  AS user_id,
      lower(MAX(o.customer_email))                    AS email,
      MAX(o.customer_phone)                           AS phone,
      MAX(o.customer_name)                            AS name,
      MAX(COALESCE(o.shipping_address->>'city',''))    AS city,
      MAX(COALESCE(o.shipping_address->>'state',''))   AS state,
      MAX(COALESCE(o.shipping_address->>'pincode',
                   o.shipping_address->>'zip',''))     AS pincode,
      COUNT(*)::int                                    AS orders,
      SUM(COALESCE(o.total, 0))::numeric               AS ltv,
      MAX(o.created_at)                                AS last_at
    FROM public.orders o
    WHERE o.user_id IS NOT NULL
       OR NULLIF(o.customer_email, '') IS NOT NULL
       OR NULLIF(o.customer_phone, '') IS NOT NULL
    GROUP BY 1
  ),
  unioned AS (
    SELECT key, user_id, email, phone, name, city, state, pincode, orders, ltv, last_at
      FROM order_aggs
    UNION ALL
    SELECT p.id::text                   AS key,
           p.id                          AS user_id,
           lower(p.email)                AS email,
           p.phone                       AS phone,
           p.name                        AS name,
           ''::text                      AS city,
           ''::text                      AS state,
           ''::text                      AS pincode,
           0                             AS orders,
           0::numeric                    AS ltv,
           NULL::timestamptz             AS last_at
      FROM public.profiles p
     WHERE _include_zero_order_profiles
       AND NOT EXISTS (SELECT 1 FROM order_aggs oa WHERE oa.user_id = p.id)
  ),
  filtered AS (
    SELECT u.*
      FROM unioned u
     WHERE (_min_orders IS NULL OR u.orders >= _min_orders)
       AND (_min_ltv IS NULL OR u.ltv >= _min_ltv)
       AND (_registered_only IS NOT TRUE OR u.user_id IS NOT NULL)
       AND (_city IS NULL OR lower(u.city) = lower(_city))
       AND (_state IS NULL OR lower(u.state) = lower(_state))
       AND (_pincode IS NULL OR u.pincode = _pincode)
       AND (_last_order_days_ago_min IS NULL
            OR (u.last_at IS NOT NULL
                AND u.last_at <= now() - make_interval(days => _last_order_days_ago_min)))
       AND (_last_order_days_ago_max IS NULL
            OR (u.last_at IS NOT NULL
                AND u.last_at >= now() - make_interval(days => _last_order_days_ago_max)))
       AND (_has_subscription IS NOT TRUE
            OR (u.user_id IS NOT NULL
                AND EXISTS (SELECT 1 FROM public.subscriptions s
                             WHERE s.user_id = u.user_id AND s.status = 'active')))
       AND (_channel_required IS NULL
            OR (_channel_required = 'email'  AND NULLIF(u.email,'') IS NOT NULL)
            OR (_channel_required = 'phone'  AND NULLIF(u.phone,'') IS NOT NULL)
            OR (_channel_required = 'any'    AND (NULLIF(u.email,'') IS NOT NULL
                                                  OR NULLIF(u.phone,'') IS NOT NULL)))
  )
  SELECT f.user_id, f.email, f.phone, f.name, f.orders, f.ltv, f.last_at
    FROM filtered f
   ORDER BY f.last_at DESC NULLS LAST
   LIMIT GREATEST(_max_rows, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_campaign_audience(
  int, numeric, int, int, text, text, text, boolean, boolean, text, boolean, int
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_campaign_audience(
  int, numeric, int, int, text, text, text, boolean, boolean, text, boolean, int
) TO service_role;
