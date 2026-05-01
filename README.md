# ai-support-widget

An embeddable AI chat widget. **One `<script>` tag** adds streaming chat to any website, with per-visitor spending caps so anonymous traffic can't blow up your bill.

```html
<script
  src="https://your-host/widget.iife.js"
  data-server="https://your-worker.workers.dev"
  data-title="Acme Support"
  data-greeting="Hi! How can I help?"
  data-accent="#dc2626"
  defer>
</script>
```

That's it. The bundle is ~5KB gzipped, runs in a Shadow DOM (so the host site's CSS can't break it), and works on every framework (or no framework).

Built on [qlaud](https://qlaud.ai) for the LLM gateway, threads, and per-end-user billing.

---

## What's in the box

This is a 3-package monorepo:

| Package | What it is |
|---|---|
| `packages/widget` | The embeddable JS — Shadow DOM widget, ~5KB gzipped, no deps |
| `packages/server` | Cloudflare Worker that mints per-end-user qlaud keys + proxies streaming chat |
| `examples/demo-site` | Reference site with the widget embedded |

## Why per-end-user keys?

Anonymous visitors can be hostile. A single bad actor on a public site can spam your bot with `"write me a 50,000-word novel"` for hours.

`ai-support-widget` mints a fresh qlaud key the first time it sees a visitor's `endUserId` (an anon UUID by default, or a logged-in user's ID if you pass one). Each key has a hard `$1` spend cap. When that visitor hits the cap, qlaud returns 402, the widget shows a polite "demo limit reached" message, and your bill stops growing.

You don't write any of that logic. qlaud enforces the cap; the widget reads the 402.

## Quickstart

```bash
git clone https://github.com/qlaudAI/ai-support-widget
cd ai-support-widget
pnpm install
```

Then in three terminals:

```bash
# 1. The widget bundle (Vite dev server, hot reload)
pnpm dev:widget

# 2. The Worker backend (Wrangler dev server on :8787)
cd packages/server
cp .dev.vars.example .dev.vars  # add your QLAUD_MASTER_KEY
pnpm dev

# 3. The demo site (Vite, :5174)
cd examples/demo-site
pnpm dev
```

Open <http://localhost:5174>, click the chat bubble.

## Deploying

### Server (Cloudflare Worker)

```bash
cd packages/server
wrangler kv:namespace create END_USER_KEYS  # paste id into wrangler.toml
wrangler secret put QLAUD_MASTER_KEY        # paste your master key from qlaud.ai/keys
wrangler deploy
```

You'll get a URL like `https://ai-support-widget-server.<account>.workers.dev`.

### Widget (any static host)

```bash
cd packages/widget
pnpm build
# Upload dist/widget.iife.js to your CDN / S3 / R2 / Vercel / wherever
```

Then on the host site:

```html
<script
  src="https://your-cdn/widget.iife.js"
  data-server="https://ai-support-widget-server.<account>.workers.dev"
  data-title="Your Bot Name"
  defer>
</script>
```

## Customizing the bot

Edit the system prompt in [packages/server/wrangler.toml](packages/server/wrangler.toml):

```toml
SYSTEM_PROMPT = "You are an Acme support agent. Answer concisely. If unsure, say 'Let me get a human to help' and never guess at order numbers or refund policy."
```

Want it to actually do things (look up an order, search docs, file a ticket)? Set up tools in your qlaud workspace and the widget server already passes `tools_mode: "tenant"` — your tools just work.

Want to swap models? Change `DEFAULT_MODEL` in `wrangler.toml`. qlaud routes claude-haiku-4-5, claude-sonnet-4-6, gpt-5, etc. with a single string change.

## Architecture

```
Visitor's browser            Your Worker                  qlaud
─────────────────            ───────────                  ─────
script loads
    │
    ▼
widget.iife.js (Shadow DOM)
    │ POST /chat                                              │
    │   { endUserId, message }                                │
    ├──────────────────────►  KV lookup endUserId             │
    │                              │                          │
    │                              │ if missing:              │
    │                              ├─── mint qlaud key ($1) ──►
    │                              ◄────────────────── key id │
    │                              │                          │
    │                              ├─── stream message ───────►
    │                              │                          │
    │ ◄─────────── SSE stream ─────┤ ◄───── SSE stream ───────┤
    │                              │                          │
    │ (or 402 if visitor's cap hit)                          │
    ▼
text streams into bubble
```

## Sister projects

- **[ai-chat-saas-starter](https://github.com/qlaudAI/ai-chat-saas-starter)** — full Next.js SaaS app with Clerk auth + Stripe billing on the same per-user-keys pattern.
- **[discord-ai-bot-template](https://github.com/qlaudAI/discord-ai-bot-template)** — same pattern, but as a Discord bot. Cloudflare Worker, no infra.

## License

MIT
