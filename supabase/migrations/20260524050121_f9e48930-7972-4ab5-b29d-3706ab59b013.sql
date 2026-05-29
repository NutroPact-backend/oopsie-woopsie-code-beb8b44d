-- Phase 3: registration, checkpoints, heatmap, anomaly

-- 1. Extend product_auth_codes with registration/warranty
ALTER TABLE public.product_auth_codes
  ADD COLUMN IF NOT EXISTS registered_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz,
  ADD COLUMN IF NOT EXISTS warranty_until timestamptz,
  ADD COLUMN IF NOT EXISTS scan_reward_paid boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pac_registered_user ON public.product_auth_codes(registered_user_id);

-- 2. Supply chain checkpoints
CREATE TABLE IF NOT EXISTS public.product_auth_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('manufactured','quality_check','warehoused','shipped','delivered_retailer','sold')),
  location text,
  notes text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pacp_batch ON public.product_auth_checkpoints(batch_code, occurred_at DESC);

ALTER TABLE public.product_auth_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage checkpoints" ON public.product_auth_checkpoints
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Public read of checkpoints (transparency)
CREATE POLICY "Public read checkpoints" ON public.product_auth_checkpoints
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Default scan reward setting
INSERT INTO public.site_settings(key, settings)
VALUES ('product_auth', jsonb_build_object('scanReward', 10, 'warrantyDays', 365))
ON CONFLICT (key) DO NOTHING;
