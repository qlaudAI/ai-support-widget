// In real usage, the host page just drops a <script> tag pointing at
// the built `widget.iife.js`. For the dev demo we import directly
// from the workspace so changes hot-reload.

import { init } from "@ai-support/widget/src/index";

// Default points at the Cloudflare wrangler-dev port (8787, /chat).
// To test against the Vercel variant locally, run `pnpm dev` in
// packages/server-vercel (port 8787, /api/chat) and override
// VITE_WIDGET_SERVER accordingly.
init({
  server:
    import.meta.env.VITE_WIDGET_SERVER ?? "http://localhost:8787/chat",
  title: "Acme Support",
  greeting: "Hi! I'm the Acme bot. Ask me anything about Acme.",
  accentColor: "#dc2626",
});
