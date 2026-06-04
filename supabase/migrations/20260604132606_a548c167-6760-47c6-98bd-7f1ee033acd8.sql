
ALTER TABLE public.brands DROP COLUMN active CASCADE; ALTER TABLE public.brands RENAME COLUMN is_active TO active;
ALTER TABLE public.categories DROP COLUMN active CASCADE; ALTER TABLE public.categories RENAME COLUMN is_active TO active;
ALTER TABLE public.combo_rules DROP COLUMN active CASCADE; ALTER TABLE public.combo_rules RENAME COLUMN is_active TO active;
ALTER TABLE public.coupons DROP COLUMN active CASCADE; ALTER TABLE public.coupons RENAME COLUMN is_active TO active;
ALTER TABLE public.offers DROP COLUMN active CASCADE; ALTER TABLE public.offers RENAME COLUMN is_active TO active;
ALTER TABLE public.payment_offers DROP COLUMN active CASCADE; ALTER TABLE public.payment_offers RENAME COLUMN is_active TO active;
ALTER TABLE public.product_flavors DROP COLUMN active CASCADE; ALTER TABLE public.product_flavors RENAME COLUMN is_active TO active;
ALTER TABLE public.product_sizes DROP COLUMN active CASCADE; ALTER TABLE public.product_sizes RENAME COLUMN is_active TO active;
ALTER TABLE public.product_variants DROP COLUMN active CASCADE; ALTER TABLE public.product_variants RENAME COLUMN is_active TO active;
ALTER TABLE public.urgency_widgets DROP COLUMN active CASCADE; ALTER TABLE public.urgency_widgets RENAME COLUMN is_active TO active;

ALTER TABLE public.blog_posts DROP COLUMN published CASCADE; ALTER TABLE public.blog_posts RENAME COLUMN is_published TO published;
CREATE POLICY blog_posts_read ON public.blog_posts FOR SELECT USING (published = true OR public.is_admin(auth.uid()));

ALTER TABLE public.homepage_config DROP COLUMN key CASCADE; ALTER TABLE public.homepage_config RENAME COLUMN section_key TO key;

ALTER TABLE public.orders DROP COLUMN order_status CASCADE;

ALTER TABLE public.faqs DROP COLUMN enabled CASCADE;
