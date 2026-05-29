ALTER TABLE public.chat_settings
  ADD COLUMN IF NOT EXISTS confidence_threshold numeric(3,2) NOT NULL DEFAULT 0.55,
  ADD COLUMN IF NOT EXISTS escalate_on_low_confidence boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS escalate_on_no_kb boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalate_on_negative_sentiment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS escalate_keywords text[] NOT NULL DEFAULT ARRAY['refund','complaint','manager','lawsuit','legal','cheated','fraud','scam']::text[],
  ADD COLUMN IF NOT EXISTS max_failed_turns integer NOT NULL DEFAULT 3;

ALTER TABLE public.chat_settings
  ADD CONSTRAINT chat_settings_confidence_threshold_range
  CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1);