// Widget chat endpoint. The widget POSTs { endUserId, threadId, message }
// here; we mint a per-end-user qlaud key on first contact, then proxy
// the streaming chat back to the widget.
//
// Edge runtime so cold starts are minimal — the widget is interactive,
// users notice 200ms of latency. All upstream and downstream APIs are
// HTTP, no Node-specific deps.

import { kv } from "@vercel/kv";
import {
  createThread,
  mintEndUserKey,
  streamThreadMessage,
} from "@/lib/qlaud";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type StoredEndUser = {
  qlaudKeyId: string;
  qlaudKeySecret: string;
  threadId: string | null;
};

type ChatRequest = {
  endUserId: string;
  threadId: string | null;
  message: string;
};

const KV_PREFIX = "widget:enduser:";

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request): Promise<Response> {
  const cors = corsHeaders(req);

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
  if (body.endUserId.length > 200 || body.message.length > 8000) {
    return new Response("payload too large", { status: 413, headers: cors });
  }

  const masterKey = process.env.QLAUD_MASTER_KEY;
  if (!masterKey) {
    return new Response("QLAUD_MASTER_KEY not set", {
      status: 500,
      headers: cors,
    });
  }

  const stored = await getOrCreateEndUser(body.endUserId, masterKey);

  let threadId = body.threadId ?? stored.threadId;
  if (!threadId) {
    const thread = await createThread(stored.qlaudKeySecret, body.endUserId);
    threadId = thread.id;
    stored.threadId = threadId;
    await kv.set(KV_PREFIX + body.endUserId, stored);
  }

  const upstream = await streamThreadMessage({
    endUserKey: stored.qlaudKeySecret,
    threadId,
    model: process.env.DEFAULT_MODEL || "claude-haiku-4-5",
    userMessage: body.message,
    systemPrompt: process.env.SYSTEM_PROMPT,
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
  endUserId: string,
  masterKey: string,
): Promise<StoredEndUser> {
  const existing = await kv.get<StoredEndUser>(KV_PREFIX + endUserId);
  if (existing) return existing;

  const cap = parseFloat(process.env.END_USER_CAP_USD || "1");
  const minted = await mintEndUserKey(masterKey, endUserId, cap);
  const stored: StoredEndUser = {
    qlaudKeyId: minted.id,
    qlaudKeySecret: minted.secret,
    threadId: null,
  };
  await kv.set(KV_PREFIX + endUserId, stored);
  return stored;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (process.env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((s) => s.trim());
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
