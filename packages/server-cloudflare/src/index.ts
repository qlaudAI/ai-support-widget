// Cloudflare Worker that backs the embedded widget.
//
// Lifecycle per end-user:
//   1. Widget calls POST /chat with { endUserId, message }.
//   2. We look up endUserId in KV. If absent, mint a new qlaud key
//      with a small per-end-user cap, then create a thread.
//   3. Stream the chat through qlaud, forwarding the SSE response
//      and any 402 (cap-hit) status straight back to the widget.
//
// Why per-end-user keys (not one shared key): each anonymous visitor
// gets their own hard cap, so a single bad actor can't burn through
// your whole budget. qlaud enforces the cap; we just set it.

import { mintEndUserKey, createThread, streamThreadMessage } from "./qlaud";
import type { Env, ChatRequest, StoredEndUser } from "./types";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true }, { headers: cors });
    }

    if (url.pathname === "/chat" && req.method === "POST") {
      return handleChat(req, env, cors);
    }

    return new Response("not found", { status: 404, headers: cors });
  },
};

async function handleChat(
  req: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response("invalid json", { status: 400, headers: cors });
  }

  if (!body.endUserId || !body.message) {
    return new Response("missing endUserId or message", {
      status: 400,
      headers: cors,
    });
  }

  // Sanity-check end-user id length so a malicious caller can't blow up KV.
  if (body.endUserId.length > 200 || body.message.length > 8000) {
    return new Response("payload too large", { status: 413, headers: cors });
  }

  const stored = await getOrCreateEndUser(env, body.endUserId);

  let threadId = body.threadId ?? stored.threadId;
  if (!threadId) {
    const thread = await createThread(stored.qlaudKeySecret, body.endUserId);
    threadId = thread.id;
    stored.threadId = threadId;
    await env.END_USER_KEYS.put(body.endUserId, JSON.stringify(stored));
  }

  const upstream = await streamThreadMessage({
    endUserKey: stored.qlaudKeySecret,
    threadId,
    model: env.DEFAULT_MODEL,
    userMessage: body.message,
    systemPrompt: env.SYSTEM_PROMPT,
  });

  const headers = new Headers(cors);
  headers.set(
    "content-type",
    upstream.headers.get("content-type") ?? "text/event-stream",
  );
  headers.set("x-thread-id", threadId);
  headers.set("cache-control", "no-cache");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

async function getOrCreateEndUser(
  env: Env,
  endUserId: string,
): Promise<StoredEndUser> {
  const existing = await env.END_USER_KEYS.get(endUserId);
  if (existing) return JSON.parse(existing) as StoredEndUser;

  const cap = parseFloat(env.END_USER_CAP_USD || "1");
  const minted = await mintEndUserKey(env.QLAUD_MASTER_KEY, endUserId, cap);
  const stored: StoredEndUser = {
    qlaudKeyId: minted.id,
    qlaudKeySecret: minted.secret,
    threadId: null,
  };
  await env.END_USER_KEYS.put(endUserId, JSON.stringify(stored));
  return stored;
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
  const allow =
    allowed.includes("*") || allowed.includes(origin) ? origin || "*" : "";
  return {
    "access-control-allow-origin": allow || "null",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-expose-headers": "x-thread-id",
    vary: "origin",
  };
}
