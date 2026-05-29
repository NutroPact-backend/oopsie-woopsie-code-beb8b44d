-- Knowledge base
CREATE TABLE public.chat_kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  priority INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kb_active ON public.chat_kb_articles(active, priority DESC);
ALTER TABLE public.chat_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view active kb" ON public.chat_kb_articles FOR SELECT USING (active = true);
CREATE POLICY "admin kb all" ON public.chat_kb_articles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Settings (single row, id='default')
CREATE TABLE public.chat_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  brand_name TEXT NOT NULL DEFAULT 'NutroPact',
  welcome_message TEXT NOT NULL DEFAULT 'Namaste! Main NutroPact ka assistant hu. Aapki order, product ya delivery se related koi bhi help — yahi puchho.',
  system_prompt TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  api_key_secret_name TEXT NOT NULL DEFAULT 'GEMINI_API_KEY',
  quick_actions JSONB NOT NULL DEFAULT '[
    {"label":"Order kaha h?","prompt":"Mera latest order ka status kya h?"},
    {"label":"Return / refund","prompt":"Mujhe return / refund kaise file karna h?"},
    {"label":"Shipping time","prompt":"Delivery kitne din me hoti h aur charges kya h?"},
    {"label":"Product help","prompt":"Mujhe sahi protein/supplement choose karne me help chahiye"},
    {"label":"COD / payment","prompt":"COD available h? Kaunse payment options h?"}
  ]'::jsonb,
  escalation_label TEXT NOT NULL DEFAULT 'Connect with team',
  escalation_after_messages INT NOT NULL DEFAULT 4,
  enable_order_context BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.chat_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view chat settings" ON public.chat_settings FOR SELECT USING (true);
CREATE POLICY "admin chat settings" ON public.chat_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.kb_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_kb_updated BEFORE UPDATE ON public.chat_kb_articles
FOR EACH ROW EXECUTE FUNCTION public.kb_set_updated_at();
CREATE TRIGGER trg_chat_settings_updated BEFORE UPDATE ON public.chat_settings
FOR EACH ROW EXECUTE FUNCTION public.kb_set_updated_at();

-- Seed a few starter KB articles
INSERT INTO public.chat_kb_articles (title, body, tags, category, priority) VALUES
('Shipping & Delivery time', 'Hum pure India me ship karte h via Shipmozo (Delhivery, Bluedart, DTDC etc).
- Metro cities: 2-3 working days
- Other cities: 3-5 working days
- Remote pincodes: 5-7 working days
Order confirm hone ke 24 ghante me dispatch ho jata h. Tracking link SMS + email pe milta h. Free shipping ₹999+ orders pe.', ARRAY['shipping','delivery','tracking','dispatch'], 'shipping', 100),
('Returns & Refunds policy', '7-din ka return window h delivery ke baad. Conditions:
- Product sealed / unopened ho
- Original packaging me ho
- Damaged / wrong product mile to photo + video bhejo within 48 hrs
Refund 5-7 working days me original payment method me aata h. Wallet refund instant h.', ARRAY['return','refund','exchange','damaged'], 'returns', 100),
('Payment & COD', 'Payment options: UPI, Cards (Visa/Master/Rupay), Net Banking, Wallets (Paytm, PhonePe), EMI ₹3000+ pe. COD available h selected pincodes pe ₹99 extra charge ke saath, max ₹5000 order tak. Failed payment ka amount 5-7 days me refund hota h.', ARRAY['payment','cod','upi','emi'], 'payment', 100),
('Choosing the right protein', 'Beginners ke liye Whey Concentrate sahi h (cheaper, 22-26g protein/scoop). Lactose intolerance h to Whey Isolate ya Plant Protein lo. Mass gain ke liye Mass Gainer (1:3 protein:carb). Cutting/fat-loss me Isolate + low-carb. Daily dose: 1.6-2.2 g/kg bodyweight.', ARRAY['protein','whey','isolate','gainer','beginner'], 'product', 80),
('Order modification / cancellation', 'Order dispatch hone se pehle aap address ya items modify kar sakte ho. Account → Orders → "Modify" button. Dispatch ke baad sirf return possible h. Cancel karne pe paid amount 5-7 days me refund hoga, ya wallet me instant.', ARRAY['cancel','modify','address','change'], 'orders', 90);