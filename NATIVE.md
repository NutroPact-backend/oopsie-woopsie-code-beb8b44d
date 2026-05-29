# NutroPact — Native Builds (Android + iOS)

NutroPact runs as **web + PWA + native (Android/iOS)** from one codebase using
[Capacitor](https://capacitorjs.com). The native shell loads the deployed web
app, so SSR, SEO and one-deploy releases are preserved.

## One-time setup (on your local machine — not in Lovable)

Prereqs:
- Android: Android Studio + JDK 17
- iOS: macOS + Xcode 15+ + CocoaPods

```bash
# 1. Install deps (already in package.json)
bun install

# 2. Build the web bundle (used as offline fallback)
bun run build

# 3. Point the native shell at your live web app
export NUTROPACT_WEB_URL="https://your-domain.com"

# 4. Add platforms (one-time)
npx cap add android
npx cap add ios          # macOS only

# 5. Sync web assets + config into native projects
npx cap sync

# 6. Open in the native IDE
npx cap open android
npx cap open ios
```

## Iterating

After any web change you want reflected in offline mode:

```bash
bun run build && npx cap sync
```

When `NUTROPACT_WEB_URL` is set, the app loads live web on each launch —
no rebuild needed for content updates.

## Release checklist

- Replace `appId` (`com.nutropact.app`) in `capacitor.config.ts` if needed.
- Drop production icons / splash screens into the Android/iOS projects.
- Android: bump `versionCode` + `versionName` in `android/app/build.gradle`.
- iOS: bump build/version in Xcode → Signing & Capabilities.
- Test on a real low-end Android (2G/3G) — lite-mode is enforced but verify.

## What's already wired

- `src/lib/native.ts` — status bar, splash hide, hardware back button,
  keyboard insets, native share, haptics. All safe on web.
- `src/styles.css` — safe-area insets (notch), 16px input font to block
  iOS zoom-on-focus, touch target floor, rubber-band fix.
- `public/manifest.json` — PWA install (browsers that don't need a store).
- `public/sw-push.js` — Web Push notifications (browser only).
