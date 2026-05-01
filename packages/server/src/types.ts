export type Env = {
  END_USER_KEYS: KVNamespace;
  QLAUD_MASTER_KEY: string;
  ALLOWED_ORIGINS: string;
  END_USER_CAP_USD: string;
  DEFAULT_MODEL: string;
  SYSTEM_PROMPT?: string;
};

export type StoredEndUser = {
  qlaudKeyId: string;
  qlaudKeySecret: string;
  threadId: string | null;
};

export type ChatRequest = {
  endUserId: string;
  threadId: string | null;
  message: string;
};
