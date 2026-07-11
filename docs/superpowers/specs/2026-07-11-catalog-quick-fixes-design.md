# Catalog quick fixes — design

## Context

El usuario dejó una lista de 8 pedidos de UX/producto sobre el catálogo. Se decidió con el usuario tratarlos como proyectos separados en vez de un solo diseño (ver `AskUserQuestion` en la sesión): primero un bloque de 4 pedidos "rápidos" (este documento), y después dos rediseños más grandes en specs propios:

- Fusión de colchón + sommier como un mismo producto con selector (pedido #4).
- Rediseño de la barra "Compará por decisiones reales de compra" (pedido #5).
- La pregunta sobre "Sin stock configurado" (#6) ya se respondió en la conversación: es el estado que devuelve `getStockState` en `lib/products/product-card.mjs:113` cuando `product.variants` está vacío (el producto no tiene ninguna variante cargada, no que se haya agotado).

Este documento cubre los 4 pedidos restantes:

- **#3** No usar la palabra "base" para el sommier.
- **#7** Sacar almohadas y pillow-top del sitio por ahora.
- **#8** Mostrar la imagen del producto en el carrito.
- **#1 / #2** Que ningún producto quede sin imagen ni sin precio.

### Hallazgos de la investigación

- El listado de catálogo local (`app/catalog/page.js`) usa `data/products.js` como fuente de fallback, que genera productos "core" (colchón/conjunto por línea+tecnología) más `pillowProducts` y `accessoryProducts` (pillow-top). Estos dos últimos son los únicos sin imagen — sacarlos también resuelve buena parte del pedido #1 para el catálogo actual.
- `lib/products/media.js` mapea imagen por `línea|tecnología|saleType` y ya cubre las 20 combinaciones core (coincide con los 20 archivos en `public/products`). No hay combinaciones core sin imagen hoy.
- El panel de admin (`components/admin/AdminProductForm.jsx`, `lib/products/admin-schema.mjs`, `lib/products/admin-service.js`) no tiene ningún campo de imagen. Un producto creado desde ahí puede terminar sin ninguna fila en `product_media`.
- El schema real de Supabase (`supabase/schema.sql:108,111`) define `price_cents` y `stock_quantity` como `NOT NULL` con default en `product_variants`. Estructuralmente nunca pueden quedar nulos; el riesgo real es que queden en un valor placeholder (ej. `0`) hasta que se cargue el valor real, lo cual el usuario confirmó que está bien mientras sea editable después.
- El proyecto de Supabase conectado a este entorno de trabajo no es el de producción real (`ijxdsuxwbzhvfwedgqzt`), así que no se pudo auditar la base en vivo desde acá. El usuario corrió las queries de validación manualmente contra la base real y compartió los resultados — ver sección E para el detalle y el plan de backfill.
- `CartDrawer.jsx:41` usa un emoji fijo (🛏) como placeholder de imagen en vez de la imagen real del producto.
- **Observación aparte, sin acción por ahora:** en los resultados reales aparecen 3 slugs distintos casi idénticos para "Combo Colchón y Sommier Doble Europillow..." (`combo-colchon-sommier-doble-europillow-hd`, `-hd-plus`, y uno con slug largo autogenerado). Parecen datos duplicados, pero no se tocan sin que el usuario lo confirme explícitamente.

## Decisiones confirmadas con el usuario

- Ocultar almohadas/pillow-top: además de sacarlas de catálogo, nav y filtros, la ficha de producto (`/catalog/[slug]`) devuelve `notFound()` para esas categorías. Un carrito que ya tenga uno de estos productos agregado sigue funcionando (el carrito no depende de que la ficha exista).
- Imagen en el admin: se resuelve con un campo de texto para pegar URL(s) de imagen ya alojada, no con upload de archivo a Storage (eso queda fuera de alcance, candidato a diseñarse aparte si hace falta).
- Precio y stock: está bien inventar valores razonables por ahora (placeholders), siempre que queden editables desde el admin para cuando se carguen los valores reales. No hace falta backfill ni validación especial más allá de lo que el schema ya impone.

## Alcance

### A. "Sommier" en vez de "base"

Reemplazar el texto en los lugares donde "base" nombra al producto sommier:

- `lib/products/catalog-discovery.mjs:35` (`set: "Colchón + base"`) → "Colchón + sommier".
- `lib/products/homepage.mjs:15` y `:18` → "sommier" en vez de "base".
- `components/catalog/CatalogExperience.jsx:552` → "Colchón + sommier".
- `components/catalog/CatalogExperience.jsx:33` — este texto habla de firmeza/soporte, no del sommier ("priorizar otro tipo de base o sensación"). Se reformula a "otro tipo de soporte o sensación" para sacar la palabra sin introducir un significado incorrecto.

Se dejan sin tocar los usos que no nombran al producto: `skuBase` / "SKU base" (admin), `--transition-base` (CSS), y los mensajes de error que dicen "no pudimos conectarnos a la base" (se refieren a la base de datos).

### B. Ocultar almohadas y pillow-top

- `data/products.js`: el array exportado como `fallbackProducts` deja de incluir `pillowProducts` y `accessoryProducts`. Las definiciones quedan en el archivo (sin exportarse) para poder reactivarlas más adelante sin tener que re-escribirlas.
- Se agrega un filtro de categoría a nivel de candidatos de catálogo (antes de aplicar el resto de los filtros en `catalog-discovery.mjs`) que excluye cualquier producto con `category` en `["almohadas", "pillow"]`, sin importar si viene del fallback local o de una fila real de Supabase. Esto cubre el caso de que en producción sí existan productos activos de esas categorías.
- Se sacan los links de nav a `/catalog?category=almohadas` (`components/Navbar.jsx:35` y `:193`) y los botones de categoría "Almohadas" / "Pillow" del filtro de catálogo (`components/catalog/CatalogExperience.jsx:654-667`).
- `app/catalog/[slug]/page.js`: después de resolver el producto (línea ~147), si `product.category` es `almohadas` o `pillow`, se devuelve `notFound()`.
- Este mismo filtro de candidatos es el que se reutiliza en la sección E para la regla general de "sin imagen no se muestra" — es el mismo mecanismo, solo con una condición adicional.

### C. Imagen en el carrito

- Al agregar un producto al carrito (`components/AddToCartForm.jsx`), se incluye la imagen ya calculada del producto (`getDerivedProductMedia` / el primer elemento de `product.media`) como parte de los datos que se guardan en el item del carrito (`lib/cart/serializer.js` y donde sea que `context/CartContext.jsx` persista el item).
- `components/CartDrawer.jsx:40-42`: se reemplaza el `<div className={styles.itemImagePlaceholder}>🛏</div>` fijo por un `<img>` con la imagen del item; si el item no tiene imagen guardada (ej. productos ya en el carrito de antes de este cambio, o productos sin media), se mantiene el emoji como fallback visual.

### D. Ninguna imagen ni precio faltante

1. `lib/products/admin-schema.mjs`: se agrega un campo `media` al `adminProductSchema` — un array de `{ url, alt? }` con `.min(1, "Agregá al menos una imagen")`, mismo patrón que ya usa `variants` para exigir al menos un elemento.
2. `components/admin/AdminProductForm.jsx`: se agrega una sección de "Imágenes" con un input de URL (y botón "agregar otra imagen"), siguiendo el mismo patrón de lista dinámica que ya existe para variantes.
3. `lib/products/admin-service.js`: `createAdminProduct` / la función de update correspondiente persisten las URLs cargadas en la tabla `product_media` (`product_id`, `url`, `alt`, `is_primary` para la primera).
4. Precio y stock no requieren cambios de validación — el schema de Supabase ya impone `NOT NULL` en `price_cents` y `stock_quantity`, y `adminVariantSchema` ya exige `priceCents`/`stockQuantity` al guardar. Se documenta explícitamente (en el propio formulario, como texto de ayuda) que estos valores se pueden cargar como estimado inicial y editar después.
5. El filtro de candidatos de catálogo (mismo mecanismo de la sección B) se generaliza para excluir cualquier producto sin ninguna fila en `product_media`, sin importar categoría o si viene del fallback local o de Supabase. Esto es lo que resuelve, a nivel de código, que "ningún producto quede sin imagen" tanto para altas nuevas (bloqueadas por el schema) como para datos ya existentes sin imagen (ver sección E).

### E. Backfill de datos reales en producción

El usuario corrió las 4 queries de validación contra el proyecto real de Supabase (`ijxdsuxwbzhvfwedgqzt`) y compartió los resultados. Esto reemplaza la auditoría que no se pudo hacer desde esta sesión y deja un panorama concreto (no hipotético):

- **19 productos activos sin ninguna variante** (por lo tanto sin precio ni stock, mostrando "Sin stock configurado"). De estos:
  - **9 son colchones/conjuntos "core"** (Classic Special foam/pocket, Classic Rest bonell, Top Hotel Rest, High Rest Mid — en versión colchón y conjunto) que **ya tienen imagen real cargada** en `product_media` (vienen del bucket de Supabase Storage, con el sufijo `-S` para la versión conjunto/colchón+sommier, tal como confirmó el usuario). Slugs: `colchon-classic-special-foam`, `colchon-classic-special-pocket`, `colchon-classic-rest-bonell`, `colchon-top-hotel-rest`, `conjunto-classic-special-foam`, `conjunto-classic-special-pocket`, `conjunto-classic-rest-bonell`, `conjunto-high-rest-mid`, `conjunto-top-hotel-rest`.
  - **8 son combos/divanes** (no core, no almohada) que además no tienen imagen: `combo-classic-rest-bonell`, `combo-classic-special-foam`, `combo-classic-special-pocket`, `combo-colchon-sommier-doble-europillow-hd`, `combo-colchon-sommier-doble-europillow-hd-plus`, `divan-family-rest-foam`, `divan-family-rest-bonell`, `divan-family-rest-pocket`.
  - **2 son pillows** (`pillow-high-rest-alta-densidad`, `pillow-top-hotel-rest-memory`), que de todas formas quedan ocultos por la sección B.
- **11 productos activos sin ninguna imagen.** De estos, 2 son los pillows de arriba, y los otros **9 son combos/divanes** — los mismos 8 de arriba más un tercer slug de "Combo Colchón y Sommier Doble Europillow" (`combo-colchon-y-sommier-doble-europillow-espuma-de-alta-densidad-almohadas-de-regalo`) que sí tiene variantes/precio cargado, pero ninguna imagen.
- **Variantes en $0:** ninguna.

**Decisión confirmada con el usuario:** los productos sin ninguna imagen real no se muestran en el storefront — se generaliza el filtro de candidatos de la sección B de "excluir por categoría" a "excluir si `product_media` está vacío", sin importar la categoría. Quedan visibles y editables en el admin, y reaparecen solos en el catálogo apenas alguien les carga una imagen real vía el campo nuevo de la sección D.

**Backfill ejecutado el 2026-07-11 contra producción (`ijxdsuxwbzhvfwedgqzt`):**

Se insertó una variante `Único` para los 9 productos core con imagen real y sin variantes. Cada variante quedó con `stock_quantity = 10`, `inventory_status = 'in_stock'`, `currency_code = 'ARS'`, `compare_at_price_cents = null` y metadata `backfill = '2026-07-11-catalog-quick-fixes'`. El script de ejecución fue `scripts/backfill-core-variants.mjs`; una segunda corrida en dry-run confirmó que los 9 productos ya tenían 1 variante y no quedaban filas pendientes.

Precios insertados:

- `colchon-classic-special-foam`: `$619.999`.
- `colchon-classic-special-pocket`: `$739.999`.
- `colchon-classic-rest-bonell`: `$599.999`.
- `colchon-top-hotel-rest`: `$1.419.999`.
- `conjunto-classic-special-foam`: `$919.999`.
- `conjunto-classic-special-pocket`: `$1.039.999`.
- `conjunto-classic-rest-bonell`: `$899.999`.
- `conjunto-high-rest-mid`: `$1.309.999`.
- `conjunto-top-hotel-rest`: `$1.769.999`.

**Backfill adicional ejecutado el 2026-07-11 contra producción (`ijxdsuxwbzhvfwedgqzt`):**

Después de validar visualmente el catálogo, se corrigió la expectativa: el catálogo core son **10 modelos comerciales** y cada uno debe existir como **colchón** y como **conjunto con sommier**, por lo tanto el storefront debe mostrar **20 productos** con imagen real. Producción tenía 12 productos visibles; faltaban 8 filas de producto, no estaban archivadas ni ocultas.

Se creó el script idempotente `scripts/backfill-missing-catalog-products.mjs` y se insertaron los 8 productos faltantes con `status = 'active'`, `is_featured = false`, metadata explícita de `line`, `technology`, `sale_type`, `display_name`, imagen primaria del bucket `colchones` y una variante placeholder `Único` editable desde admin.

Productos insertados:

- `colchon-high-rest-foam`: `HIGH-REST-FIRM.jpg`, `$839.999`.
- `conjunto-high-rest-foam`: `HIGH-REST-FIRM-S.jpg`, `$1.189.999`.
- `colchon-superior-rest-mid`: `SUPERIOR-REST-MID.jpg`, `$979.999`.
- `conjunto-superior-rest-mid`: `SUPERIOR-REST-MID-S.jpg`, `$1.369.999`.
- `colchon-superior-rest-mid-plush`: `SUPERIOR-REST-MID-PLUSH.jpg`, `$1.029.999`.
- `conjunto-superior-rest-mid-plush`: `SUPERIOR-REST-MID-PLUSH-S.jpg`, `$1.419.999`.
- `colchon-superior-rest-ultra-plush`: `SUPERIOR-REST-ULTRA-PLUSH.jpg`, `$1.099.999`.
- `conjunto-superior-rest-ultra-plush`: `SUPERIOR-REST-ULTRA-PLUSH-S.jpg`, `$1.489.999`.

Una consulta posterior confirmó **20 productos activos visibles** con `product_media` y al menos una variante.

**Limpieza ejecutada el 2026-07-11 contra producción (`ijxdsuxwbzhvfwedgqzt`):**

Se archivaron productos activos que no pertenecían al catálogo Sleep definido o que eran duplicados del combo Europillow. No se borraron filas; quedaron con `status = 'archived'` para sacarlos del storefront sin perder trazabilidad.

- `sleep-air-hybrid`.
- `sleep-balance-foam`.
- `combo-colchon-sommier-doble-europillow-hd`.
- `combo-colchon-sommier-doble-europillow-hd-plus`.
- `combo-colchon-y-sommier-doble-europillow-espuma-alta-densidad-almohadas-de-regalo`.
- `combo-colchon-y-sommier-doble-europillow-espuma-de-alta-densidad-almohadas-de-regalo`.

**Plan original de backfill:**

1. Para los **9 core con imagen** (primer grupo de arriba): agregar una variante placeholder por producto para que dejen de mostrar "Sin stock configurado" y sean comprables ya mismo. El precio se deriva del mismo modelo que ya usa el catálogo de fallback (`LINE_PRICE_BASE` + `TECHNOLOGY_PRICE_OFFSET` en `lib/products/admin-service.js`, según línea + tecnología + tipo de venta del producto), no un número al azar — y el stock se carga con una cantidad razonable (ej. 10 unidades). Todo queda editable después desde el admin con los valores reales. Ejemplo de la forma del insert (a repetir por cada uno de los 9, calculando `price_cents` según su línea/tecnología):

   ```sql
   insert into product_variants (product_id, sku, title, price_cents, stock_quantity)
   values (
     (select id from products where slug = 'colchon-classic-special-foam'),
     'CLASSIC-SPECIAL-FOAM-UNICO', -- ajustar convención de SKU real
     'Único',
     619999, -- derivado de LINE_PRICE_BASE['Classic Special'].mattress + offset foam
     10
   );
   ```

2. Para los **8 combos/divanes sin imagen ni variantes** y el **1 combo con variantes pero sin imagen**: quedan ocultos por la regla de la sección B/D hasta que se les cargue una imagen real desde el admin. No hace falta backfillear precio/stock de los 8 mientras estén ocultos (no tiene sentido hacerlos comprables si nadie los puede ver); se puede hacer junto con la carga de la imagen real cuando el usuario la tenga.
3. Este backfill corre contra el proyecto real de Supabase, al que esta sesión no tiene acceso — se necesita que el usuario lo ejecute él mismo (con el SQL final, calculado producto por producto) o que conecte la cuenta correcta acá para hacerlo directo.

## Fuera de alcance

- Ejecutar el backfill de la sección E contra la base real (queda documentado, no implementado, hasta que el usuario lo pida explícitamente).
- Resolver los 3 slugs duplicados de "Combo Colchón y Sommier Doble Europillow" (ver observación en Hallazgos) — no se toca sin confirmación explícita del usuario.
- Upload de imágenes a Supabase Storage desde el admin (se resuelve con campo de URL por ahora).
- Fusión de colchón + sommier en un mismo producto (#4) y rediseño de la barra de comparación (#5): specs propios, a diseñarse después de este bloque.

## Testing

- `lib/products/catalog-discovery.test.mjs`: casos nuevos para el filtro de candidatos que excluye `almohadas`/`pillow` por categoría y, por separado, cualquier producto sin `product_media`.
- `lib/products/admin-schema.test.mjs`: casos para el nuevo requisito de `media` (mínimo 1, rechaza array vacío).
- `lib/products/mappers.test.mjs`: si `mapCatalogProductToCardData`/`mapCatalogProductToDetailData` cambian por el filtro de categoría o por media.
- Verificación manual en preview: nav sin links a almohadas, `/catalog?category=almohadas` sin resultados, ficha de un producto almohada dando 404, carrito mostrando imagen real de un producto agregado, alta de producto nuevo en admin bloqueada sin imagen. Con datos reales (una vez conectado el proyecto correcto o vía datos de prueba equivalentes): confirmar que los 9 combos/divanes sin imagen no aparecen en catálogo y que los 9 core con imagen sí aparecen y muestran precio real una vez corrido el backfill de la sección E.
