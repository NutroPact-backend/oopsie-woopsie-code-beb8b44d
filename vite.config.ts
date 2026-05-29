import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

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
  },
});
