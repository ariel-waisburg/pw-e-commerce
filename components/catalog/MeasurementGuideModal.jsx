'use client';

import { useEffect, useId, useRef } from "react";
import MeasurementGuide from "@/components/catalog/MeasurementGuide";
import styles from "./CatalogExperience.module.css";

export default function MeasurementGuideModal({
  isOpen,
  onClose,
  entries,
  warning = null,
  fullPageHref = null,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.measureModalRoot}>
      <div className={styles.measureModalOverlay} onClick={onClose} />
      <div
        className={styles.measureModalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className={styles.measureModalHeader}>
          <div>
            <p className={styles.measureModalEyebrow}>Guía rápida</p>
            <h2 id={titleId} className={styles.measureModalTitle}>
              Medidas y nombres comunes
            </h2>
            <p id={descriptionId} className={styles.measureModalDescription}>
              Revisá la equivalencia antes de elegir la variante para no mezclar tamaños parecidos.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.measureModalClose}
            onClick={onClose}
            aria-label="Cerrar guía de medidas"
          >
            ×
          </button>
        </div>

        <MeasurementGuide
          entries={entries}
          warning={warning}
          variant="page"
          fullPageHref={fullPageHref}
        />
      </div>
    </div>
  );
}
