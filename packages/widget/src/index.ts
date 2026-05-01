// Public entry. The host site calls `AISupport.init({...})` once and
// the widget injects itself into the DOM. Everything is CSS-isolated
// inside a Shadow DOM so the host's stylesheet can't break our layout
// (and vice versa).

import { renderWidget } from "./widget";
import type { InitOptions } from "./types";

export type { InitOptions };

export function init(opts: InitOptions): void {
  if (typeof window === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => renderWidget(opts));
  } else {
    renderWidget(opts);
  }
}

// Auto-init: if the script tag has data-server attributes, boot
// without needing the host page to call init() at all.
if (typeof document !== "undefined") {
  const tag = document.currentScript as HTMLScriptElement | null;
  const server = tag?.dataset.server;
  if (server) {
    init({
      server,
      title: tag?.dataset.title,
      greeting: tag?.dataset.greeting,
      accentColor: tag?.dataset.accent,
      endUserId: tag?.dataset.endUser,
    });
  }
}
