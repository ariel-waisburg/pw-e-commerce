'use client';

import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
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
  measure: "Elegir medida deja precios comparables.",
  firmness: "Usamos tu preferencia para ordenar modelos.",
  sleepPosition: "Ayuda a priorizar la sensación de descanso.",
  sleepMode: "Dormir acompañado puede cambiar la medida ideal.",
  budget: "Filtra opciones dentro de tu rango.",
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

function FilterCollapseGroup({ title, options, values, onChange, exclusive = false, defaultOpen = false }) {
  const groupId = useId();
  const selectedValues = exclusive ? (values ? [values] : []) : values ?? [];
  const isOpen = defaultOpen || selectedValues.length > 0;

  const toggleValue = (optionValue) => {
    if (exclusive) {
      onChange(values === optionValue ? null : optionValue);
      return;
    }

    const next = selectedValues.includes(optionValue)
      ? selectedValues.filter((entry) => entry !== optionValue)
      : [...selectedValues, optionValue];
    onChange(next);
  };

  return (
    <details className={styles.filterCollapseGroup} open={isOpen}>
      <summary className={styles.filterCollapseSummary}>
        {title}
        {selectedValues.length ? (
          <span className={styles.filterCollapseCount}>{selectedValues.length}</span>
        ) : null}
      </summary>
      <div className={styles.filterCollapseOptions}>
        {options.map((option) => {
          const inputId = `${groupId}-${option.value}`;
          return (
            <label key={option.value} className={styles.filterCollapseOption} htmlFor={inputId}>
              <input
                id={inputId}
                type={exclusive ? "radio" : "checkbox"}
                name={exclusive ? groupId : undefined}
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}

function BudgetRangeField({ minValue, maxValue, bounds, onChange, onClear }) {
  const minInputRef = useRef(null);
  const maxInputRef = useRef(null);

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
  const commitDraftInputs = () => {
    commitRange(
      parseBudgetDraft(minInputRef.current?.value),
      parseBudgetDraft(maxInputRef.current?.value)
    );
  };

  return (
    <div className={styles.questionField}>
      <QuestionHeader
        title="5. ¿Qué rango de presupuesto querés mirar?"
        helpText={QUESTION_HELP.budget}
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
              key={`budget-min-${minValue ?? "empty"}`}
              ref={minInputRef}
              type="text"
              inputMode="numeric"
              placeholder={String(safeBounds.min)}
              defaultValue={formatBudgetDraft(minValue)}
              onChange={(event) => {
                event.target.value = event.target.value.replace(/[^\d]/g, "");
              }}
              onBlur={commitDraftInputs}
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
              key={`budget-max-${maxValue ?? "empty"}`}
              ref={maxInputRef}
              type="text"
              inputMode="numeric"
              placeholder={String(safeBounds.max)}
              defaultValue={formatBudgetDraft(maxValue)}
              onChange={(event) => {
                event.target.value = event.target.value.replace(/[^\d]/g, "");
              }}
              onBlur={commitDraftInputs}
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
            <h2 className={styles.recommendationTitle}>Sugerencia</h2>
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
            <h3>Respondé una pregunta</h3>
            <p>Te mostramos un modelo para empezar.</p>
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

  const activeDecisionChips = [...model.activeSelectorChips, ...model.activeFilterChips];

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
          {model.visibleProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              href={hrefBuilder(product.slug)}
              imagePriority={index < 4}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">Sleep</span>
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
      <div className={styles.decisionPanelHeader}>
        <div className={styles.decisionPanelCopy}>
          <p className={styles.decisionEyebrow}>Catálogo</p>
          <h2 className={styles.sectionTitle}>Elegí y compará</h2>
        </div>
        <div className={styles.decisionPanelActions}>
          <div className={styles.resultPill} aria-live="polite">
            <strong>{model.resultCount}</strong>
            <span>resultado{model.resultCount === 1 ? "" : "s"}</span>
          </div>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => replaceState(clearCatalogState(model.state))}
          >
            Limpiar todo
          </button>
        </div>
      </div>

      <div className={styles.decisionSummary}>
        {activeDecisionChips.length ? (
          <>
            <span className={styles.activeChipLabel}>Selección actual</span>
            <div className={styles.activeChipRow}>
              {activeDecisionChips.map((chip) => (
                <button
                  key={`${chip.kind}-${chip.key}-${chip.value}`}
                  type="button"
                  className={`${styles.activeChip} ${
                    chip.kind === "selector" ? styles.activeChipGuided : ""
                  }`}
                  onClick={() => replaceState(removeCatalogStateKey(model.state, chip.key, chip.value))}
                >
                  {chip.label} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.decisionSummaryEmpty}>
            Empezá por medida o presentación.
          </p>
        )}
      </div>

      {!model.isAccessoryMode ? (
        <>
          <div className={styles.filterCollapseList}>
            <FilterCollapseGroup
              title="Medida"
              options={model.filterOptions.measures}
              values={model.state.measure}
              onChange={(value) => handleFieldChange("measure", value)}
              exclusive
            />

            <FilterCollapseGroup
              title="Presentación"
              options={model.filterOptions.saleTypes.map((option) => ({
                value: option.value,
                label: option.value === "mattress" ? "Solo colchón" : "Colchón + sommier",
              }))}
              values={model.state.saleType}
              onChange={(value) => handleFieldChange("saleType", value)}
              exclusive
            />

            <FilterCollapseGroup
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
              values={model.state.technology}
              onChange={(value) => handleFieldChange("technology", value)}
            />

            <FilterCollapseGroup
              title="Aislación de movimiento"
              options={model.filterOptions.motionIsolationLevels}
              values={model.state.motionIsolation}
              onChange={(value) => handleFieldChange("motionIsolation", value)}
            />

            <FilterCollapseGroup
              title="Altura"
              options={model.filterOptions.heightProfiles}
              values={model.state.heightProfile}
              onChange={(value) => handleFieldChange("heightProfile", value)}
            />

            <FilterCollapseGroup
              title="Disponibilidad"
              options={model.filterOptions.availability}
              values={model.state.availability}
              onChange={(value) => handleFieldChange("availability", value)}
            />
          </div>
        </>
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
          <h1 className={styles.heroTitle}>Colchones y sommiers para elegir simple</h1>
        </div>

        <form className={styles.searchBar} onSubmit={handleSearchSubmit}>
          <input
            type="search"
            name="q"
            key={model.state.q ?? ""}
            defaultValue={model.state.q ?? ""}
            placeholder="Buscá por medida, línea o tecnología"
            aria-label="Buscar en lenguaje natural"
          />
          <button type="button" onClick={handleSearchButtonClick}>
            Buscar
          </button>
        </form>
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
      </div>

      {usedFallback ? (
        <div className={styles.alert}>
          <strong>Mostrando datos locales.</strong> No pudimos conectar con la base, pero esta guía
          mantiene selector, filtros y lógica de recomendación.
        </div>
      ) : null}

      {catalogLayout}

      {!model.isAccessoryMode ? (
        <section className={styles.selectorSection}>
          <div className={styles.selectorHeader}>
            <div>
              <p className={styles.decisionEyebrow}>Guía rápida</p>
              <h2 className={styles.sectionTitle}>No sé cuál elegir</h2>
            </div>
          </div>

          <div className={styles.selectorGrid}>
            <div className={styles.selectorCard}>
              <div className={styles.questionField}>
                <QuestionHeader
                  title="1. ¿Qué tamaño necesitás?"
                  helpText={QUESTION_HELP.measure}
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
                options={FIRMNESS_OPTIONS}
                value={model.state.firmness}
                onChange={(value) => handleFieldChange("firmness", value)}
                className={styles.questionField}
                question
              />

              <ChoiceGroup
                title="3. ¿En qué posición dormís normalmente?"
                helpText={QUESTION_HELP.sleepPosition}
                options={SLEEP_POSITION_OPTIONS}
                value={model.state.sleepPosition}
                onChange={(value) => handleFieldChange("sleepPosition", value)}
                className={styles.questionField}
                question
              />

              <ChoiceGroup
                title="4. ¿Dormís solo/a o con otra persona?"
                helpText={QUESTION_HELP.sleepMode}
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
          <strong>Accesorios.</strong> Usá búsqueda y categoría para explorar sin mezclar decisiones.
        </div>
      )}
    </main>
  );
}
