## Goal

Puricane / Itivedam style ka **shoppable video reel carousel** (vertical 9:16 thumbnails + view count + attached product + Add to Cart) bana — ek hi admin jagah se manage, kisi bhi page par show, ek page par multiple sections with alag-alag heading bhi possible.

Existing dashboard / homepage builder / product page kuch nahi toota — pure addition hai.

---

## What the user sees (frontend)

Ek reusable section component:

```text
┌──────────── Watch & Shop ───────────────┐   ← heading (per section)
│ subheading (optional)                    │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ →               │
│ │▶ │ │▶ │ │▶ │ │▶ │ │▶ │  horizontal     │
│ │9:│ │9:│ │9:│ │9:│ │9:│  vertical reels │
│ │16│ │16│ │16│ │16│ │16│  carousel       │
│ └──┘ └──┘ └──┘ └──┘ └──┘                 │
│  65K   80K   97K  ...      (view count)  │
│  ──────── product card ────────          │
│  Puricane Weight Loss   ₹799             │
│  [ Add to Cart ]                         │
└──────────────────────────────────────────┘
```

- Tap → fullscreen reel player (vertical, swipe up/down for next, mute toggle, attached product pinned bottom with ATC).
- Layouts supported: `reel-carousel` (default), `grid` (3-4 cols), `single-feature` (one big hero video).

---

## Admin: ONE place — new "Video Sections" tab

New top-level admin tab **Video Sections** (added to `src/pages/admin/AdminPage.tsx` tab list — kuch existing remove nahi).

Two sub-tabs inside:

**1. Video Library**
   - Upload / link videos (mp4 URL, YouTube, Instagram embed, or direct upload via existing `useSimpleUpload`)
   - Per video: title, thumbnail (auto-generated or uploaded), view count (manual or auto from analytics), attached product (search picker — reuses PlacementsView product search), CTA text/link override, tags.

**2. Sections**
   - List of named sections (e.g. "Watch & Shop", "Customer Video Reviews", "How to Use").
   - Per section config:
     - Heading + subheading
     - Layout (reel-carousel / grid / single-feature)
     - Pick videos from library (drag to reorder)
     - **Placement** (multi-select, exactly like PlacementsView pattern):
       - Homepage (with position: top / after-products / bottom / custom index)
       - All product pages / specific products
       - All category pages / specific categories
       - Custom pages (PagesTab)
       - Blog index / specific blog posts
     - Enabled toggle, schedule (start/end date — optional), device visibility (desktop/mobile/both).

**Multiple sections on same page with different headings** → just create 2 sections with overlapping placement and an order field — renderer sorts and stacks them.

---

## Data model (new table)

```text
public.video_sections
  id, heading, subheading, layout, enabled,
  placements jsonb   -- [{type:'home'|'product'|'category'|'page'|'blog', ids?:[], position:int}]
  videos jsonb       -- [{id, src, type:'mp4'|'youtube'|'instagram',
                         thumbnail, title, views, product_id?, cta?}]
  visibility jsonb   -- {desktop, mobile, startAt?, endAt?}
  sort_order int, created_at, updated_at
```

One table is enough — `videos` is denormalized JSON for simple CRUD; product attach is just an id reference to existing products. Standard `GRANT` + RLS (admin write, public read) following project's user-roles convention.

---

## Rendering glue (drop-in, non-breaking)

New component `src/components/video-sections/VideoSections.tsx`:

```tsx
<VideoSections placement="home" position="after-products" />
<VideoSections placement="product" id={product.id} />
<VideoSections placement="category" id={category.id} />
<VideoSections placement="page" id={page.id} />
```

- Fetches all sections whose `placements` match → renders in `sort_order`.
- Renders nothing if zero matches (zero visual change for pages where admin hasn't placed anything).

Drop calls into (surgical, additive only):
- `src/pages/Home.tsx` — 2-3 placement slots (top / after-products / bottom)
- `src/pages/ProductPage.tsx` — after product info, after reviews
- `src/pages/CategoryPage.tsx` — top, bottom
- `src/pages/BlogPostPage.tsx` — bottom
- Custom page renderer (`p.$slug.tsx`) — supports placements

No existing section is modified or removed.

---

## Files (new + minimal edits)

**New**
- `supabase/migrations/<ts>_video_sections.sql` — table + GRANT + RLS
- `src/pages/admin/tabs/VideoSectionsTab.tsx` — admin UI (library + sections + placements)
- `src/components/video-sections/VideoSections.tsx` — public renderer
- `src/components/video-sections/ReelCarousel.tsx` — carousel layout
- `src/components/video-sections/ReelPlayer.tsx` — fullscreen swipeable player
- `src/components/video-sections/GridLayout.tsx` + `FeatureLayout.tsx`
- `src/lib/video-sections.functions.ts` — `listSectionsForPlacement`, `getAllSections`, `upsertSection`, `deleteSection`, `incrementView`

**Edited (additive only)**
- `src/pages/admin/AdminPage.tsx` — add "Video Sections" tab entry
- `src/pages/Home.tsx`, `ProductPage.tsx`, `CategoryPage.tsx`, `BlogPostPage.tsx`, `p.$slug.tsx` — insert `<VideoSections .../>` slots

**Untouched**
- Existing dashboard, analytics, homepage builder, product reviews, all other admin tabs.
- Lovable-independence work already done — new code uses no Lovable runtime.

---

## Technical notes

- Reuses existing patterns: PlacementsView's product picker, useSimpleUpload, `createServerFn` + `requireSupabaseAuth` for admin writes, public list via server fn (no auth).
- View counts: stored as displayed number (admin-editable); optional auto-track via existing `track-event` → `site_events` (new event type `video_view`).
- View tracking ties into the analytics dashboard built last turn — "most-played video" KPI auto-available.
- Mobile-first responsive; lazy-load videos (`preload="none"`, intersection observer for autoplay-on-view of muted previews).
- No Lovable dependency anywhere in new code.

---

## Out of scope (call out)

- TikTok/Instagram OAuth import — admin manually pastes URL/uploads file.
- Live-streaming.
- AI-generated captions.

Approve → I implement end-to-end, then verify with a build check and admin walkthrough.