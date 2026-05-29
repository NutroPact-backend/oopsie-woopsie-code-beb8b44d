
CREATE TYPE public.product_auth_status AS ENUM ('unused','verified','flagged_duplicate','flagged_geo','flagged_tamper','blocked');

CREATE TABLE public.product_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  batch_code text NOT NULL,
  product_id text REFERENCES public.products(id) ON DELETE SET NULL,
  hidden_code_hash text NOT NULL,
  hmac_signature text NOT NULL,
  status public.product_auth_status NOT NULL DEFAULT 'unused',
  scan_count integer NOT NULL DEFAULT 0,
  first_scan_at timestamptz,
  first_scan_ip text,
  first_scan_city text,
  first_scan_region text,
  first_scan_country text,
  first_scan_fingerprint text,
  first_scan_user_agent text,
  last_scan_at timestamptz,
  geo_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  manufactured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pac_batch ON public.product_auth_codes(batch_code);
CREATE INDEX idx_pac_product ON public.product_auth_codes(product_id);
CREATE INDEX idx_pac_status ON public.product_auth_codes(status);

CREATE TRIGGER pac_set_updated_at BEFORE UPDATE ON public.product_auth_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.product_auth_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage auth codes" ON public.product_auth_codes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.product_auth_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  auth_code_id uuid REFERENCES public.product_auth_codes(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  city text,
  region text,
  country text,
  fingerprint text,
  user_agent text,
  user_id uuid,
  accepted boolean NOT NULL DEFAULT true,
  rejection_reason text,
  hidden_code_provided boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_pas_code ON public.product_auth_scans(code);
CREATE INDEX idx_pas_time ON public.product_auth_scans(scanned_at DESC);

ALTER TABLE public.product_auth_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read scans" ON public.product_auth_scans
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
