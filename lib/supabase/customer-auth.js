import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env/public";

async function createCustomerSessionClient() {
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

export async function getCustomerSession() {
  const supabase = await createCustomerSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return { user };
}

export async function requireCustomerSession() {
  const session = await getCustomerSession();
  if (!session) {
    return { session: null, error: new Error("Iniciá sesión para completar la compra") };
  }

  return { session, error: null };
}
