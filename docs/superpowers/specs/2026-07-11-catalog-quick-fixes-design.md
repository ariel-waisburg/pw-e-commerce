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
- El proyecto de Supabase conectado a este entorno de trabajo no es el de producción real (`ijxdsuxwbzhvfwedgqzt`), así que no se pudo auditar la base en vivo. El usuario va a correr manualmente un set de queries de validación (ver sección de fuera de alcance) contra la base real.
- `CartDrawer.jsx:41` usa un emoji fijo (🛏) como placeholder de imagen en vez de la imagen real del producto.

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

### C. Imagen en el carrito

- Al agregar un producto al carrito (`components/AddToCartForm.jsx`), se incluye la imagen ya calculada del producto (`getDerivedProductMedia` / el primer elemento de `product.media`) como parte de los datos que se guardan en el item del carrito (`lib/cart/serializer.js` y donde sea que `context/CartContext.jsx` persista el item).
- `components/CartDrawer.jsx:40-42`: se reemplaza el `<div className={styles.itemImagePlaceholder}>🛏</div>` fijo por un `<img>` con la imagen del item; si el item no tiene imagen guardada (ej. productos ya en el carrito de antes de este cambio, o productos sin media), se mantiene el emoji como fallback visual.

### D. Ninguna imagen ni precio faltante

1. `lib/products/admin-schema.mjs`: se agrega un campo `media` al `adminProductSchema` — un array de `{ url, alt? }` con `.min(1, "Agregá al menos una imagen")`, mismo patrón que ya usa `variants` para exigir al menos un elemento.
2. `components/admin/AdminProductForm.jsx`: se agrega una sección de "Imágenes" con un input de URL (y botón "agregar otra imagen"), siguiendo el mismo patrón de lista dinámica que ya existe para variantes.
3. `lib/products/admin-service.js`: `createAdminProduct` / la función de update correspondiente persisten las URLs cargadas en la tabla `product_media` (`product_id`, `url`, `alt`, `is_primary` para la primera).
4. Precio y stock no requieren cambios de validación — el schema de Supabase ya impone `NOT NULL` en `price_cents` y `stock_quantity`, y `adminVariantSchema` ya exige `priceCents`/`stockQuantity` al guardar. Se documenta explícitamente (en el propio formulario, como texto de ayuda) que estos valores se pueden cargar como estimado inicial y editar después.

## Fuera de alcance

- Auditar o corregir productos ya existentes en la base de producción real: el Supabase conectado a este entorno no es el proyecto real (`ijxdsuxwbzhvfwedgqzt`). El usuario va a correr manualmente estas queries de validación contra la base real y avisar si hace falta un arreglo puntual:

  ```sql
  -- Productos sin ninguna imagen cargada
  select p.id, p.slug, p.name, p.status
  from products p
  left join product_media m on m.product_id = p.id
  where m.id is null
  order by p.updated_at desc;

  -- Productos sin ninguna variante ("Sin stock configurado")
  select p.id, p.slug, p.name, p.status
  from products p
  left join product_variants v on v.product_id = p.id
  where v.id is null;

  -- Variantes en $0 (permitido por el schema, probablemente no intencional)
  select p.slug, p.name, v.id as variant_id, v.sku, v.price_cents
  from product_variants v
  join products p on p.id = v.product_id
  where v.price_cents = 0;

  -- Productos activos de almohadas/pillow (para saber si hay algo real que ocultar)
  select p.id, p.slug, p.name, p.status, c.slug as category_slug
  from products p
  join categories c on c.id = p.category_id
  where c.slug in ('almohadas','pillow');
  ```

- Upload de imágenes a Supabase Storage desde el admin (se resuelve con campo de URL por ahora).
- Fusión de colchón + sommier en un mismo producto (#4) y rediseño de la barra de comparación (#5): specs propios, a diseñarse después de este bloque.

## Testing

- `lib/products/catalog-discovery.test.mjs`: casos nuevos para el filtro de categoría que excluye `almohadas`/`pillow` de los candidatos.
- `lib/products/admin-schema.test.mjs`: casos para el nuevo requisito de `media` (mínimo 1, rechaza array vacío).
- `lib/products/mappers.test.mjs`: si `mapCatalogProductToCardData`/`mapCatalogProductToDetailData` cambian por el filtro de categoría o por media.
- Verificación manual en preview: nav sin links a almohadas, `/catalog?category=almohadas` sin resultados, ficha de un producto almohada dando 404, carrito mostrando imagen real de un producto agregado, alta de producto nuevo en admin bloqueada sin imagen.
