// Cliente browser + SSR: env validado; PKCE no fluxo OAuth do browser.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { assertPublicSupabaseUrl } from "@/lib/env-public";

function createSupabaseClient() {
  const SUPABASE_URL = assertPublicSupabaseUrl(
    import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    "VITE_SUPABASE_URL / SUPABASE_URL",
  );
  const keyRaw =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const SUPABASE_PUBLISHABLE_KEY = keyRaw?.trim();
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_PUBLISHABLE_KEY no ambiente.",
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      flowType: "pkce",
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

