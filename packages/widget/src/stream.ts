// Talks to the customer's widget server. The server holds the qlaud
// key — the widget is fully public.
//
// Wire format with the server:
//   POST {server}/chat   { endUserId, threadId, message }
//   → SSE stream from qlaud (forwarded as-is)
//   → x-thread-id header on first response
//   → 402 when end-user has hit a per-end-user cap

type SendOpts = {
  server: string;
  endUserId: string;
  threadId: string | null;
  userMessage: string;
  onDelta: (chunk: string) => void;
};

type SendResult = {
  threadId: string | null;
  capHit: boolean;
  error: string | null;
};

export async function sendMessage(opts: SendOpts): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(`${opts.server.replace(/\/+$/, "")}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endUserId: opts.endUserId,
        threadId: opts.threadId,
        message: opts.userMessage,
      }),
    });
  } catch (e) {
    return { threadId: opts.threadId, capHit: false, error: "network" };
  }

  const newThreadId = res.headers.get("x-thread-id") ?? opts.threadId;

  if (res.status === 402) {
    return { threadId: newThreadId, capHit: true, error: null };
  }
  if (!res.ok || !res.body) {
    return { threadId: newThreadId, capHit: false, error: String(res.status) };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let lastEmitted = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    // qlaud forwards Anthropic-shape SSE. Accumulate `text_delta`s.
    const matches = buf.matchAll(
      /"delta":\s*\{"type":"text_delta","text":"((?:\\.|[^"\\])*)"\}/g,
    );
    let combined = "";
    for (const m of matches) {
      combined += m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    if (combined.length > lastEmitted.length) {
      opts.onDelta(combined.slice(lastEmitted.length));
      lastEmitted = combined;
    }
  }

  return { threadId: newThreadId, capHit: false, error: null };
}
