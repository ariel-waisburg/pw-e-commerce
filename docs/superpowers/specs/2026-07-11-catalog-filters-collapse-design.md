# Barra de filtros del catálogo como collapses con checks — design

## Context

Este es el pedido #5 mencionado en `docs/superpowers/specs/2026-07-11-catalog-quick-fixes-design.md` ("Rediseño de la barra 'Compará por decisiones reales de compra'"), que en ese momento se dejó explícitamente fuera de alcance para diseñarse aparte. El usuario lo retomó ahora: "tal como calm, aplicá collapses con checks en la barra de filtros".

Se confirmaron con el usuario, vía preguntas de seguimiento:

- Multi-selección real por grupo (ej. Tecnología: Bonell + Pocket a la vez), no solo un cambio visual.
- Aplica a los 6 grupos de filtro: Medida, Presentación, Tecnología (hoy `<select>`) y Aislación de movimiento, Altura, Disponibilidad (hoy botones dentro de un único `<details>` "Más criterios de comparación").
- Formato de URL: valores separados por coma (`?technology=bonell,pocket`).
- Varios grupos pueden estar expandidos a la vez (no es un acordeón exclusivo).
- Un chip por valor tildado en "Selección actual", no un chip agrupado por filtro.
- Los grupos arrancan colapsados por defecto, salvo que ya traigan un valor activo desde la URL (en cuyo caso se abren solos).

### Hallazgos de la investigación

- `components/catalog/CatalogExperience.jsx`: `filtersSection` arma hoy 3 `SelectFilter` (Medida, Presentación, Tecnología) más un único `<details>` "Más criterios de comparación" con 3 `ChoiceGroup` (Aislación, Altura, Disponibilidad). `SelectFilter` es un `<select>` nativo de valor único; `ChoiceGroup` es una grilla de botones `aria-pressed` de valor único.
- `lib/products/catalog-discovery.mjs`: el estado del catálogo (`getCatalogStateFromSearchParams`) trata cada filtro como string único (`getSingleValue`). `serializeCatalogState` escribe un valor por key en `URLSearchParams`. Los chips activos (`buildSelectorChips`, `activeFilterChips`) asumen un valor por key.
- `lib/products/catalog.mjs`: `filterCatalogProducts` filtra con igualdad estricta (`product.technology !== normalizedFilters.technology`) para `technology`, `heightProfile`, `motionIsolation`; `applyVariantFiltersToProduct` filtra `availability` a nivel de variante, también con igualdad estricta.
- `measure`, `saleType` y `category` no forman parte de este rediseño: `measure` sigue siendo selección única (una medida = un conjunto de variantes concretas, no tiene sentido combinarlas con OR) y `saleType`/`category` viven fuera de la barra de filtros collapse (siguen como están hoy: categoryRow y el `SelectFilter` de Presentación se convierte en collapse de un solo valor, ver Alcance).
- No hay tests de UI de este componente hoy (`CatalogExperience.jsx` no tiene test file); la cobertura relevante está en `catalog-discovery.test.mjs` y `catalog.test.mjs`, que sí testean filtrado por valor único.

## Alcance

### A. Modelo de estado (`lib/products/catalog-discovery.mjs`)

- `technology`, `motionIsolation`, `heightProfile`, `availability` pasan de `string | null` a `string[]` (array vacío = sin filtro, equivalente al `null` actual).
- `measure` sigue como está (string único, no cambia).
- `getSingleValue` se complementa con un nuevo helper `getListValue(searchParams, key)` que parsea `key=a,b,c` a `["a", "b", "c"]` (trim de cada valor, descarta vacíos; `null`/ausente → `[]`).
- `serializeCatalogState` escribe esos 4 keys como `values.join(",")` cuando el array no está vacío, y omite la key si está vacío (igual criterio que hoy con `null`).
- `removeCatalogStateKey(state, key, value?)`: se extiende para aceptar un tercer argumento opcional `value`. Si se pasa `value` y el key es uno de los 4 multi-valor, remueve solo ese valor del array (`state[key].filter(v => v !== value)`); si no se pasa `value`, vacía el array completo (comportamiento actual, usado por "Limpiar todo" y por sacar un chip de un filtro de valor único).
- `clearCatalogState` inicializa los 4 keys multi-valor en `[]` en vez de `null`.
- `buildSelectorChips` no cambia (measure/firmness/sleepPosition/sleepMode/budget siguen siendo de valor único).
- `activeFilterChips` (dentro de `buildCatalogDiscoveryModel`) cambia: para los 4 keys multi-valor, genera un chip por cada valor del array (`value.map(v => buildChip(key, v, getChipLabel(key, v), "filter"))`) en vez de un chip por key. `saleType` y `category` siguen generando un chip único (valor simple).

### B. Filtrado (`lib/products/catalog.mjs`)

- `filterCatalogProducts`: los checks de `technology`, `heightProfile`, `motionIsolation` pasan de `product.x !== normalizedFilters.x` a `normalizedFilters.x.length && !normalizedFilters.x.includes(product.x)`. `normalizedFilters.x` se normaliza a array (acepta tanto `string[]` como `string | null` para no romper otros llamadores existentes — se envuelve con `Array.isArray(v) ? v : v ? [v] : []`).
- `applyVariantFiltersToProduct`: el check de `availability` a nivel de variante recibe el mismo tratamiento (`.includes()` sobre array normalizado).
- `collectCatalogFilterOptions` no cambia — ya devuelve la lista completa de opciones disponibles por filtro, independientemente de selección.

### C. UI (`components/catalog/CatalogExperience.jsx`)

- Nuevo componente `FilterCollapseGroup({ title, options, values, onChange, exclusive = false, defaultOpen = false })`:
  - Envuelve un `<details>` (abre con `open={defaultOpen || values.length > 0}` inicial vía `useState` local, ya que `<details>` no es controlado por props directamente en React — se maneja el atributo `open` inicial y se deja que el usuario lo toggee libremente después).
  - Cada opción es un `<input type="checkbox">` (o `type="radio"` si `exclusive`) con su label, dentro de `<summary>{title}</summary>` + lista de opciones.
  - `onChange(nextValues)` recibe el array actualizado (o el valor único si `exclusive`).
- Reemplaza los 3 `SelectFilter` (Medida, Presentación, Tecnología) y los 3 `ChoiceGroup` dentro del `<details>` "Más criterios de comparación" por 6 `FilterCollapseGroup`, todos al mismo nivel dentro de `filtersSection` (se elimina el `<details>` contenedor "Más criterios de comparación", cada grupo es su propio collapse independiente).
  - Medida usa `exclusive` (radio) — sigue editando `model.state.measure` como hoy.
  - Presentación (`saleType`) usa `exclusive` (radio) — sigue editando `model.state.saleType` como hoy; se mueve del "select nativo" a este mismo patrón visual por consistencia, aunque el dato siga siendo de valor único.
  - Tecnología, Aislación de movimiento, Altura, Disponibilidad usan checkboxes multi-valor, conectados a `handleFieldChange(key, nextArray)`.
- `handleFieldChange` (ya existe en `CatalogExperience.jsx`) no necesita cambios: ya hace `replaceState({ ...model.state, [key]: value })`, y ahora `value` puede ser un array para los 4 keys multi-valor.
- `SelectFilter` y `ChoiceGroup` quedan sin uso en este archivo tras el cambio — se eliminan del archivo (no se dejan "por si se usan después"; si hicieran falta se recuperan del historial de git).

### D. Chips de "Selección actual"

- Ya cubierto por el cambio en `activeFilterChips` (sección A): un chip por valor. El `onClick` de cada chip llama `removeCatalogStateKey(model.state, chip.key, chip.value)` en vez de `removeCatalogStateKey(model.state, chip.key)`, pasando el nuevo tercer argumento para sacar solo ese valor cuando el key es multi-valor (para keys de valor único, el tercer argumento se ignora y se comporta como hoy).

## Fuera de alcance

- Cambiar `measure`, `saleType` o `category` a multi-valor — quedan como selección única, solo cambia su envoltorio visual a collapse.
- Rediseño visual/CSS detallado (colores, iconos, animación de apertura) — se implementa con el mismo lenguaje visual ya existente en `CatalogExperience.module.css` (mismo `--radius`, `--color-primary`, etc.), sin introducir un sistema de diseño nuevo.
- Persistencia de qué grupos están expandidos entre navegaciones (cada carga de página vuelve al criterio por defecto: cerrado salvo valor activo).
- Tocar `PdpContextSummary` / `getPdpContextSummary` (usado en la ficha de producto, no en la barra de filtros del catálogo) — sigue asumiendo valor único porque ahí no se muestran estos 4 filtros multi-valor.

## Testing

- `lib/products/catalog-discovery.test.mjs`: casos nuevos para `getListValue`/parseo de coma, `serializeCatalogState` con arrays, `removeCatalogStateKey` con el tercer argumento `value` (saca un valor puntual vs. vacía el array), y `activeFilterChips` generando un chip por valor.
- `lib/products/catalog.test.mjs`: casos para `filterCatalogProducts` con `technology`/`heightProfile`/`motionIsolation` como array de 2+ valores (union, no intersección) y con array vacío (sin filtro), y `applyVariantFiltersToProduct` con `availability` como array.
- Verificación manual en preview: tildar 2 tecnologías y confirmar que aparecen productos de ambas; sacar un chip individual y confirmar que solo ese valor se destilda; recargar con URL que ya trae `technology=bonell,pocket` y confirmar que ese grupo aparece expandido y ambos checks tildados; confirmar que Medida y Presentación se comportan como antes (un solo valor a la vez) dentro del nuevo look de collapse.
