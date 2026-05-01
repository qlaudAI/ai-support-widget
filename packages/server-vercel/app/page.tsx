// Status page so deployers have a URL to look at after deploy.
// The widget calls /api/chat — that's the only real endpoint here.

export default function StatusPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "60px auto",
        padding: "0 24px",
        lineHeight: 1.7,
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: 28, margin: 0 }}>
        ai-support-widget server — running
      </h1>
      <p style={{ color: "#666" }}>
        This is the backend for an embedded chat widget powered by{" "}
        <a href="https://qlaud.ai">qlaud</a>. The widget POSTs to{" "}
        <code>/api/chat</code>; this server mints per-end-user qlaud keys
        with a hard <code>$1</code> spend cap and forwards streaming chat.
      </p>

      <h2 style={{ marginTop: 32 }}>Setup checklist</h2>
      <ol>
        <li>
          Set <code>QLAUD_MASTER_KEY</code> in Vercel env (master scope from{" "}
          <a href="https://qlaud.ai/keys">qlaud.ai/keys</a>).
        </li>
        <li>
          Connect a Vercel KV (or Upstash) database — env vars{" "}
          (<code>KV_*</code>) auto-inject.
        </li>
        <li>
          Optional: set <code>SYSTEM_PROMPT</code>,{" "}
          <code>DEFAULT_MODEL</code>, <code>END_USER_CAP_USD</code>,{" "}
          <code>ALLOWED_ORIGINS</code> (comma-separated, default{" "}
          <code>*</code>).
        </li>
        <li>
          Embed the widget on your site:
          <pre
            style={{
              background: "#1a1a1a",
              color: "#f0f0f0",
              padding: 16,
              borderRadius: 8,
              overflowX: "auto",
              fontSize: 13,
            }}
          >{`<script
  src="https://your-cdn/widget.iife.js"
  data-server="https://this-domain/api/chat"
  data-title="Acme Support"
  defer></script>`}</pre>
        </li>
      </ol>

      <p style={{ marginTop: 32, color: "#888", fontSize: 14 }}>
        Source:{" "}
        <a href="https://github.com/qlaudAI/ai-support-widget">
          github.com/qlaudAI/ai-support-widget
        </a>
      </p>
    </main>
  );
}
