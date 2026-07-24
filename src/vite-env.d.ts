/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTION_PROXY_URL?: string;
  readonly VITE_TRIFE_CONTACT_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
