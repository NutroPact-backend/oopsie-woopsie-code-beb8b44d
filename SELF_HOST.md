# Self-Hosting Guide — Lovable se Independent

Ye website 100% Lovable-independent h. Apni khud ki Supabase + apne API keys
pe chal jayegi. Ek baar setup karo, fir Lovable ki zaroorat nahi.

---

## 1. Apni Supabase project banao

1. https://supabase.com → New project
2. Project ka **Project Ref** (Settings → General) aur **DB password** note kar lo
3. Settings → API se le lo:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, secret)

---

## 2. Saari migrations apply karo (ek command)

Project me 20+ migration files h `supabase/migrations/` me — inme ye sab
include h:

- Dashboard tracking (`site_events`)
- Video sections (`video_sections`)
- Auto translation cache (`content_translations`)
- Products, orders, users, roles, RLS — sab kuch

```bash
# Supabase CLI install (ek baar)
npm i -g supabase

# Apni project se link karo
supabase login
supabase link --project-ref <TERA_PROJECT_REF>

# Saari migrations push — ek command me
supabase db push
```

Bas. Saari tables, RLS policies, functions, triggers — sab apne aap ban
jayengi. Lovable ka koi role nahi.

---

## 3. Environment variables set karo

`.env` file (ya hosting platform — Vercel/Cloudflare/Netlify — ke
environment settings) me:

```bash
# Browser-visible (publishable)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=xxxx

# Server-only
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # SECRET — kabhi client me mat dalna
SUPABASE_PROJECT_ID=xxxx
```

### Optional API keys (sab admin panel se bhi daal sakte ho)

Admin → **Site → App Secrets** tab me ye sab GUI se daal sakte ho. Code
touch karne ki zaroorat nahi:

- `GOOGLE_TRANSLATE_API_KEY` — auto-translate ke liye
- `GEMINI_API_KEY` — AI features
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — payments
- `RESEND_API_KEY` ya SMTP creds — emails
- `WHATSAPP_TOKEN` — WhatsApp messaging
- Koi bhi naya secret jo chahiye

---

## 4. Build & deploy

```bash
bun install
bun run build
# Output: .output/  → kisi bhi host pe deploy (Vercel/Cloudflare Workers/Netlify)
```

---

## 5. Android + iOS apps

`NATIVE.md` dekho. Hybrid shell approach — ek baar APK/IPA build, fir har
web update apne aap app me reflect ho jayega (live URL load karta h).

---

## Future migrations

Jab bhi me koi nayi table/column add karunga, `supabase/migrations/` me ek
naya `.sql` file aayega. Tu sirf:

```bash
git pull
supabase db push
```

chala dena — naya schema apply ho jayega. Lovable ki zaroorat zero.

---

## Dashboard verify

Migrations apply hone ke baad Admin → Dashboard tab kholo. Tujhe ye sab
dikhna chahiye (data zero se start hoga, normal h):

- Live Now strip (active visitors, top pages)
- Behaviour KPIs (views, ATC, wishlist, time on site)
- Behaviour funnel (view → ATC → checkout → purchase)
- Most viewed / most ATC products
- Recent events table with filter + CSV/Excel export

Pehli visit ke baad data flow start ho jayega — har click, search, ATC,
purchase track hoga `site_events` table me.