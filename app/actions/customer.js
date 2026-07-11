"use server";

import { getSupabaseServiceRole } from "@/lib/supabase/server";

export async function createCustomerProfileAction({ userId, fullName }) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { error } = await getSupabaseServiceRole()
    .from("customers")
    .upsert({ id: userId, full_name: fullName || null }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
}
