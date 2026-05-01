# ai-support-widget

An embeddable AI chat widget. **One `<script>` tag** adds streaming chat to any website, with per-visitor spending caps so anonymous traffic can't blow up your bill.

```html
<script
  src="https://your-host/widget.iife.js"
  data-server="https://your-server.example.com/chat"
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

| Package | What it is |
|---|---|
| `packages/widget` | The embeddable JS — Shadow DOM widget, ~5KB gzipped, no deps |
| `packages/server-cloudflare` | Cloudflare Worker backend (recommended for production — tightest cold start, cheapest free tier) |
| `packages/server-vercel` | Next.js Edge backend on Vercel — for Vercel-first stacks |
| `examples/demo-site` | Reference site with the widget embedded |

The two server variants are functionally identical — pick whichever matches the stack you already have.

## Why per-end-user keys?

Anonymous visitors can be hostile. A single bad actor on a public site can spam your bot with `"write me a 50,000-word novel"` for hours.

`ai-support-widget` mints a fresh qlaud key the first time it sees a visitor's `endUserId` (an anon UUID by default, or a logged-in user's ID if you pass one). Each key has a hard `$1` spend cap. When that visitor hits the cap, qlaud returns 402, the widget shows a polite "demo limit reached" message, and your bill stops growing.

You don't write any of that logic. qlaud enforces the cap; the widget reads the 402.

## Deploy your backend (one click)

**Cloudflare** (recommended):

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2FqlaudAI%2Fai-support-widget)

**Vercel**:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FqlaudAI%2Fai-support-widget&root-directory=packages%2Fserver-vercel&env=QLAUD_MASTER_KEY,END_USER_CAP_USD,DEFAULT_MODEL,SYSTEM_PROMPT,ALLOWED_ORIGINS&envDescription=qlaud%20master%20key%20required.&project-name=ai-support-widget-server&repository-name=ai-support-widget-server)

After deploy, set `QLAUD_MASTER_KEY` and (for Vercel) connect a KV database. See subdirectory READMEs:

- [packages/server-cloudflare/README.md](packages/server-cloudflare/README.md)
- [packages/server-vercel/README.md](packages/server-vercel/README.md)

## Local dev

```bash
git clone https://github.com/qlaudAI/ai-support-widget
cd ai-support-widget
pnpm install
```

Then in three terminals:

```bash
# 1. The widget bundle (Vite dev server, hot reload)
pnpm dev:widget

# 2a. Cloudflare backend on :8787
cd packages/server-cloudflare
cp .dev.vars.example .dev.vars  # add your QLAUD_MASTER_KEY
pnpm dev
# OR
# 2b. Vercel backend on :8787 (requires `vercel link` + `vercel env pull`)
cd packages/server-vercel
pnpm dev

# 3. The demo site (Vite, :5174)
cd examples/demo-site
pnpm dev          # talks to CF (http://localhost:8787/chat)
# or for Vercel:  VITE_WIDGET_SERVER=http://localhost:8787/api/chat pnpm dev
```

Open <http://localhost:5174>, click the chat bubble.

## Widget hosting

```bash
cd packages/widget
pnpm build
# Upload dist/widget.iife.js to your CDN / Vercel / R2 / S3 / wherever
```

Then on the host site, point `data-server` at your deployed backend's chat endpoint:

```html
<script
  src="https://your-cdn/widget.iife.js"
  data-server="https://your-worker.workers.dev/chat"
  data-title="Your Bot Name"
  defer>
</script>
```

For Vercel, the path is `/api/chat`:

```html
<script
  src="https://your-cdn/widget.iife.js"
  data-server="https://your-app.vercel.app/api/chat"
  data-title="Your Bot Name"
  defer>
</script>
```

## Customizing the bot

Set the system prompt:
- **Cloudflare**: `SYSTEM_PROMPT` in [packages/server-cloudflare/wrangler.toml](packages/server-cloudflare/wrangler.toml)
- **Vercel**: `SYSTEM_PROMPT` env var in the Vercel dashboard

Want it to actually do things (look up an order, search docs, file a ticket)? Set up tools in your qlaud workspace and the widget server already passes `tools_mode: "tenant"` — your tools just work.

Want to swap models? Change `DEFAULT_MODEL` in the same place. qlaud routes `claude-haiku-4-5`, `claude-sonnet-4-6`, `gpt-5`, etc. with a single string change.

## Architecture

```
Visitor's browser           Your backend                qlaud
─────────────────           ────────────                ─────
script loads
    │
    ▼
widget.iife.js (Shadow DOM)
    │ POST {data-server}                                    │
    │   { endUserId, threadId, message }                    │
    ├────────────────────►  KV lookup endUserId             │
    │                            │                          │
    │                            │ if missing:              │
    │                            ├─── mint qlaud key ($1) ──►
    │                            ◄────────────────── key id │
    │                            │                          │
    │                            ├─── stream message ───────►
    │                            │                          │
    │ ◄─────────── SSE stream ───┤ ◄───── SSE stream ───────┤
    │                            │                          │
    │ (or 402 if visitor's cap hit)                        │
    ▼
text streams into bubble
```

## Sister projects

- **[ai-chat-saas-starter](https://github.com/qlaudAI/ai-chat-saas-starter)** — full Next.js SaaS app with Clerk auth + Stripe billing on the same per-user-keys pattern.
- **[discord-ai-bot-template](https://github.com/qlaudAI/discord-ai-bot-template)** — same pattern, but as a Discord bot. Cloudflare or Vercel.

## License

MIT
