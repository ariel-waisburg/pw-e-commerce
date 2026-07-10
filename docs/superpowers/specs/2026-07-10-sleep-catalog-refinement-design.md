# Sleep catalog refinement — design

## Context

El usuario proporcionó la taxonomía comercial completa de los productos Sleep (líneas, tecnologías, plazas, pillow) y confirmó que las imágenes reales de cada producto ya están cargadas en el bucket de Supabase Storage `colchones`. La investigación encontró que el catálogo actual ya implementa gran parte de esta taxonomía, pero tiene bugs reales que lo desalinean tanto de la info dada como de los assets reales:

1. **Combinaciones Classic inventadas.** El generador de catálogo de fallback (`data/products.js`) cruza las 3 tecnologías con las 2 alturas de Classic (Special y Rest), generando 6 combinaciones. Solo existen 3 combinaciones reales con foto: Classic Special (Foam, Pocket) y Classic Rest (Bonell). Las otras 3 no tienen imagen y hoy muestran placeholder.
2. **Nombres comerciales contradictorios.** `lib/products/catalog-config.mjs` (`LINE_DEFINITIONS.displayNameByTechnology`) dice que Superior Rest usa "Firm/Plush/Mid", pero `lib/products/product-card.mjs` (`MATTRESS_CARD_DEFINITIONS`, la fuente que realmente se renderiza en las cards) usa "Mid/Mid Plush/Ultra Plush" — que coincide con los nombres de archivo reales (`SUPERIOR-REST-MID`, `SUPERIOR-REST-MID-PLUSH`, `SUPERIOR-REST-ULTRA-PLUSH`). Las dos fuentes deben decir lo mismo.
3. **Grilla de medidas incompleta y mal categorizada.** `CANONICAL_MEASURE_CODES` en `lib/products/catalog.mjs` solo tiene 9 medidas agrupadas en 4 categorías de plaza, con errores: 100x190/100x200 figuran como "1 plaza" (deberían ser "1 plaza y media"), y 150x190 figura como "2 plazas" (debería ser "Queen"). Además `lib/products/sleep-intent.mjs` (`SIZE_DEFINITIONS`) tiene una tercera categorización distinta e inconsistente con la anterior.
4. **Imágenes locales desactualizadas.** `/public/products/*.jpg` usa una convención de nombres vieja (sufijo `-1` = colchón solo, sin sufijo = conjunto). El bucket real de Supabase usa la convención opuesta y correcta (sin sufijo = colchón solo, sufijo `-S` = conjunto/colchón+sommier). `lib/products/media.js` referencia los archivos viejos, y además nunca aprendió que la línea "Classic Special" existe (solo tiene claves para "Classic Rest"), por lo que los productos Classic Special no muestran ninguna imagen.

El bucket de Supabase `colchones` es privado (no público), así que las imágenes se sincronizan a `/public/products` en vez de servirse en vivo desde Supabase — mismo patrón que ya usa el código hoy.

## Decisiones confirmadas con el usuario

- **Sommier standalone:** fuera de alcance. No existe ninguna foto de "sommier solo" (sin colchón encima) en el bucket, solo "colchón solo" y "colchón + sommier". No se agrega como tipo de producto independiente en esta iteración.
- **Alturas exactas (cm) por línea:** el usuario todavía no las tiene. Se mantienen los valores actuales (que ya respetan el orden correcto: Classic Special < Classic Rest < High Rest < Superior Rest < Top Hotel Rest) sin inventar nuevos números.
- **"Falso pillow":** NO se agrega como opción del enum de pillow en esta iteración (pedido explícito del usuario).

## Alcance

### A. Combinaciones válidas por línea

Corregir `lib/products/catalog-config.mjs` (`LINE_DEFINITIONS`) y `data/products.js` para que solo generen combinaciones con foto real:

| Línea | Tecnologías válidas |
|---|---|
| Classic Special | foam, pocket |
| Classic Rest | bonell |
| High Rest | foam, bonell, pocket |
| Superior Rest | foam, bonell, pocket |
| Top Hotel Rest | pocket |

`data/products.js` hoy usa `lineDefinition.allowedTechnologies` para generar el catálogo de fallback — al corregir `allowedTechnologies` de Classic Special y Classic Rest, el generador deja de crear las 3 combinaciones fantasma automáticamente.

### B. Nombres comerciales unificados

Actualizar `displayNameByTechnology` en `catalog-config.mjs` para que coincida exactamente con `MATTRESS_CARD_DEFINITIONS` de `product-card.mjs`:

- Classic Special: foam → "Special Foam", pocket → "Special Pocket"
- Classic Rest: bonell → "Rest"
- High Rest: foam → "Foam", bonell → "Plush", pocket → "Pocket"
- Superior Rest: foam → "Mid", bonell → "Mid Plush", pocket → "Ultra Plush"
- Top Hotel Rest: pocket → "Top Hotel" (mantener valor actual de product-card.mjs; revisar que no rompa el copy existente en catálogo)

Esto asegura que la página de detalle de producto (que usa `catalog-config.mjs` vía `catalog.mjs`) muestre el mismo nombre que la card del listado (que usa `product-card.mjs`).

### C. Grilla de medidas y plazas corregida

Reemplazar la grilla de 9 medidas / 4 plazas por la completa de 17 medidas / 5 plazas, con la categorización correcta:

| Plaza | Medidas |
|---|---|
| 1 plaza | 080x190, 080x200, 090x190, 090x200 |
| 1 plaza y media | 100x190, 100x200, 105x190, 105x200 |
| 2 plazas | 130x190, 140x190, 140x200 |
| Queen | 150x190, 150x200, 160x190, 160x200 |
| King | 180x200, 200x200 |

Cambios concretos:
- `CANONICAL_MEASURE_CODES` y `MEASURE_TO_VISIBLE_PLAZA` en `lib/products/catalog.mjs`: reemplazar por la grilla completa arriba.
- `PLAZA_ORDER`: pasa a `["1 plaza", "1 plaza y media", "2 plazas", "queen", "king"]`.
- `SIZE_DEFINITIONS` en `lib/products/sleep-intent.mjs`: reconciliar para que use la misma categorización (hoy es una tercera fuente distinta e inconsistente). Mantener las funciones de alias/sugerencia de medida existentes, solo corrigiendo a qué plaza pertenece cada medida.
- `data/products.js` (`LINE_MEASURE_CODES`): las líneas normales pasan a ofrecer las 17 medidas; Top Hotel Rest mantiene su restricción a Queen+King pero con los códigos corregidos (150x190, 150x200, 160x190, 160x200, 180x200, 200x200) en vez de la lista parcial actual.
- La lógica de split de sommier en conjuntos (umbral en 160 cm de ancho: <160 → 1 sommier, ≥160 → 2 mitades) ya es correcta y no cambia.

### D. Sincronización de imágenes reales

1. Descargar las 20 imágenes actuales del bucket `colchones` (vía `SUPABASE_SERVICE_ROLE_KEY`, ya que el bucket es privado) a `/public/products/`, usando los nombres reales del bucket (sin sufijo = colchón solo, `-S` = conjunto).
2. Borrar los archivos locales viejos con la convención `-1` que ya no corresponden a ningún asset real.
3. Reescribir `PRODUCT_IMAGE_BY_KEY` en `lib/products/media.js`:
   - Corregir las claves para reflejar las combinaciones reales por línea (ver sección A) — incluyendo `Classic Special|foam`, `Classic Special|pocket` y `Classic Rest|bonell`, que hoy no existen como claves.
   - Actualizar cada filename a la convención nueva (`<ARCHIVO>.jpg` = mattress, `<ARCHIVO>-S.jpg` = set).

### Fuera de alcance

- Sommier como tipo de producto independiente.
- Alturas exactas en cm (se mantienen los valores actuales, orden ya correcto).
- Opción "Falso pillow" en el enum de pillow.
- Servir imágenes en vivo desde Supabase Storage (se mantiene el patrón de copias locales en `/public/products`).

## Testing

El repo ya tiene tests unitarios para esta lógica (`lib/products/catalog.test.mjs`, `lib/products/media.test.mjs`, `lib/products/product-card.test.mjs`, `lib/products/mappers.test.mjs`, `lib/products/sleep-intent.test.mjs`, `lib/products/catalog-discovery.test.mjs`). Se actualizan los que dependen de las medidas/combinaciones/imágenes viejas, y se agregan casos para las combinaciones Classic corregidas y la grilla de medidas completa.

Verificación manual en preview: catálogo filtrado por línea/tecnología/plaza, tarjetas de Classic Special mostrando imagen real, página de detalle de un Superior Rest mostrando "Mid"/"Mid Plush"/"Ultra Plush" consistente con la card.
