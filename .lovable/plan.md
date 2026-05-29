## 🎯 Goal

3 cheezein deliver karni hain:
1. **AI/Translation engine switch** — Lovable AI Gateway nikal ke teri di hui API key use karni h (Google Cloud Translation API recommend kar raha hu — accuracy ke liye)
2. **Full audit & wrap** — pages/products/blogs/banners/FAQs sab admin-authored content ko `useContentTBatch` se wrap karna h taki language switch pe sab translate ho
3. **Glitch fixes** — existing setup me 2 chhote issues hain (niche detail h)

---

## 🌐 Part 1 — Translation Engine (100% accuracy ke liye)

### Recommendation: **Google Cloud Translation API**

Tu bola "100% accuracy chahiye" — iske liye **dedicated translation service** chahiye, LLM nahi. Comparison:

| Engine | Indian languages accuracy | Cost (after free tier) |
|---|---|---|
| Google Cloud Translation v3 | ~92-95% (industry best) | $20 per 1M chars |
| Gemini/GPT (current) | ~80-85% | Per token |
| LibreTranslate (free) | ~75% | Free |

Google Translate **500K chars/month FREE** — tere 100 items + ~13 languages me first month free hi nikal jayega.

### Code changes
- New file `src/lib/translation-provider.server.ts` — abstraction with 2 backends:
  1. **`google`** (default if `GOOGLE_TRANSLATE_API_KEY` set) — REST API call to `translation.googleapis.com/language/translate/v2`
  2. **`ai-fallback`** — existing AI gateway (Gemini/OpenAI), used only if Google key missing
- Refactor `src/lib/content-translations.functions.ts` → `translateBatch()` calls new provider instead of inline AI
- **Lovable AI Gateway code untouched** — bas priority me Google ko top pe rakh denge. AI ko fallback rakhenge taki agar Google API key na ho to system na toote.

### Secret needed
Tu **Google Cloud Translation API key** banake dega:
- Console: https://console.cloud.google.com/ → enable "Cloud Translation API" → Credentials → Create API Key
- Restrict it to "Cloud Translation API" only (security)

Main `secrets--add_secret` se `GOOGLE_TRANSLATE_API_KEY` maangunga jab build mode me jayega.

---

## 🔍 Part 2 — Full Audit & Wrap (sabse bada chunk)

Abhi sirf 2 files me `useContentTBatch` use ho raha h. Saare ye DB-fed content **English me hi dikh raha h** language switch ke baad:

### Customer pages to wrap

| File | Admin-authored fields |
|---|---|
| `src/pages/Home.tsx` | section headings, subheadings, banner text, hero copy |
| `src/pages/ProductPage.tsx` | product name, description, badges, review titles, Q&A |
| `src/pages/ProductsPage.tsx` | product names, category names |
| `src/pages/AboutPage.tsx` | story title/subtitle, blocks, pillars |
| `src/pages/BlogPage.tsx` + `BlogPostPage.tsx` | post titles, excerpts, content |
| `src/pages/FAQPage.tsx` | question/answer pairs |
| `src/pages/TestimonialsPage.tsx` | testimonial text, author names→keep |
| `src/pages/ComboPage.tsx` | combo names, descriptions |
| `src/pages/CustomPage.tsx` | custom page title + body |
| `src/pages/ContactPage.tsx`, `ShippingPage.tsx`, `RefundPage.tsx`, `TermsPage.tsx`, `PrivacyPage.tsx`, `ReturnPage.tsx` | page title + content (admin settings) |

### Shared components
| File | Fields |
|---|---|
| `src/components/layout/Header.tsx` | nav labels (if from DB) |
| `src/components/layout/Footer.tsx` | footer links, copy |
| `src/components/layout/AnnouncementBar.tsx` | announcement text |
| `src/components/MarketplaceStrip.tsx`, `TrustBadges.tsx`, `SocialProof.tsx` | labels |
| `src/components/CategoryLinks.tsx` | category names |
| `src/components/product/OffersSection.tsx`, `UrgencyStack.tsx` | offer copy |
| `src/components/RecentlyViewed.tsx`, `AbandonedCart.tsx` | product names |

### Pattern me wrap karunga
```tsx
// Pehle (English me lock)
<h2>{section.heading}</h2>

// Baad me (auto-translate)
const ct = useContentTBatch([
  { entityType: "home_section", entityId: section.id, field: "heading", source: section.heading },
  { entityType: "home_section", entityId: section.id, field: "subheading", source: section.subheading ?? "" },
]);
<h2>{ct("home_section", section.id, "heading")}</h2>
```

### Stable `entityType` naming convention (memory me save karunga)
- `product` (name, description, short_desc)
- `blog_post` (title, excerpt, content)
- `faq_item` (question, answer)
- `page_block` (title, body) — for custom pages, about, privacy etc.
- `home_section` (heading, subheading, cta_label)
- `banner` (text)
- `category` (name)
- `nav_item` (label)
- `testimonial` (text)
- `combo` (name, description)

Jab future me admin koi naya section banaye, bas existing `entityType` me se pick karna h ya naya add karna h.

---

## 🐞 Part 3 — Existing setup glitches mile

### Glitch 1: `useAutoT` ka length cap silently fail karta h
File: `src/lib/useContentT.tsx` line ~145 — `if (text.length > 200) return;` — agar koi `<T>` me 200+ char ka string dale to chup-chap source dikha deta h, koi warning nahi. **Fix:** length cap hata ke proper UI strings ke liye chunking add karunga, ya `console.warn` lagaunga dev mode me.

### Glitch 2: `LocaleSwitcher` aur `LanguagePicker` me overlap
2 components hain language switching ke liye — `LocaleSwitcher` (hreflang region) aur `LanguagePicker` (in-app locale). Confusing. **Fix:** verify karunga koi conflict toh nahi, dono apne-apne purpose ke liye chal rahe hain — agar nahi, consolidate karunga.

### Glitch 3: Batch limit 50, lekin ProductsPage me 50+ products ho sakte
`getContentTranslations` me `max(50)` validator h. Agar ek page pe 50 products × 2 fields = 100 items hue to error throw karega. **Fix:** client side me 50 ke chunks me split karke parallel calls karunga.

---

## 🛠️ Execution Order

1. Google Translate API integration banaunga (translation-provider.server.ts + refactor)
2. Tujhse `GOOGLE_TRANSLATE_API_KEY` secret maangunga
3. Glitch fixes (3 chote fix)
4. Audit + wrap — customer pages (Home → Product → Products → Blog → others)
5. Audit + wrap — shared components (Header/Footer/Announcement/etc.)
6. Test: language switch karke verify karunga ki sab content translate ho raha h
7. Memory update: naye `entityType` convention save karunga `mem://features/i18n.md` me

---

## ❓ Confirm karne wali baatein

1. **Google Cloud Translation API** OK h? (Pehle tu bola tha "free wala try karein" — but ab "100% accuracy" bola, to Google hi best h. ₹0 first month, baad me ~₹1200 ek-baar ka translate cost, monthly updates almost free.)
2. **Agar Google nahi chahiye**, to bata kya use karu — DeepL (best for Euro langs, weak in Indian), Microsoft Translator (similar to Google), ya LibreTranslate (free but 75% accuracy).
3. **Scope confirm** — saari 24 customer pages + ~10 shared components wrap karne hain, sahi h?

Approve karte hi shuru kar deta hu.
