-- ============ PRODUCTS ============
INSERT INTO products (id, name, slug, category, short_description, description, price, compare_price, images, is_featured, is_best_seller, in_stock, stock_count, benefits, ratings, review_count) VALUES
('p_whey','Gold Whey Protein 1kg','gold-whey-protein','Protein','24g protein per scoop, lab-tested','Premium whey protein isolate with 24g protein, 5.5g BCAAs per serving. Cold-processed for maximum bioavailability.',2499,3499,'["https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800"]'::jsonb,true,true,true,100,'["24g Protein","5.5g BCAA","Lab Tested"]'::jsonb,4.8,234),
('p_crea','Pure Creatine Monohydrate 250g','pure-creatine','Performance','Micronized 3g per serving','Pharmaceutical-grade creatine monohydrate, micronized for instant mixing. 83 servings.',899,1299,'["https://images.unsplash.com/photo-1579722821273-0f6c1b5d0b4b?w=800"]'::jsonb,true,false,true,150,'["Micronized","Unflavored","83 Servings"]'::jsonb,4.9,412),
('p_pre','Hyper Pre-Workout 300g','hyper-pre-workout','Performance','Explosive energy & focus','Beta-alanine + caffeine + L-citrulline. Mango blast flavor.',1599,1999,'["https://images.unsplash.com/photo-1607012040999-e2ad6e5b6c69?w=800"]'::jsonb,true,true,true,80,'["300mg Caffeine","Beta-Alanine","Mango Blast"]'::jsonb,4.7,189),
('p_mass','Mass Gainer Pro 3kg','mass-gainer-pro','Gainers','1250 cal per serving','High-calorie gainer with 50g protein and complex carbs. Chocolate flavor.',2999,3999,'["https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800"]'::jsonb,true,false,true,60,'["1250 Cal","50g Protein","Complex Carbs"]'::jsonb,4.6,156),
('p_bcaa','BCAA Energy 300g','bcaa-energy','Amino Acids','7g BCAA 2:1:1 ratio','Intra-workout BCAAs with electrolytes. Watermelon flavor.',1299,1699,'["https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800"]'::jsonb,false,true,true,90,'["7g BCAA","Electrolytes","Watermelon"]'::jsonb,4.5,98),
('p_multi','Daily Multivitamin 60 tabs','daily-multivitamin','Wellness','25 essential nutrients','Complete daily multivitamin with 25 vitamins, minerals, and antioxidants.',699,999,'["https://images.unsplash.com/photo-1626516903776-4ffd1330b58a?w=800"]'::jsonb,false,false,true,200,'["25 Nutrients","60 Tablets","Vegan"]'::jsonb,4.7,267)
ON CONFLICT (id) DO NOTHING;

-- ============ HOMEPAGE CONFIG ============
INSERT INTO homepage_config (key, config) VALUES ('default', '{
  "heroEnabled": true,
  "heroSettings": {"slideSpeed": 4500, "animationStyle": "fade", "aspectRatio": "1920 / 700", "mobileFit": "cover", "showDots": true},
  "heroSlides": [
    {"enabled": true, "image": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=700&fit=crop", "btnText": "Shop Bestsellers", "btnLink": "/products", "text": {"text": "Premium Nutrition for Real Results", "desktopSize": 52, "mobileSize": 28, "weight": "900", "color": "#ffffff"}, "textX": 60, "textY": 80, "imageFit": "cover"},
    {"enabled": true, "image": "https://images.unsplash.com/photo-1583500178690-f7eb190fbe04?w=1920&h=700&fit=crop", "btnText": "Explore Protein", "btnLink": "/products?category=Protein", "text": {"text": "Lab-Tested. Athlete-Approved.", "desktopSize": 48, "mobileSize": 26, "weight": "900", "color": "#ffffff"}, "textX": 60, "textY": 80, "imageFit": "cover"}
  ],
  "goalTilesEnabled": true,
  "goalTilesTitle": "SHOP BY GOAL",
  "goalTilesSubtitle": "Find what fits your fitness journey",
  "goalTilesBgColor": "#fafafa",
  "categories": [
    {"name": "Protein", "slug": "Protein", "image": "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600", "labelBg": "#f97316"},
    {"name": "Performance", "slug": "Performance", "image": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600", "labelBg": "#10b981"},
    {"name": "Gainers", "slug": "Gainers", "image": "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=600", "labelBg": "#3b82f6"},
    {"name": "Wellness", "slug": "Wellness", "image": "https://images.unsplash.com/photo-1626516903776-4ffd1330b58a?w=600", "labelBg": "#a855f7"}
  ],
  "featuredEnabled": true,
  "featuredTitle": "BESTSELLERS",
  "featuredSubtitle": "Loved by 50,000+ athletes",
  "featuredCount": 4,
  "testimonialsEnabled": true,
  "testimonialsTitle": "What Our Customers Say",
  "testimonialsSubtitle": "Real results from real people"
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET config = EXCLUDED.config;

-- ============ SITE SETTINGS ============
INSERT INTO site_settings (key, settings) VALUES ('default', '{
  "siteName": "NUTROPACT",
  "seoTitle": "NutroPact — Premium Nutrition India",
  "headerBg": "#ffffff",
  "headerText": "#111111",
  "headerAccent": "#f97316",
  "logoPosition": "left",
  "menuPosition": "center",
  "navLinks": [
    {"label": "All Products", "href": "/products"},
    {"label": "Protein", "href": "/products?category=Protein"},
    {"label": "Performance", "href": "/products?category=Performance"},
    {"label": "Our Story", "href": "/about"},
    {"label": "Contact", "href": "/contact"}
  ],
  "announcementEnabled": true,
  "announcementText": "FREE SHIPPING on orders above ₹999 — Lab tested & 100% authentic",
  "announcementBg": "#0f172a",
  "announcementColor": "#ffffff",
  "showSearch": true,
  "showAccount": true,
  "showCart": true,
  "popups": [
    {"id": "welcome", "enabled": true, "trigger": "delay", "delay": 4000, "title": "Get 10% OFF Your First Order", "message": "Join 50,000+ athletes. Subscribe for exclusive deals and supplement tips.", "ctaText": "Claim Discount", "ctaLink": "/products"}
  ],
  "trustBadges": ["Lab Tested", "100% Authentic", "Free Shipping ₹999+", "Easy Returns"],
  "payments": {"codEnabled": true, "codLabel": "Cash on Delivery"}
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET settings = EXCLUDED.settings;

-- ============ REVIEWS ============
INSERT INTO global_reviews (id, name, rating, title, comment, verified, pinned) VALUES
('r1','Rahul S.',5,'Best whey ever','Mixes perfectly, real chocolate taste. Gained 4kg lean mass in 2 months.',true,true),
('r2','Priya M.',5,'Game changer','Pre-workout gives insane focus. No crash. Mango flavor is bomb.',true,true),
('r3','Arjun K.',5,'Authentic & lab tested','Got third-party tested. Numbers match the label. Trustworthy brand.',true,false),
('r4','Sneha P.',4,'Great multivitamin','Energy levels up, hair fall reduced after 6 weeks.',true,false),
('r5','Vikram T.',5,'Mass gainer works','Skinny guy here. Gained 7kg in 3 months. Tastes amazing.',true,false),
('r6','Anjali R.',5,'Fast delivery','Ordered Monday, got Wednesday. Packaging was premium.',true,false),
('r7','Karan D.',5,'Creatine is pure','Mixes clean, no grit. Strength up 15% in 6 weeks.',true,false),
('r8','Meera J.',4,'Good BCAAs','Helps with recovery. Watermelon flavor is refreshing.',true,false)
ON CONFLICT (id) DO NOTHING;

-- ============ FAQs ============
INSERT INTO faqs (id, question, answer, "order", enabled) VALUES
('f1','Are your products lab tested?','Yes. Every batch is third-party tested for purity, potency, and contaminants. Reports available on request.',1,true),
('f2','How long does shipping take?','3-5 business days across India. Free shipping on orders above ₹999.',2,true),
('f3','Do you offer Cash on Delivery?','Yes, COD is available on all orders. A small ₹49 fee applies on orders below ₹500.',3,true),
('f4','What is your return policy?','7-day easy returns on unopened products. Email support@nutropact.com to initiate.',4,true),
('f5','Are your products vegan?','Most of our plant-based and vitamin range is vegan. Whey protein is vegetarian.',5,true),
('f6','How do I track my order?','Use the Track Order page with your order number and email. You will also receive SMS updates.',6,true)
ON CONFLICT (id) DO NOTHING;