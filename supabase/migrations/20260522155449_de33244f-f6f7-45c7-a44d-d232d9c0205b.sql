CREATE TABLE public.product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  user_id UUID,
  asker_name TEXT NOT NULL DEFAULT 'Customer',
  question TEXT NOT NULL,
  answer TEXT,
  answered_by_user_id UUID,
  answered_by_name TEXT,
  answered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pq_product ON public.product_questions(product_id, status);
CREATE INDEX idx_pq_status_created ON public.product_questions(status, created_at DESC);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view published qa" ON public.product_questions
FOR SELECT USING (status = 'published');

CREATE POLICY "insert own question" ON public.product_questions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin all qa" ON public.product_questions
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.pq_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_pq_updated BEFORE UPDATE ON public.product_questions
FOR EACH ROW EXECUTE FUNCTION public.pq_set_updated_at();