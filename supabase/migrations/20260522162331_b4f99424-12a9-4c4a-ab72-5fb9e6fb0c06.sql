
ALTER TABLE public.chat_kb_articles
  ADD COLUMN IF NOT EXISTS embedding jsonb,
  ADD COLUMN IF NOT EXISTS embedded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_kb_embedded ON public.chat_kb_articles(embedded_at) WHERE active = true;
