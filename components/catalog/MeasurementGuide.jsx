'use client';

import Link from "next/link";
import styles from "./MeasurementGuide.module.css";

function formatExactMeasure(measureCode) {
  const [width = "", length = ""] = String(measureCode ?? "").split("x");
  const normalizedWidth = Number(width);
  const normalizedLength = Number(length);

  if (!normalizedWidth || !normalizedLength) {
    return "Medida a confirmar";
  }

  return `${normalizedWidth} x ${normalizedLength} cm`;
}

export default function MeasurementGuide({
  entries,
  warning = null,
  variant = "embedded",
  fullPageHref = null,
}) {
  return (
    <section className={`${styles.guide} ${variant === "page" ? styles.guidePage : ""}`}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Nombres comunes y medidas exactas</h2>
        </div>
        <p className={styles.hint}>Atención: 160 x 190 cm no es lo mismo que Queen — 160 x 200 cm.</p>
      </div>

      {warning ? (
        <div className={styles.warning}>
          <strong>Revisá la medida.</strong>{" "}
          {warning.kind === "confusing_size"
            ? `Esa medida suele confundirse. La referencia más cercana es ${warning.suggestedMeasureCode.replace("x", " x ")} cm.`
            : "Verificá la medida exacta antes de avanzar."}
        </div>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Nombre común</th>
              <th scope="col">Medida exacta</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.measureCode}>
                <td className={styles.nameCell}>{entry.name}</td>
                <td className={styles.measureCell}>{formatExactMeasure(entry.measureCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fullPageHref ? (
        <div className={styles.footer}>
          <Link href={fullPageHref} className={styles.pageLink}>
            Ver en página completa
          </Link>
        </div>
      ) : null}
    </section>
  );
}
