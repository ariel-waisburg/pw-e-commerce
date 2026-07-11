import { getSupabaseServiceRole } from "@/lib/supabase/server";
import { CART_SELECT } from "@/lib/cart/constants";

const supabase = () => getSupabaseServiceRole();

export async function getCartByToken(token) {
  if (!token) return null;

  const { data, error } = await supabase()
    .from("carts")
    .select(CART_SELECT)
    .eq("anonymous_key", token)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function refetchCart(cartId) {
  const { data, error } = await supabase()
    .from("carts")
    .select(CART_SELECT)
    .eq("id", cartId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function recalculateCartTotals(cartId) {
  const { data: items, error } = await supabase()
    .from("cart_items")
    .select("quantity, unit_price_cents")
    .eq("cart_id", cartId);

  if (error) {
    throw new Error(error.message);
  }

  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + item.quantity * (item.unit_price_cents ?? 0),
    0
  );

  const { error: updateError } = await supabase()
    .from("carts")
    .update({
      subtotal_cents: subtotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cartId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function getCartItemCartId(itemId) {
  if (!itemId) return null;

  const { data, error } = await supabase()
    .from("cart_items")
    .select("cart_id")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.cart_id ?? null;
}
