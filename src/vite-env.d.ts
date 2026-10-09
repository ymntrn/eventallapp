/// <reference types="vite/client" />

/** package.json version, injected by vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Supabase project URL. With VITE_SUPABASE_ANON_KEY, data comes from Supabase (docs/backend.md). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase public anon key (safe to ship; RLS allows read only). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
