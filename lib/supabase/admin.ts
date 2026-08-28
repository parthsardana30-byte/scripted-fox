import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnvironment } from "@/lib/env/public";
import { serverEnvironment } from "@/lib/env/server";
import type { Database } from "@/types/database";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    serverEnvironment.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
