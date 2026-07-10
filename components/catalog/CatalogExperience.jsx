'use client';

import Link from "next/link";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import MeasurementGuideModal from "@/components/catalog/MeasurementGuideModal";
import RecommendationProductCard from "@/components/catalog/RecommendationProductCard";
import {
  FIRMNESS_OPTIONS,
  getBudgetRangeLabel,
  SLEEP_MODE_OPTIONS,
  SLEEP_POSITION_OPTIONS,
} from "@/lib/products/sleep-intent.mjs";
import {
  buildCatalogDiscoveryModel,
  buildCatalogStateHref,
  clearCatalogState,
  getZeroResultsHref,
  removeCatalogStateKey,
  serializeCatalogState,
} from "@/lib/products/catalog-discovery.mjs";
import styles from "./CatalogExperience.module.css";

const QUESTION_HELP = {
  measure:
    "La medida ordena qué variantes y precios vas a comparar. Definirla al principio evita mezclar opciones que no son equivalentes.",
  firmness:
    "Habla de la sensación al acostarte. Importa porque cambia cuánto soporte y contención percibís cada noche.",
  sleepPosition:
    "La postura cambia dónde apoyás más peso. Nos ayuda a priorizar alivio de presión o soporte según tu descanso.",
  sleepMode:
    "Dormir con otra persona cambia espacio, movimiento y estabilidad. Eso puede hacerte priorizar otro tipo de base o sensación.",
  budget:
    "Usalo como un rango real de compra. Sirve para comparar medidas y líneas que hoy sí entran en tu decisión.",
};

const QUESTION_IMPACT = {
  measure: "Filtra la medida exacta y deja precios comparables entre sí.",
  firmness: "Filtra productos por sensación general para bajar el ruido del catálogo.",
  sleepPosition: "No elimina todo: reordena primero los modelos que mejor acompañan esa postura.",
  sleepMode: "Filtra variantes por ancho útil y prioriza estabilidad si dormís acompañado.",
  budget: "Filtra variantes por precio real y deja un rango compartible en la URL.",
};

function formatBudgetDraft(value) {
  return value == null ? "" : String(value);
}

function parseBudgetDraft(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampBudgetToBounds(value, bounds) {
  if (value == null) return null;
  if (!bounds) return value;

  return Math.min(bounds.max, Math.max(bounds.min, value));
}

function QuestionMarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.75 7.625a2.25 2.25 0 1 1 3.51 1.865c-.897.61-1.26 1.03-1.26 1.76v.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="14.375" r=".875" fill="currentColor" />
    </svg>
  );
}

function QuestionHeader({
  title,
  helpText,
  impactText = null,
  helpHref = null,
  helpLabel = null,
  helpActionLabel = null,
  onHelpAction = null,
}) {
  const helpId = useId();

  return (
    <div className={styles.questionHeader}>
      <div className={styles.questionHeadingCopy}>
        <h3 className={styles.questionTitle}>{title}</h3>
        {impactText ? <p className={styles.questionImpact}>{impactText}</p> : null}
      </div>
      <details className={styles.questionHelp}>
        <summary
          className={styles.questionHelpTrigger}
          aria-label={`Más información sobre: ${title}`}
          aria-controls={helpId}
        >
          <QuestionMarkIcon />
        </summary>
        <div id={helpId} className={styles.questionHelpContent}>
          <p className={styles.questionHelpBody}>{helpText}</p>
          {helpActionLabel && onHelpAction ? (
            <button
              type="button"
              className={styles.questionHelpAction}
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onHelpAction();
              }}
            >
              {helpActionLabel}
            </button>
          ) : null}
          {helpHref && helpLabel ? (
            <a href={helpHref} className={styles.questionHelpLink}>
              {helpLabel}
            </a>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function ChoiceGroup({
  title,
  options,
  value,
  onChange,
  className = "",
  helpText = null,
  impactText = null,
  question = false,
}) {
  return (
    <div className={className}>
      {question ? (
        <QuestionHeader title={title} helpText={helpText} impactText={impactText} />
      ) : (
        <p className={styles.groupLabel}>{title}</p>
      )}
      <div className={styles.choiceGrid}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.choiceBtn} ${value === option.value ? styles.choiceBtnActive : ""}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(value === option.value ? null : option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BudgetRangeField({ minValue, maxValue, bounds, onChange, onClear }) {
  const [draftMin, setDraftMin] = useState(formatBudgetDraft(minValue));
  const [draftMax, setDraftMax] = useState(formatBudgetDraft(maxValue));

  useEffect(() => {
    setDraftMin(formatBudgetDraft(minValue));
  }, [minValue]);

  useEffect(() => {
    setDraftMax(formatBudgetDraft(maxValue));
  }, [maxValue]);

  const safeBounds = bounds?.max > bounds?.min ? bounds : { min: 0, max: 2000000 };
  const sliderMin = minValue ?? safeBounds.min;
  const sliderMax = maxValue ?? safeBounds.max;
  const sliderStep = Math.max(10000, Math.round((safeBounds.max - safeBounds.min) / 100));
  const progressStart = ((sliderMin - safeBounds.min) / (safeBounds.max - safeBounds.min)) * 100;
  const progressEnd = ((sliderMax - safeBounds.min) / (safeBounds.max - safeBounds.min)) * 100;
  const rangeLabel = getBudgetRangeLabel({ min: minValue, max: maxValue }) ?? "Sin rango definido";

  const commitRange = (nextMin, nextMax) => {
    const parsedMin = clampBudgetToBounds(nextMin, safeBounds);
    const parsedMax = clampBudgetToBounds(nextMax, safeBounds);

    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      onChange({ min: parsedMax, max: parsedMin });
      return;
    }

    onChange({ min: parsedMin, max: parsedMax });
  };

  return (
    <div className={styles.questionField}>
      <QuestionHeader
        title="5. ¿Qué rango de presupuesto querés mirar?"
        helpText={QUESTION_HELP.budget}
        impactText={QUESTION_IMPACT.budget}
      />

      <div className={styles.budgetRangeCard}>
        <div className={styles.budgetRangeHeader}>
          <div>
            <p className={styles.budgetRangeLabel}>Rango elegido</p>
            <strong className={styles.budgetRangeValue}>{rangeLabel}</strong>
          </div>
          {(minValue != null || maxValue != null) ? (
            <button type="button" className={styles.budgetClearBtn} onClick={onClear}>
              Ver todos
            </button>
          ) : null}
        </div>

        <div className={styles.budgetInputGrid}>
          <label className={styles.budgetInputGroup}>
            <span>Mínimo</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder={String(safeBounds.min)}
              value={draftMin}
              onChange={(event) => setDraftMin(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commitRange(parseBudgetDraft(draftMin), parseBudgetDraft(draftMax))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>

          <label className={styles.budgetInputGroup}>
            <span>Máximo</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder={String(safeBounds.max)}
              value={draftMax}
              onChange={(event) => setDraftMax(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commitRange(parseBudgetDraft(draftMin), parseBudgetDraft(draftMax))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
          </label>
        </div>

        <div
          className={styles.budgetSliderWrap}
          style={{
            "--budget-start": `${progressStart}%`,
            "--budget-end": `${progressEnd}%`,
          }}
        >
          <div className={styles.budgetSliderTrack} aria-hidden="true" />
          <input
            type="range"
            min={safeBounds.min}
            max={safeBounds.max}
            step={sliderStep}
            value={sliderMin}
            className={`${styles.budgetRangeInput} ${styles.budgetRangeInputMin}`}
            aria-label="Seleccionar presupuesto mínimo"
            onChange={(event) => {
              const nextMin = Number(event.target.value);
              commitRange(nextMin, maxValue != null && nextMin > maxValue ? nextMin : maxValue);
            }}
          />
          <input
            type="range"
            min={safeBounds.min}
            max={safeBounds.max}
            step={sliderStep}
            value={sliderMax}
            className={`${styles.budgetRangeInput} ${styles.budgetRangeInputMax}`}
            aria-label="Seleccionar presupuesto máximo"
            onChange={(event) => {
              const nextMax = Number(event.target.value);
              commitRange(minValue != null && nextMax < minValue ? nextMax : minValue, nextMax);
            }}
          />
        </div>

        <div className={styles.budgetRangeScale} aria-hidden="true">
          <span>{safeBounds.min.toLocaleString("es-AR")}</span>
          <span>{safeBounds.max.toLocaleString("es-AR")}</span>
        </div>
      </div>
    </div>
  );
}

function RecommendationPanel({ recommendation, hrefBuilder }) {
  return (
    <aside className={styles.recommendationSidebar}>
      <div className={styles.recommendationSidebarInner}>
        <div className={styles.recommendationHeader}>
          <div>
            <h2 className={styles.recommendationTitle}>Un punto de partida según cómo dormís</h2>
            <p className={styles.recommendationIntro}>
              Tus respuestas ordenan el catálogo y afinan esta sugerencia para arrancar con menos ruido.
            </p>
          </div>
        </div>

        {recommendation?.primaryRecommendation ? (
          <>
            <RecommendationProductCard
              product={recommendation.primaryRecommendation}
              href={hrefBuilder(recommendation.primaryRecommendation.slug)}
              whyItMatches={recommendation.whyItMatches}
            />

            {recommendation.premiumAlternative ? (
              <div className={styles.recommendationAltCard}>
                <p className={styles.recommendationMeta}>Alternativa premium</p>
                <strong>{recommendation.premiumAlternative.name}</strong>
                <Link href={hrefBuilder(recommendation.premiumAlternative.slug)} className={styles.inlineLink}>
                  Ver opción
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.recommendationEmpty}>
            <p className={styles.recommendationMeta}>Recomendación guiada</p>
            <h3>Respondé al menos una pregunta</h3>
            <p>
              Apenas marques medida, sensación, postura, compañía o presupuesto te mostramos un modelo
              concreto con precio, imagen y acceso directo al detalle.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function CatalogExperience({ products, initialSearchParams = {}, usedFallback = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMeasureGuideOpen, setIsMeasureGuideOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchParamString = searchParams.toString();
  const liveSearchParams = useMemo(
    () => (searchParamString ? Object.fromEntries(searchParams.entries()) : initialSearchParams),
    [initialSearchParams, searchParamString, searchParams]
  );
  const model = useMemo(
    () => buildCatalogDiscoveryModel(products, liveSearchParams),
    [liveSearchParams, products]
  );
  const queryString = serializeCatalogState(model.state);
  const measureGuideHref = queryString ? `/catalog/guia-medidas?${queryString}` : "/catalog/guia-medidas";

  const replaceState = (nextState) => {
    const href = buildCatalogStateHref(nextState);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const hrefBuilder = (slug) => {
    const base = `/catalog/${slug}`;
    return queryString ? `${base}?${queryString}` : base;
  };

  const submitSearch = (formElement) => {
    const formData = new FormData(formElement);
    replaceState({
      ...model.state,
      q: String(formData.get("q") ?? "").trim(),
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    submitSearch(event.currentTarget);
  };

  const handleSearchButtonClick = (event) => {
    submitSearch(event.currentTarget.closest("form"));
  };

  const handleFieldChange = (key, value) => {
    if (key === "measure") {
      replaceState({
        ...model.state,
        measure: value,
        rawMeasure: value,
        measureWarning: null,
      });
      return;
    }

    replaceState({
      ...model.state,
      [key]: value,
    });
  };

  const handleBudgetChange = ({ min, max }) => {
    replaceState({
      ...model.state,
      budgetMin: min,
      budgetMax: max,
    });
  };

  const handleCategoryChange = (nextCategory) => {
    replaceState({
      ...model.state,
      category: nextCategory,
      saleType: nextCategory ? null : model.state.saleType,
    });
  };

  const hasActiveSearch = Boolean(model.state.q);

  const resultsSection = (
    <section className={styles.resultsSection} aria-busy={isPending}>
      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.resultsCount}>
            {model.resultCount} producto{model.resultCount === 1 ? "" : "s"}
            {model.state.q ? ` para “${model.state.q}”` : ""}
          </p>
        </div>
        {isPending ? <p className={styles.resultsHint}>Actualizando resultados...</p> : null}
      </div>

      {model.visibleProducts.length ? (
        <div className={styles.grid}>
          {model.visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} href={hrefBuilder(product.slug)} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🛏️</span>
          <h3>No encontramos productos para esta combinación</h3>
          <p>
            Ajustá una respuesta o remové un filtro. El estado actual sigue guardado en la URL para
            que no pierdas el contexto.
          </p>

          {model.zeroResultsGuidance ? (
            <Link
              href={getZeroResultsHref(model.state, model.zeroResultsGuidance)}
              className={styles.emptyAction}
            >
              {model.zeroResultsGuidance.kind === "remove_filter"
                ? `Probar sin ${model.zeroResultsGuidance.filterKey}`
                : `Probar con ${model.zeroResultsGuidance.suggestedMeasureCode.replace("x", " x ")} cm`}
            </Link>
          ) : null}

          {model.relatedCategories.length ? (
            <div className={styles.relatedCategories}>
              <p className={styles.relatedLabel}>Categorías relacionadas</p>
              <div className={styles.choiceGrid}>
                {model.relatedCategories.map((category) => (
                  <Link
                    key={category.slug}
                    href={buildCatalogStateHref({
                      ...model.state,
                      category: category.slug,
                      saleType: null,
                    })}
                    className={styles.choiceBtn}
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );

  const filtersSection = (
    <section className={styles.filtersSection}>
      <div className={styles.filtersHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Compará por decisiones reales de compra</h2>
        </div>
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => replaceState(clearCatalogState(model.state))}
        >
          Limpiar todo
        </button>
      </div>

      <div className={styles.activeChipsWrap}>
        {model.activeSelectorChips.length ? (
          <div className={styles.activeChipRow}>
            <span className={styles.activeChipLabel}>Tus respuestas</span>
            {model.activeSelectorChips.map((chip) => (
              <button
                key={`${chip.kind}-${chip.key}`}
                type="button"
                className={styles.activeChip}
                onClick={() => replaceState(removeCatalogStateKey(model.state, chip.key))}
              >
                {chip.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}

        {model.activeFilterChips.length ? (
          <div className={styles.activeChipRow}>
            <span className={styles.activeChipLabel}>Filtros activos</span>
            {model.activeFilterChips.map((chip) => (
              <button
                key={`${chip.kind}-${chip.key}`}
                type="button"
                className={styles.activeChip}
                onClick={() => replaceState(removeCatalogStateKey(model.state, chip.key))}
              >
                {chip.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!model.isAccessoryMode ? (
        <div className={styles.filterGrid}>
          <ChoiceGroup
            title="Medida"
            options={model.filterOptions.measures}
            value={model.state.measure}
            onChange={(value) => handleFieldChange("measure", value)}
            className={styles.filterCard}
          />

          <ChoiceGroup
            title="Tipo"
            options={model.filterOptions.saleTypes.map((option) => ({
              value: option.value,
              label: option.value === "mattress" ? "Solo colchón" : "Colchón + base",
            }))}
            value={model.state.saleType}
            onChange={(value) => handleFieldChange("saleType", value)}
            className={styles.filterCard}
          />

          <ChoiceGroup
            title="Tecnología"
            options={model.filterOptions.technologies.map((option) => ({
              value: option.value,
              label:
                option.value === "bonell"
                  ? "Resortes tradicionales"
                  : option.value === "pocket"
                    ? "Resortes pocket"
                    : option.label,
            }))}
            value={model.state.technology}
            onChange={(value) => handleFieldChange("technology", value)}
            className={styles.filterCard}
          />

          <ChoiceGroup
            title="Aislación de movimiento"
            options={model.filterOptions.motionIsolationLevels}
            value={model.state.motionIsolation}
            onChange={(value) => handleFieldChange("motionIsolation", value)}
            className={styles.filterCard}
          />

          <ChoiceGroup
            title="Altura"
            options={model.filterOptions.heightProfiles}
            value={model.state.heightProfile}
            onChange={(value) => handleFieldChange("heightProfile", value)}
            className={styles.filterCard}
          />

          <ChoiceGroup
            title="Disponibilidad"
            options={model.filterOptions.availability}
            value={model.state.availability}
            onChange={(value) => handleFieldChange("availability", value)}
            className={styles.filterCard}
          />
        </div>
      ) : null}
    </section>
  );

  const catalogLayout = (
    <div className={styles.catalogLayout}>
      <aside className={styles.filtersSidebar}>{filtersSection}</aside>
      {resultsSection}
    </div>
  );

  return (
    <main className={styles.page}>
      <MeasurementGuideModal
        isOpen={isMeasureGuideOpen}
        onClose={() => setIsMeasureGuideOpen(false)}
        entries={model.measureGuide}
        warning={model.measureWarning}
        fullPageHref={measureGuideHref}
      />

      <section className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>Encontrá el colchón indicado según cómo dormís</h1>
        </div>

        <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
          <input
            type="search"
            name="q"
            key={model.state.q ?? ""}
            defaultValue={model.state.q ?? ""}
            placeholder="Ej.: Colchón firme 2 plazas, Queen con resortes, Almohada memory foam"
            aria-label="Buscar en lenguaje natural"
          />
          <button type="button" onClick={handleSearchButtonClick}>
            Buscar
          </button>
        </form>
        <p className={styles.searchHint}>
          Entiende medidas, nombres comunes, tecnologías y términos como “hotelero” o “para pareja”.
        </p>
      </section>

      <div className={styles.categoryRow}>
        <button
          type="button"
          className={`${styles.categoryBtn} ${!model.state.category ? styles.categoryBtnActive : ""}`}
          aria-pressed={!model.state.category}
          onClick={() => handleCategoryChange(null)}
        >
          Colchones y conjuntos
        </button>
        <button
          type="button"
          className={`${styles.categoryBtn} ${model.state.category === "almohadas" ? styles.categoryBtnActive : ""}`}
          aria-pressed={model.state.category === "almohadas"}
          onClick={() => handleCategoryChange("almohadas")}
        >
          Almohadas
        </button>
        <button
          type="button"
          className={`${styles.categoryBtn} ${model.state.category === "pillow" ? styles.categoryBtnActive : ""}`}
          aria-pressed={model.state.category === "pillow"}
          onClick={() => handleCategoryChange("pillow")}
        >
          Pillow Top
        </button>
      </div>

      {usedFallback ? (
        <div className={styles.alert}>
          <strong>Mostrando datos locales.</strong> No pudimos conectar con la base, pero esta guía
          mantiene selector, filtros y lógica de recomendación.
        </div>
      ) : null}

      {hasActiveSearch ? catalogLayout : null}

      {!model.isAccessoryMode ? (
        <section className={styles.selectorSection}>
          <div className={styles.selectorHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Cinco preguntas para orientarte rápido</h2>
            </div>
          </div>

          <div className={styles.selectorGrid}>
            <div className={styles.selectorCard}>
              <div className={styles.questionField}>
                <QuestionHeader
                  title="1. ¿Qué tamaño necesitás?"
                  helpText={QUESTION_HELP.measure}
                  impactText={QUESTION_IMPACT.measure}
                  helpActionLabel="Ver guía de medidas"
                  onHelpAction={() => setIsMeasureGuideOpen(true)}
                />
                <select
                  id="catalog-measure"
                  className={styles.selectField}
                  value={model.state.measure ?? ""}
                  onChange={(event) => handleFieldChange("measure", event.target.value || null)}
                >
                  <option value="">Elegí una medida</option>
                  {model.measureGuide.map((entry) => (
                    <option key={entry.measureCode} value={entry.measureCode}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>

              <ChoiceGroup
                title="2. ¿Preferís suave, equilibrado o firme?"
                helpText={QUESTION_HELP.firmness}
                impactText={QUESTION_IMPACT.firmness}
                options={FIRMNESS_OPTIONS}
                value={model.state.firmness}
                onChange={(value) => handleFieldChange("firmness", value)}
                className={styles.questionField}
                question
              />

              <ChoiceGroup
                title="3. ¿En qué posición dormís normalmente?"
                helpText={QUESTION_HELP.sleepPosition}
                impactText={QUESTION_IMPACT.sleepPosition}
                options={SLEEP_POSITION_OPTIONS}
                value={model.state.sleepPosition}
                onChange={(value) => handleFieldChange("sleepPosition", value)}
                className={styles.questionField}
                question
              />

              <ChoiceGroup
                title="4. ¿Dormís solo/a o con otra persona?"
                helpText={QUESTION_HELP.sleepMode}
                impactText={QUESTION_IMPACT.sleepMode}
                options={SLEEP_MODE_OPTIONS}
                value={model.state.sleepMode}
                onChange={(value) => handleFieldChange("sleepMode", value)}
                className={styles.questionField}
                question
              />

              <BudgetRangeField
                minValue={model.state.budgetMin}
                maxValue={model.state.budgetMax}
                bounds={model.budgetBounds}
                onChange={handleBudgetChange}
                onClear={() => handleBudgetChange({ min: null, max: null })}
              />
            </div>

            <RecommendationPanel recommendation={model.recommendation} hrefBuilder={hrefBuilder} />
          </div>
        </section>
      ) : (
        <div className={styles.accessoryNotice}>
          <strong>Modo accesorios.</strong> El selector guiado está pensado para colchones. Podés
          usar búsqueda y categoría para explorar almohadas o pillow tops sin mezclar decisiones de
          compra de colchón.
        </div>
      )}

      {!hasActiveSearch ? catalogLayout : null}
    </main>
  );
}
