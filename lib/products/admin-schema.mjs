import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const adminVariantSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(1, "Ingresá un SKU"),
  title: z.string().trim().min(1, "Ingresá un título de variante"),
  priceCents: z.coerce
    .number()
    .int("El precio debe ser un número entero")
    .min(0, "El precio no puede ser negativo"),
  compareAtPriceCents: z.coerce
    .number()
    .int("El precio comparado debe ser un número entero")
    .min(0, "El precio comparado no puede ser negativo")
    .optional(),
  stockQuantity: z.coerce
    .number()
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo"),
});

export const adminMediaSchema = z.object({
  id: z.string().trim().min(1).optional(),
  url: z.url("Ingresá una URL válida de imagen"),
  alt: z.string().trim().max(160, "El texto alternativo es demasiado largo").optional(),
});

export const adminProductSchema = z.object({
  name: z.string().trim().min(2, "Ingresá un nombre"),
  slug: z
    .string()
    .trim()
    .min(2, "Ingresá un slug")
    .regex(slugPattern, "El slug solo puede tener minúsculas, números y guiones"),
  skuBase: z.string().trim().min(1, "Ingresá un SKU base"),
  tagline: z.string().trim().max(160, "La bajada es demasiado larga").optional(),
  shortDescription: z.string().trim().max(500, "La descripción corta es demasiado larga").optional(),
  longDescription: z.string().trim().max(4000, "La descripción larga es demasiado larga").optional(),
  status: z.enum(["draft", "active", "archived"]),
  isFeatured: z.boolean().default(false),
  media: z.array(adminMediaSchema).min(1, "Agregá al menos una imagen"),
  variants: z.array(adminVariantSchema).min(1, "Agregá al menos una variante"),
});

export function parseAdminProductInput(input) {
  const result = adminProductSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data, error: null };
  }

  const issue = result.error.issues[0];
  return {
    success: false,
    data: null,
    error: {
      field: issue?.path?.join(".") ?? null,
      message: issue?.message ?? "No se pudo validar el producto",
    },
  };
}
