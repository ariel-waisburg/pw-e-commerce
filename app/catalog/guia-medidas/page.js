import Link from "next/link";
import MeasurementGuide from "@/components/catalog/MeasurementGuide";
import { buildCatalogStateHref, getCatalogStateFromSearchParams } from "@/lib/products/catalog-discovery.mjs";
import { getMeasureGuide } from "@/lib/products/sleep-intent.mjs";
import styles from "./page.module.css";

export const revalidate = 60;

export default async function CatalogMeasureGuidePage({ searchParams }) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const catalogState = getCatalogStateFromSearchParams(resolvedSearchParams);
  const backHref = buildCatalogStateHref(catalogState);

  return (
    <main className={styles.page}>
      <Link href={backHref} className={styles.backLink}>
        ← Volver al catálogo
      </Link>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Guía de medidas</p>
        <h1 className={styles.title}>Chequeá el nombre común antes de elegir la medida</h1>
        <p className={styles.description}>
          Algunas medidas se parecen en nombre, pero no son equivalentes. Esta tabla te ayuda a
          validar el tamaño exacto antes de comparar precio, cuotas y disponibilidad.
        </p>
      </section>

      <MeasurementGuide
        entries={getMeasureGuide()}
        warning={catalogState.measureWarning}
        variant="page"
      />
    </main>
  );
}

async function resolveSearchParams(searchParams) {
  if (searchParams && typeof searchParams.then === "function") {
    return (await searchParams) ?? {};
  }

  return searchParams ?? {};
}
