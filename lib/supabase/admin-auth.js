import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env/public";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

async function createAdminSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, where cookies are read-only.
          // The session refresh is persisted on the next Route Handler request.
        }
      },
    },
  });
}

export async function getAdminSession() {
  const supabase = await createAdminSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: adminRow } = await getSupabaseServiceRole()
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) return null;

  return { user, role: adminRow.role };
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  return { session, response: null };
}
