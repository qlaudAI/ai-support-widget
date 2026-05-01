export type InitOptions = {
  /** Full URL of your widget chat endpoint (the one that holds the
   *  qlaud key). For the Cloudflare variant:
   *  `https://<worker>.workers.dev/chat`. For the Vercel variant:
   *  `https://<app>.vercel.app/api/chat`. */
  server: string;
  /** Stable identifier for the end user. If omitted, a per-browser
   *  anonymous id is generated and stored in localStorage. */
  endUserId?: string;
  /** Custom greeting in the chat panel. Defaults to a generic line. */
  greeting?: string;
  /** Header title. Defaults to "Assistant". */
  title?: string;
  /** Accent color (CSS color, used for the launcher button + user
   *  bubbles). Defaults to qlaud red. */
  accentColor?: string;
};

export type Msg = {
  role: "user" | "assistant";
  text: string;
};
