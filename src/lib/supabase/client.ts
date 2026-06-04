import { createBrowserClient } from "@supabase/ssr";

function requirePublicEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireSupabasePublicKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return value;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"), requireSupabasePublicKey());
}
