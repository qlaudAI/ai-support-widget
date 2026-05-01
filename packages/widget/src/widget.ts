// The widget DOM + state. We keep this hand-rolled (no React, no
// preact) so the bundle stays tiny — the whole IIFE compresses
// to <5KB gzipped.

import type { InitOptions, Msg } from "./types";
import { sendMessage } from "./stream";

const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.launcher {
  position: fixed; bottom: 20px; right: 20px;
  width: 56px; height: 56px; border-radius: 28px;
  background: var(--accent); color: #fff;
  border: 0; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,.10), 0 12px 32px rgba(0,0,0,.14);
  transition: transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s ease;
  z-index: 2147483647;
}
.launcher:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 6px 16px rgba(0,0,0,.12), 0 16px 40px rgba(0,0,0,.18); }
.launcher:active { transform: scale(.96); }
.launcher svg { width: 24px; height: 24px; }
.panel {
  position: fixed; bottom: 90px; right: 20px;
  width: 380px; height: 580px; max-height: calc(100vh - 110px);
  background: #ffffff; color: #0a0a0a;
  border-radius: 18px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 4px 16px rgba(0,0,0,.06), 0 24px 64px rgba(0,0,0,.14);
  display: flex; flex-direction: column;
  overflow: hidden;
  z-index: 2147483647;
  animation: panel-in .26s cubic-bezier(.22,1,.36,1);
}
@keyframes panel-in {
  from { opacity: 0; transform: translateY(10px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.header {
  padding: 14px 16px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0,0,0,.06);
  display: flex; align-items: center; gap: 10px;
}
.header .avatar {
  width: 28px; height: 28px; border-radius: 14px;
  background: var(--accent); color: #fff;
  display: grid; place-items: center; flex-shrink: 0;
}
.header .avatar svg { width: 14px; height: 14px; }
.header .title-wrap { flex: 1; min-width: 0; }
.header .title { font-weight: 600; font-size: 14px; letter-spacing: -0.01em; line-height: 1.2; }
.header .status { font-size: 11px; color: #6b7280; line-height: 1.2; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.header .status::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 3px; background: #10b981; }
.close {
  background: transparent; border: 0; color: #6b7280;
  cursor: pointer; padding: 6px; line-height: 0;
  border-radius: 6px; transition: background .12s ease, color .12s ease;
}
.close:hover { background: rgba(0,0,0,.05); color: #111; }
.scroll {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 8px;
  background: #fafafa;
  scroll-behavior: smooth;
}
.scroll::-webkit-scrollbar { width: 6px; }
.scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 3px; }
.scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.2); }
.bubble {
  max-width: 84%;
  padding: 10px 13px; border-radius: 14px;
  font-size: 14px; line-height: 1.5;
  white-space: pre-wrap; word-wrap: break-word;
  letter-spacing: -0.005em;
  animation: bubble-in .26s cubic-bezier(.22,1,.36,1);
}
@keyframes bubble-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.bubble.user {
  align-self: flex-end;
  background: var(--accent); color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.bubble.assistant {
  align-self: flex-start;
  background: #ffffff; color: #0a0a0a;
  border: 1px solid rgba(0,0,0,.06);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,.03);
}
.typing { display: inline-flex; gap: 4px; padding: 2px 0; }
.typing span {
  width: 6px; height: 6px; border-radius: 3px;
  background: #9ca3af;
  animation: typing 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: .15s; }
.typing span:nth-child(3) { animation-delay: .3s; }
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: .4; }
  30% { transform: translateY(-3px); opacity: 1; }
}
.greeting {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 36px 20px 20px;
  color: #6b7280; font-size: 13px; line-height: 1.55;
}
.greeting .greeting-icon {
  width: 40px; height: 40px; border-radius: 20px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  display: grid; place-items: center; margin-bottom: 12px;
}
.greeting .greeting-icon svg { width: 18px; height: 18px; }
.greeting .greeting-title { color: #0a0a0a; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; margin-bottom: 4px; }
.input-row {
  display: flex; gap: 8px; padding: 12px;
  border-top: 1px solid rgba(0,0,0,.06); background: #ffffff;
}
.input-wrap {
  flex: 1; display: flex; align-items: center;
  border: 1px solid rgba(0,0,0,.10); border-radius: 12px;
  background: #fafafa;
  transition: border-color .14s ease, background .14s ease, box-shadow .14s ease;
}
.input-wrap:focus-within {
  border-color: var(--accent);
  background: #ffffff;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
}
.input-row input {
  flex: 1; border: 0; background: transparent; outline: none;
  padding: 10px 14px; font-size: 14px; color: #0a0a0a;
  letter-spacing: -0.005em;
}
.input-row input::placeholder { color: #9ca3af; }
.send {
  width: 32px; height: 32px; margin: 0 4px;
  border: 0; border-radius: 8px;
  background: var(--accent); color: #fff;
  cursor: pointer;
  display: grid; place-items: center;
  transition: transform .14s ease, opacity .14s ease;
}
.send:hover:not(:disabled) { transform: translateY(-1px); }
.send:active:not(:disabled) { transform: scale(.94); }
.send:disabled { opacity: .35; cursor: not-allowed; background: #9ca3af; }
.send svg { width: 14px; height: 14px; }
.cap-banner {
  background: #fef3c7; color: #92400e;
  padding: 10px 14px;
  border-top: 1px solid #fde68a;
  font-size: 12px; text-align: center; font-weight: 500;
}
@media (max-width: 480px) {
  .panel { right: 0; bottom: 0; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; border-left: 0; border-right: 0; border-bottom: 0; }
  .launcher { bottom: 16px; right: 16px; }
}
`;

const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICON_SPARKLE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/></svg>`;
const ICON_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

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
      <div class="avatar">${ICON_SPARKLE}</div>
      <div class="title-wrap">
        <div class="title">${escape(title)}</div>
        <div class="status">Online · typically replies instantly</div>
      </div>
      <button class="close" aria-label="Close">${ICON_CLOSE}</button>
    </div>
    <div class="scroll"></div>
    <div class="input-row">
      <div class="input-wrap">
        <input placeholder="Type a message…" />
      </div>
      <button class="send" aria-label="Send">${ICON_SEND}</button>
    </div>
  `;
  root.appendChild(panel);

  const scroll = panel.querySelector(".scroll") as HTMLDivElement;
  const input = panel.querySelector("input") as HTMLInputElement;
  const sendBtn = panel.querySelector(".send") as HTMLButtonElement;
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
      g.innerHTML = `
        <div class="greeting-icon">${ICON_SPARKLE}</div>
        <div class="greeting-title">${escape(title)}</div>
        <div>${escape(greeting)}</div>
      `;
      scroll.appendChild(g);
      return;
    }
    for (const m of messages) {
      const b = document.createElement("div");
      b.className = `bubble ${m.role}`;
      if (m.role === "assistant" && !m.text && busy) {
        b.innerHTML =
          '<span class="typing"><span></span><span></span><span></span></span>';
      } else {
        b.textContent = m.text;
      }
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
