import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env/server";

let anonClient;
let serviceRoleClient;

export function createSupabaseServerClient() {
  if (!anonClient) {
    anonClient = createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return anonClient;
}

export function getSupabaseServiceRole() {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }

  return serviceRoleClient;
}
