import type { CapacitorConfig } from '@capacitor/cli';

/**
 * NutroPact native shell (Android + iOS) via Capacitor.
 *
 * Strategy: hybrid load. The native app is a thin shell that loads the
 * deployed web app (SSR-rendered) so we keep one codebase, one deploy,
 * and full SSR/SEO benefits. No static export of the SSR build is needed.
 *
 * Setup (run locally — not in Lovable sandbox):
 *   1. Set NUTROPACT_WEB_URL to your production URL (https://your-domain.com)
 *   2. bun run build              # builds the fallback web bundle
 *   3. npx cap add android        # one-time
 *   4. npx cap add ios            # one-time (macOS only)
 *   5. npx cap sync
 *   6. npx cap open android  / npx cap open ios
 *
 * To toggle "live web" vs "bundled offline" mode, comment/uncomment
 * the `server.url` line below.
 */
const WEB_URL = process.env.NUTROPACT_WEB_URL || '';

const config: CapacitorConfig = {
  appId: 'com.nutropact.app',
  appName: 'NutroPact',
  // Fallback bundled assets — used when server.url is unset or unreachable.
  webDir: 'dist',
  backgroundColor: '#ffffff',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
    ...(WEB_URL ? { url: WEB_URL } : {}),
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
