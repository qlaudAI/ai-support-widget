import { defineConfig } from "vite";
import { resolve } from "path";

// IIFE bundle = a single <script> tag works on any site, no module loader.
// We expose `window.AISupport` so the host page can call `.init({...})`.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "AISupport",
      formats: ["iife", "es"],
      fileName: (format) =>
        format === "iife" ? "widget.iife.js" : "widget.js",
    },
    minify: "terser",
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
