# server-vercel

Vercel-deployable variant of the widget backend. Next.js Edge route + Vercel KV (Upstash) + qlaud per-end-user spending caps.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FqlaudAI%2Fai-support-widget&root-directory=packages%2Fserver-vercel&env=QLAUD_MASTER_KEY,END_USER_CAP_USD,DEFAULT_MODEL,SYSTEM_PROMPT,ALLOWED_ORIGINS&envDescription=Get%20your%20qlaud%20master%20key%20before%20clicking%20deploy.&project-name=ai-support-widget-server&repository-name=ai-support-widget-server)

After the deploy lands:
1. **Storage tab** → Create a Vercel KV database → Connect to project. The `KV_*` env vars get auto-injected. Redeploy.
2. Embed the widget on your site, pointing `data-server` at this deployment's `/api/chat`:
   ```html
   <script
     src="https://your-cdn/widget.iife.js"
     data-server="https://<your-app>.vercel.app/api/chat"
     data-title="Acme Support"
     defer></script>
   ```

## Local dev

```bash
cd packages/server-vercel
pnpm install
cp .env.example .env.local
# fill in QLAUD_MASTER_KEY at minimum
vercel link              # link to a Vercel project (for KV creds)
vercel env pull          # pulls KV_* vars into .env.local
pnpm dev                 # serves /api/chat on :8787
```

Then run the demo site against it:
```bash
cd ../../examples/demo-site
VITE_WIDGET_SERVER=http://localhost:8787/api/chat pnpm dev
```

## How it works

- `app/api/chat/route.ts` — Edge runtime route. Looks up the visitor's stored qlaud key in KV, mints one if missing (with a hard `$1` cap), creates a thread on first contact, then proxies the streaming chat through.
- The streaming response is forwarded byte-for-byte to the widget; the widget extracts text deltas client-side.
- `app/api/health/route.ts` — `GET /api/health` returns `{ ok: true }` for monitoring.
