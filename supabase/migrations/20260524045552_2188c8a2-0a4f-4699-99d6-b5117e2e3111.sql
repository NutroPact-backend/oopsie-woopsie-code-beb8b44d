
-- Phase 2: counterfeit reports (bounty), public ledger view, seal photo storage
CREATE TABLE IF NOT EXISTS public.product_auth_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  auth_code_id uuid REFERENCES public.product_auth_codes(id) ON DELETE SET NULL,
  reporter_user_id uuid,
  reporter_name text,
  reporter_email text,
  reporter_phone text,
  reason text NOT NULL,
  details text,
  purchase_location text,
  photo_urls jsonb DEFAULT '[]'::jsonb,
  ai_verdict text,
  ai_confidence numeric,
  ai_notes text,
  status text NOT NULL DEFAULT 'pending',
  bounty_amount numeric DEFAULT 0,
  bounty_paid_at timestamptz,
  admin_notes text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_par_status ON public.product_auth_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_par_code ON public.product_auth_reports(code);

ALTER TABLE public.product_auth_reports ENABLE ROW LEVEL SECURITY;

-- No public read/write directly; all goes through server functions with admin client.
CREATE POLICY "deny all direct" ON public.product_auth_reports FOR ALL USING (false) WITH CHECK (false);

CREATE TRIGGER trg_par_updated_at
  BEFORE UPDATE ON public.product_auth_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Add seal photo url column to scans so customers can attach a tamper-evidence photo
ALTER TABLE public.product_auth_scans
  ADD COLUMN IF NOT EXISTS seal_photo_url text,
  ADD COLUMN IF NOT EXISTS seal_ai_verdict text,
  ADD COLUMN IF NOT EXISTS seal_ai_confidence numeric,
  ADD COLUMN IF NOT EXISTS seal_ai_notes text;

-- Public storage bucket for seal / counterfeit photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-auth-photos', 'product-auth-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read auth photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-auth-photos');

CREATE POLICY "Anyone can upload auth photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-auth-photos');
