"use server";

import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { requireCustomerSession } from "@/lib/supabase/customer-auth";

export async function createCustomerProfileAction({ fullName }) {
  const { session, error: sessionError } = await requireCustomerSession();
  if (sessionError) {
    throw sessionError;
  }

  const { error } = await getSupabaseServiceRole()
    .from("customers")
    .upsert({ id: session.user.id, full_name: fullName || null }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}
