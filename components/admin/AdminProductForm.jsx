"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAdminProductInput } from "@/lib/products/admin-schema.mjs";
import styles from "./AdminProductForm.module.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "archived", label: "Archivado" },
];

function emptyVariant() {
  return { sku: "", title: "", priceCents: "", compareAtPriceCents: "", stockQuantity: "" };
}

function toFormState(product) {
  if (!product) {
    return {
      name: "",
      slug: "",
      skuBase: "",
      tagline: "",
      shortDescription: "",
      longDescription: "",
      status: "draft",
      isFeatured: false,
      variants: [emptyVariant()],
    };
  }

  return {
    name: product.name ?? "",
    slug: product.slug ?? "",
    skuBase: product.sku_base ?? "",
    tagline: product.tagline ?? "",
    shortDescription: product.short_description ?? "",
    longDescription: product.long_description ?? "",
    status: product.status ?? "draft",
    isFeatured: Boolean(product.is_featured),
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      sku: variant.sku ?? "",
      title: variant.title ?? "",
      priceCents: String(variant.price_cents ?? ""),
      compareAtPriceCents: variant.compare_at_price_cents != null ? String(variant.compare_at_price_cents) : "",
      stockQuantity: String(variant.stock_quantity ?? ""),
    })),
  };
}

function buildPayload(formState) {
  return {
    name: formState.name,
    slug: formState.slug,
    skuBase: formState.skuBase,
    tagline: formState.tagline,
    shortDescription: formState.shortDescription,
    longDescription: formState.longDescription,
    status: formState.status,
    isFeatured: formState.isFeatured,
    variants: formState.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      sku: variant.sku,
      title: variant.title,
      priceCents: variant.priceCents,
      ...(variant.compareAtPriceCents ? { compareAtPriceCents: variant.compareAtPriceCents } : {}),
      stockQuantity: variant.stockQuantity,
    })),
  };
}

export default function AdminProductForm({ product = null, productId = null }) {
  const router = useRouter();
  const [formState, setFormState] = useState(() => toFormState(product));
  const [fieldError, setFieldError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(productId);

  function updateField(name, value) {
    setFormState((current) => ({ ...current, [name]: value }));
  }

  function updateVariant(index, name, value) {
    setFormState((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [name]: value } : variant
      ),
    }));
  }

  function addVariant() {
    setFormState((current) => ({ ...current, variants: [...current.variants, emptyVariant()] }));
  }

  function removeVariant(index) {
    setFormState((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError(null);

    const payload = buildPayload(formState);
    const validation = parseAdminProductInput(payload);
    if (!validation.success) {
      setFieldError(validation.error);
      return;
    }

    setIsSaving(true);

    const endpoint = isEditing ? `/api/admin/products/${productId}` : "/api/admin/products";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const body = await response.json();

      if (!response.ok) {
        setFieldError({ field: body.field ?? null, message: body.error ?? "No se pudo guardar el producto" });
        setIsSaving(false);
        return;
      }

      router.push("/admin/productos");
      router.refresh();
    } catch {
      setFieldError({ field: null, message: "No se pudo guardar el producto" });
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEditing) return;
    if (!window.confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;

    setIsSaving(true);
    const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setFieldError({ field: null, message: body.error ?? "No se pudo eliminar el producto" });
      setIsSaving(false);
      return;
    }

    router.push("/admin/productos");
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>Nombre</span>
        <input value={formState.name} onChange={(event) => updateField("name", event.target.value)} required />
        {fieldError?.field === "name" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
      </label>

      <label className={styles.field}>
        <span>Slug</span>
        <input value={formState.slug} onChange={(event) => updateField("slug", event.target.value)} required />
        {fieldError?.field === "slug" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
      </label>

      <label className={styles.field}>
        <span>SKU base</span>
        <input value={formState.skuBase} onChange={(event) => updateField("skuBase", event.target.value)} required />
        {fieldError?.field === "skuBase" ? <em className={styles.fieldError}>{fieldError.message}</em> : null}
      </label>

      <label className={styles.field}>
        <span>Bajada</span>
        <input value={formState.tagline} onChange={(event) => updateField("tagline", event.target.value)} />
      </label>

      <label className={styles.field}>
        <span>Descripción corta</span>
        <textarea
          rows="3"
          value={formState.shortDescription}
          onChange={(event) => updateField("shortDescription", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Descripción larga</span>
        <textarea
          rows="6"
          value={formState.longDescription}
          onChange={(event) => updateField("longDescription", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Estado</span>
        <select value={formState.status} onChange={(event) => updateField("status", event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={formState.isFeatured}
          onChange={(event) => updateField("isFeatured", event.target.checked)}
        />
        <span>Destacado</span>
      </label>

      <fieldset className={styles.variants}>
        <legend>Variantes</legend>
        {fieldError?.field?.startsWith("variants") ? (
          <em className={styles.fieldError}>{fieldError.message}</em>
        ) : null}

        {formState.variants.map((variant, index) => (
          <div className={styles.variantRow} key={index}>
            <input
              placeholder="SKU"
              value={variant.sku}
              onChange={(event) => updateVariant(index, "sku", event.target.value)}
              required
            />
            <input
              placeholder="Título (ej: Queen 160x200)"
              value={variant.title}
              onChange={(event) => updateVariant(index, "title", event.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Precio (centavos)"
              value={variant.priceCents}
              onChange={(event) => updateVariant(index, "priceCents", event.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Precio comparado (opcional)"
              value={variant.compareAtPriceCents}
              onChange={(event) => updateVariant(index, "compareAtPriceCents", event.target.value)}
            />
            <input
              type="number"
              placeholder="Stock"
              value={variant.stockQuantity}
              onChange={(event) => updateVariant(index, "stockQuantity", event.target.value)}
              required
            />
            <button type="button" onClick={() => removeVariant(index)} disabled={formState.variants.length === 1}>
              Quitar
            </button>
          </div>
        ))}

        <button type="button" className={styles.addVariant} onClick={addVariant}>
          Agregar variante
        </button>
      </fieldset>

      {fieldError && !fieldError.field ? <p className={styles.formError}>{fieldError.message}</p> : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        {isEditing ? (
          <button type="button" className={styles.delete} onClick={handleDelete} disabled={isSaving}>
            Eliminar producto
          </button>
        ) : null}
      </div>
    </form>
  );
}
