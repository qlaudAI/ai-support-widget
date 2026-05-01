// Thin qlaud wrapper for the widget server. Master key only ever
// lives on the server side — the widget runs in the browser and
// can't see it.

const QLAUD_BASE = "https://api.qlaud.ai";

export type MintedKey = { id: string; secret: string };
export type Thread = { id: string };

export async function mintEndUserKey(
  masterKey: string,
  endUserId: string,
  capUsd: number,
): Promise<MintedKey> {
  const res = await fetch(`${QLAUD_BASE}/v1/keys`, {
    method: "POST",
    headers: { "x-api-key": masterKey, "content-type": "application/json" },
    body: JSON.stringify({
      name: `widget_enduser_${endUserId}`,
      scope: "standard",
      max_spend_usd: capUsd,
    }),
  });
  if (!res.ok) {
    throw new Error(`qlaud /v1/keys ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as MintedKey;
}

export async function createThread(
  endUserKey: string,
  endUserId: string,
): Promise<Thread> {
  const res = await fetch(`${QLAUD_BASE}/v1/threads`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${endUserKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      end_user_id: endUserId,
      metadata: { source: "widget" },
    }),
  });
  if (!res.ok) {
    throw new Error(`qlaud /v1/threads ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as Thread;
}

export async function streamThreadMessage(opts: {
  endUserKey: string;
  threadId: string;
  model: string;
  userMessage: string;
  systemPrompt?: string;
}): Promise<Response> {
  return fetch(`${QLAUD_BASE}/v1/threads/${opts.threadId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${opts.endUserKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 1024,
      stream: true,
      system: opts.systemPrompt,
      content: [{ type: "text", text: opts.userMessage }],
    }),
  });
}
