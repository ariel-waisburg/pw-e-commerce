import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getPrimaryCategories = cache(async ({ limit = 6 } = {}) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, hero_copy, hero_image_url, sort_index")
    .order("sort_index", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Supabase categories fetch failed: ${error.message}`);
  }

  return (data ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.hero_copy,
    image: category.hero_image_url,
  }));
});
