// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

const configDir = path.dirname(fileURLToPath(import.meta.url));
// Monorepo: use parent `.env` if present; standalone frontend repo: `.env` next to this file.
const envDir = existsSync(path.resolve(configDir, "..", ".env"))
  ? path.resolve(configDir, "..")
  : configDir;

export default defineConfig({
  // Cloudflare Workers output is for CF deploy; Vercel uses Nitro (see TanStack hosting docs).
  cloudflare: false,
  plugins: [
    nitro({
      // Vercel defines VERCEL during `npm run build`; local builds use Node for preview.
      preset: process.env.VERCEL ? "vercel" : "node-server",
    }),
  ],
  vite: {
    envDir,
    server: {
      port: 3060,
    },
  },
});
