// Status page so deployers have a URL to look at after deploy.

import { CheckCircle2, Database, KeyRound, Sparkles } from "lucide-react";

export default function StatusPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "14px 32px",
          borderBottom: "1px solid rgba(0,0,0,.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,.85)",
          backdropFilter: "saturate(180%) blur(12px)",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "linear-gradient(135deg, #dc2626, #7c1212)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Sparkles size={13} />
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          ai-support-widget · server
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#10b981",
            border: "1px solid rgba(16,185,129,.25)",
            background: "rgba(16,185,129,.08)",
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: "#10b981",
            }}
          />
          Online
        </span>
      </header>

      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "64px 32px 80px",
          flex: 1,
        }}
      >
        <h1
          style={{
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            margin: "0 0 14px",
            textWrap: "balance",
          }}
        >
          Backend running. Wire up the widget.
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "#6b7280",
            margin: "0 0 40px",
            textWrap: "balance",
          }}
        >
          This Next.js app exposes <code>/api/chat</code>, mints per-end-user
          qlaud keys with a hard <code>$1</code> spend cap, and forwards
          streaming chat from{" "}
          <a href="https://qlaud.ai" style={{ color: "#dc2626" }}>
            qlaud
          </a>
          .
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <Step
            icon={<KeyRound size={16} />}
            title="Set QLAUD_MASTER_KEY"
            body="Master-scope key from qlaud.ai/keys. Add it in Project → Settings → Environment Variables."
          />
          <Step
            icon={<Database size={16} />}
            title="Connect a Vercel KV database"
            body="Storage tab → Create KV. Env vars (KV_*) auto-inject. Redeploy."
          />
          <Step
            icon={<CheckCircle2 size={16} />}
            title="Embed the widget"
            body="Drop a <script> tag on your site pointing data-server at this domain's /api/chat endpoint."
          />
        </div>

        <div
          style={{
            background: "#0a0a0a",
            color: "#f5f5f5",
            padding: "18px 20px",
            borderRadius: 12,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 13,
            lineHeight: 1.6,
            overflowX: "auto",
            boxShadow:
              "0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)",
          }}
        >
          {`<script
  src="https://your-cdn/widget.iife.js"
  data-server="https://this-domain.vercel.app/api/chat"
  data-title="Acme Support"
  defer></script>`}
        </div>

        <p
          style={{
            marginTop: 56,
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          Source ·{" "}
          <a
            href="https://github.com/qlaudAI/ai-support-widget"
            style={{ color: "#6b7280" }}
          >
            github.com/qlaudAI/ai-support-widget
          </a>
        </p>
      </section>
    </main>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        padding: "14px 16px",
        border: "1px solid rgba(0,0,0,.08)",
        borderRadius: 12,
        background: "#fafafa",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 8,
          background: "rgba(220,38,38,.10)",
          color: "#dc2626",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "-0.005em",
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.55 }}>
          {body}
        </div>
      </div>
    </div>
  );
}
