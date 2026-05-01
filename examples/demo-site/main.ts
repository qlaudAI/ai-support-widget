// In real usage, the host page just drops a <script> tag pointing at
// the built `widget.iife.js`. For the dev demo we import directly
// from the workspace so changes hot-reload.

import { init } from "@ai-support/widget/src/index";

init({
  server: import.meta.env.VITE_WIDGET_SERVER ?? "http://localhost:8787",
  title: "Acme Support",
  greeting: "Hi! I'm the Acme bot. Ask me anything about Acme.",
  accentColor: "#dc2626",
});
