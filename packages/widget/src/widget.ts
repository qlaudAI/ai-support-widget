// The widget DOM + state. We keep this hand-rolled (no React, no
// preact) so the bundle stays tiny — the whole IIFE compresses
// to <5KB gzipped.

import type { InitOptions, Msg } from "./types";
import { sendMessage } from "./stream";

const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
.launcher {
  position: fixed; bottom: 20px; right: 20px;
  width: 56px; height: 56px; border-radius: 28px;
  background: var(--accent); color: #fff;
  border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
  transition: transform .18s ease;
  z-index: 2147483647;
}
.launcher:hover { transform: scale(1.05); }
.launcher svg { width: 26px; height: 26px; }
.panel {
  position: fixed; bottom: 90px; right: 20px;
  width: 380px; height: 560px; max-height: calc(100vh - 110px);
  background: #fff; color: #111;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0,0,0,.22);
  display: flex; flex-direction: column;
  overflow: hidden;
  z-index: 2147483647;
}
.header {
  padding: 14px 16px;
  background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 600;
}
.close {
  background: transparent; border: 0; color: #fff;
  cursor: pointer; padding: 4px; line-height: 0;
  opacity: .85;
}
.close:hover { opacity: 1; }
.scroll {
  flex: 1; overflow-y: auto; padding: 14px;
  display: flex; flex-direction: column; gap: 10px;
  background: #fafafa;
}
.bubble {
  max-width: 85%;
  padding: 9px 13px; border-radius: 14px;
  font-size: 14px; line-height: 1.45;
  white-space: pre-wrap; word-wrap: break-word;
}
.bubble.user { align-self: flex-end; background: var(--accent); color: #fff; border-bottom-right-radius: 4px; }
.bubble.assistant { align-self: flex-start; background: #fff; border: 1px solid #e5e5e5; border-bottom-left-radius: 4px; }
.greeting { color: #666; font-size: 13px; text-align: center; padding: 24px 16px; }
.input-row {
  display: flex; gap: 8px; padding: 10px;
  border-top: 1px solid #eee; background: #fff;
}
.input-row input {
  flex: 1; border: 1px solid #ddd; border-radius: 8px;
  padding: 9px 12px; font-size: 14px; outline: none;
}
.input-row input:focus { border-color: var(--accent); }
.input-row button {
  border: 0; background: var(--accent); color: #fff;
  padding: 0 14px; border-radius: 8px; font-weight: 500;
  cursor: pointer; font-size: 14px;
}
.input-row button:disabled { opacity: .5; cursor: not-allowed; }
.cap-banner {
  background: #fff7ed; color: #9a3412;
  padding: 9px 14px; border-top: 1px solid #fed7aa;
  font-size: 12px; text-align: center;
}
@media (max-width: 480px) {
  .panel { right: 0; bottom: 0; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; }
  .launcher { bottom: 16px; right: 16px; }
}
`;

const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

function getOrCreateAnonId(): string {
  const KEY = "ai-support-widget-uid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      "anon_" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function renderWidget(opts: InitOptions): void {
  const accent = opts.accentColor ?? "#dc2626";
  const endUserId = opts.endUserId ?? getOrCreateAnonId();
  const title = opts.title ?? "Assistant";
  const greeting = opts.greeting ?? "Hi 👋  How can I help?";

  const host = document.createElement("div");
  host.id = "ai-support-widget-host";
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES.replace(/var\(--accent\)/g, accent);
  root.appendChild(style);

  const launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML = ICON_CHAT;
  root.appendChild(launcher);

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="header">
      <span>${escape(title)}</span>
      <button class="close" aria-label="Close">${ICON_CLOSE}</button>
    </div>
    <div class="scroll">
      <div class="greeting">${escape(greeting)}</div>
    </div>
    <div class="input-row">
      <input placeholder="Type a message…" />
      <button>Send</button>
    </div>
  `;
  root.appendChild(panel);

  const scroll = panel.querySelector(".scroll") as HTMLDivElement;
  const input = panel.querySelector("input") as HTMLInputElement;
  const sendBtn = panel.querySelector(
    ".input-row button",
  ) as HTMLButtonElement;
  const closeBtn = panel.querySelector(".close") as HTMLButtonElement;

  let threadId: string | null = null;
  let busy = false;
  const messages: Msg[] = [];

  function setOpen(v: boolean) {
    panel.style.display = v ? "flex" : "none";
    if (v) input.focus();
  }
  launcher.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));

  function rerender() {
    scroll.innerHTML = "";
    if (messages.length === 0) {
      const g = document.createElement("div");
      g.className = "greeting";
      g.textContent = greeting;
      scroll.appendChild(g);
      return;
    }
    for (const m of messages) {
      const b = document.createElement("div");
      b.className = `bubble ${m.role}`;
      b.textContent = m.text || (m.role === "assistant" && busy ? "…" : "");
      scroll.appendChild(b);
    }
    scroll.scrollTop = scroll.scrollHeight;
  }

  function showCapBanner() {
    if (panel.querySelector(".cap-banner")) return;
    const banner = document.createElement("div");
    banner.className = "cap-banner";
    banner.textContent =
      "Demo limit reached. Refresh later or contact us directly.";
    panel.insertBefore(banner, panel.querySelector(".input-row"));
  }

  async function send() {
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    messages.push({ role: "user", text }, { role: "assistant", text: "" });
    busy = true;
    sendBtn.disabled = true;
    rerender();

    try {
      const result = await sendMessage({
        server: opts.server,
        endUserId,
        threadId,
        userMessage: text,
        onDelta: (chunk) => {
          messages[messages.length - 1].text += chunk;
          rerender();
        },
      });
      threadId = result.threadId ?? threadId;
      if (result.capHit) {
        messages[messages.length - 1] = {
          role: "assistant",
          text: "Sorry — this demo has hit its usage limit. Try again later.",
        };
        showCapBanner();
      } else if (result.error) {
        messages[messages.length - 1] = {
          role: "assistant",
          text: `Sorry, something went wrong (${result.error}).`,
        };
      }
    } finally {
      busy = false;
      sendBtn.disabled = false;
      rerender();
    }
  }

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
