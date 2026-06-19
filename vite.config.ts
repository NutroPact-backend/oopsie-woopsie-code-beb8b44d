import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { visualizer } from "rollup-plugin-visualizer";

// INF-004: opt-in bundle analyzer + size budget.
//   ANALYZE=1   → emit dist/bundle-stats.html (treemap) after build.
//   SIZE_BUDGET_KB=350 (default) → log warning when any JS chunk exceeds
//   this gzipped size. Non-fatal; intended as a visibility nudge so the
//   admin tabs / chart libs don't silently bloat the client bundle.
const ANALYZE = process.env.ANALYZE === "1" || process.env.ANALYZE === "true";
const SIZE_BUDGET_KB = Number(process.env.SIZE_BUDGET_KB || 350);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        wouter: path.resolve(__dirname, "src/lib/wouter-shim.tsx"),
        axios: path.resolve(__dirname, "src/lib/api.ts"),
      },
    },
    plugins: ANALYZE
      ? [
          visualizer({
            filename: "dist/bundle-stats.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : [],
    build: {
      // Warn (don't fail) when a chunk exceeds the budget. Vite's built-in
      // chunkSizeWarningLimit is in KB of the *uncompressed* chunk.
      chunkSizeWarningLimit: SIZE_BUDGET_KB * 3, // ~3× gzip ratio heuristic
    },
  },
});
