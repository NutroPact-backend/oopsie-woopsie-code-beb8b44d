
CREATE TABLE public.guardian_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  verifications_count integer NOT NULL DEFAULT 0,
  reports_count integer NOT NULL DEFAULT 0,
  confirmed_reports_count integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboard public read" ON public.guardian_points FOR SELECT USING (true);
CREATE POLICY "Admins manage guardian points" ON public.guardian_points FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX idx_guardian_points_points ON public.guardian_points(points DESC);
CREATE TRIGGER trg_guardian_points_updated BEFORE UPDATE ON public.guardian_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_auth_distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text,
  contact_name text,
  contact_phone text,
  contact_email text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_auth_distributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage distributors" ON public.product_auth_distributors FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_distributors_updated BEFORE UPDATE ON public.product_auth_distributors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_auth_codes
  ADD COLUMN distributor_id uuid REFERENCES public.product_auth_distributors(id) ON DELETE SET NULL;
CREATE INDEX idx_product_auth_codes_distributor ON public.product_auth_codes(distributor_id);

CREATE TABLE public.product_auth_marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  listing_url text NOT NULL,
  seller_name text,
  listed_price numeric,
  our_mrp numeric,
  discount_pct numeric,
  ai_verdict text,
  ai_confidence integer,
  ai_notes text,
  status text NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_auth_marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage marketplace listings" ON public.product_auth_marketplace_listings FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX idx_mkt_listings_status ON public.product_auth_marketplace_listings(status);
CREATE TRIGGER trg_mkt_listings_updated BEFORE UPDATE ON public.product_auth_marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_auth_legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.product_auth_reports(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.product_auth_marketplace_listings(id) ON DELETE SET NULL,
  case_type text NOT NULL DEFAULT 'cease_desist',
  subject text NOT NULL,
  recipient text,
  body_markdown text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_auth_legal_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage legal cases" ON public.product_auth_legal_cases FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_legal_cases_updated BEFORE UPDATE ON public.product_auth_legal_cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
