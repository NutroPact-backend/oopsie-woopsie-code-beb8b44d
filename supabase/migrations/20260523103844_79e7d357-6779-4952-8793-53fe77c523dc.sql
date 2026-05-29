
-- 1) Single-row config
CREATE TABLE IF NOT EXISTS public.marketing_settings (
  key text PRIMARY KEY DEFAULT 'default',
  -- Search engine verification
  gsc_verification text DEFAULT '',
  bing_verification text DEFAULT '',
  pinterest_verification text DEFAULT '',
  yandex_verification text DEFAULT '',
  -- Pixels (additive to env)
  pinterest_tag_id text DEFAULT '',
  linkedin_partner_id text DEFAULT '',
  twitter_pixel_id text DEFAULT '',
  reddit_pixel_id text DEFAULT '',
  quora_pixel_id text DEFAULT '',
  -- CAPI / server-side
  fb_capi_pixel_id text DEFAULT '',
  fb_capi_access_token text DEFAULT '',
  fb_capi_test_event_code text DEFAULT '',
  ga4_measurement_id text DEFAULT '',
  ga4_api_secret text DEFAULT '',
  -- OG / Twitter defaults
  og_site_name text DEFAULT '',
  og_default_image text DEFAULT '',
  twitter_site_handle text DEFAULT '',
  twitter_card_type text DEFAULT 'summary_large_image',
  -- Hreflang (jsonb array of {lang, url})
  hreflang jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- JSON-LD overrides (Organization)
  org_legal_name text DEFAULT '',
  org_phone text DEFAULT '',
  org_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_same_as jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- A/B experiments (jsonb array of {id,name,enabled,variants})
  ab_experiments jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- robots.txt body (full text)
  robots_txt text DEFAULT '',
  -- misc
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_settings_admin_all" ON public.marketing_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "marketing_settings_public_read" ON public.marketing_settings
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.marketing_settings (key) VALUES ('default') ON CONFLICT DO NOTHING;

-- 2) UTM campaigns
CREATE TABLE IF NOT EXISTS public.utm_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  destination_url text NOT NULL,
  utm_source text NOT NULL,
  utm_medium text NOT NULL,
  utm_campaign text NOT NULL,
  utm_term text DEFAULT '',
  utm_content text DEFAULT '',
  short_code text UNIQUE,
  channel text DEFAULT 'other',
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.utm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utm_campaigns_admin_all" ON public.utm_campaigns
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS utm_campaigns_campaign_idx ON public.utm_campaigns(utm_campaign);

-- 3) Server-side conversion log
CREATE TABLE IF NOT EXISTS public.marketing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL, -- 'fb_capi' | 'ga4_mp'
  event_name text NOT NULL,
  order_number text,
  user_id uuid,
  value numeric DEFAULT 0,
  currency text DEFAULT 'INR',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_events_admin_all" ON public.marketing_events
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS marketing_events_channel_idx ON public.marketing_events(channel, created_at DESC);
