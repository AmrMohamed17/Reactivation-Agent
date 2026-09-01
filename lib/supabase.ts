import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Server-side only — the service-role key bypasses
 * RLS, so this module must never be imported from a client component.
 *
 * Resolved lazily so a missing env var surfaces as a request-time error rather
 * than breaking the build.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
  }

  client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return client;
}
