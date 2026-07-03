-- Seed data for Sleep ecommerce clone.
-- Apply with: supabase db reset --file supabase/schema.sql --seed supabase/seed.sql

begin;

insert into public.categories (slug, name, description, hero_copy, sort_index)
values
  ('colchones', 'Colchones', 'Colchones ordenados por línea, tecnología y medida exacta.', 'Compará por línea y cerrá la compra por medida exacta.', 1),
  ('conjuntos', 'Conjuntos', 'Conjuntos completos con la lógica nueva de línea, pillow y altura.', 'Elegí tu conjunto por línea, tecnología, plaza y medida.', 2),
  ('almohadas', 'Almohadas', 'Almohadas definidas por tecnología y tamaño opcional.', 'Completá tu descanso con almohadas según material y sensación.', 3),
  ('pillow', 'Pillow Tops', 'Accesorios de confort fuera del eje principal colchón/conjunto.', 'Sumá una capa extra de comfort con pillow tops por medida.', 4),
  ('sommier', 'Sommiers', 'Categoría reservada para bases coordinadas fuera del flujo principal actual.', 'Bases coordinadas.', 5)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      hero_copy = excluded.hero_copy,
      sort_index = excluded.sort_index;

insert into public.collections (slug, name, description, merch_banner_url)
values
  ('destacados', 'Destacados', 'Productos con mayor prioridad comercial.', null),
  ('catalogo-comercial', 'Catálogo comercial', 'Catálogo normalizado por línea, tecnología y medida.', null)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;

insert into public.products (
  category_id,
  slug,
  sku_base,
  name,
  tagline,
  short_description,
  long_description,
  status,
  is_featured,
  attributes,
  metadata,
  seo_title,
  seo_description
)
values
  (
    (select id from public.categories where slug = 'colchones'),
    'colchon-classic-rest-pocket',
    'SLP-CR-PKT',
    'Colchón Classic Rest Pocket',
    'Classic Rest',
    'Colchón con resortes pocket y lectura comercial simple.',
    'Classic Rest Pocket mantiene la navegación por línea y usa la medida exacta como base técnica de la compra.',
    'active',
    true,
    jsonb_build_object('garantia', '5 años'),
    jsonb_build_object('sale_type', 'mattress', 'line', 'Classic Rest', 'technology', 'pocket', 'display_name', 'Pocket', 'legacy_name', 'Pocket', 'commercial_alias', 'Pocket', 'badges', ARRAY['Destacado', 'Envio gratis']),
    'Colchón Classic Rest Pocket | Sleep',
    'Colchón Classic Rest Pocket con compra por línea, plaza y medida exacta.'
  ),
  (
    (select id from public.categories where slug = 'colchones'),
    'colchon-high-rest-foam',
    'SLP-HR-FRM',
    'Colchón High Rest Firm',
    'High Rest',
    'Colchón de espuma con soporte firme dentro de High Rest.',
    'High Rest Firm conserva el naming comercial histórico, pero ahora la tecnología espuma queda modelada como atributo técnico.',
    'active',
    true,
    jsonb_build_object('garantia', '8 años'),
    jsonb_build_object('sale_type', 'mattress', 'line', 'High Rest', 'technology', 'foam', 'display_name', 'Firm', 'legacy_name', 'Firm', 'commercial_alias', 'Firm', 'badges', ARRAY['Premium']),
    'Colchón High Rest Firm | Sleep',
    'Colchón High Rest Firm con selector por plaza y medida exacta.'
  ),
  (
    (select id from public.categories where slug = 'colchones'),
    'colchon-superior-rest-bonell',
    'SLP-SR-PLS',
    'Colchón Superior Rest Plush',
    'Superior Rest',
    'Colchón Superior Rest con resortes bonell y pillow americano.',
    'Superior Rest Plush separa el nombre comercial de la tecnología bonell para vender por sensación sin perder estructura técnica.',
    'active',
    true,
    jsonb_build_object('garantia', '10 años'),
    jsonb_build_object('sale_type', 'mattress', 'line', 'Superior Rest', 'technology', 'bonell', 'display_name', 'Plush', 'legacy_name', 'Plush', 'commercial_alias', 'Plush', 'badges', ARRAY['Premium']),
    'Colchón Superior Rest Plush | Sleep',
    'Colchón Superior Rest Plush con pillow americano y altura grande.'
  ),
  (
    (select id from public.categories where slug = 'colchones'),
    'colchon-top-hotel-rest-pocket',
    'SLP-THR-PKT',
    'Colchón Top Hotel Rest Pocket',
    'Top Hotel Rest',
    'Colchón pocket premium con pillow americano y altura muy grande.',
    'Top Hotel Rest sólo admite pocket y se presenta como la línea más aspiracional del catálogo.',
    'active',
    true,
    jsonb_build_object('garantia', '12 años'),
    jsonb_build_object('sale_type', 'mattress', 'line', 'Top Hotel Rest', 'technology', 'pocket', 'display_name', 'Pocket', 'legacy_name', 'Pocket', 'commercial_alias', 'Pocket', 'badges', ARRAY['Hotel', 'Premium']),
    'Colchón Top Hotel Rest Pocket | Sleep',
    'Colchón Top Hotel Rest Pocket con pillow americano y terminación hotelera.'
  ),
  (
    (select id from public.categories where slug = 'conjuntos'),
    'conjunto-classic-rest-bonell',
    'SLP-CR-BON-SET',
    'Conjunto Classic Rest Bonell',
    'Classic Rest',
    'Conjunto completo con resortes bonell y sin pillow.',
    'Classic Rest Bonell mantiene la lógica nueva por línea y tecnología, y calcula la composición del sommier según la medida.',
    'active',
    true,
    jsonb_build_object('incluye', 'colchon + sommier'),
    jsonb_build_object('sale_type', 'set', 'line', 'Classic Rest', 'technology', 'bonell', 'display_name', 'Bonell', 'legacy_name', 'Bonell', 'commercial_alias', 'Bonell', 'badges', ARRAY['Combo completo']),
    'Conjunto Classic Rest Bonell | Sleep',
    'Conjunto Classic Rest Bonell organizado por línea, plaza y medida exacta.'
  ),
  (
    (select id from public.categories where slug = 'conjuntos'),
    'conjunto-high-rest-pocket',
    'SLP-HR-MID-SET',
    'Conjunto High Rest Mid',
    'High Rest',
    'Conjunto pocket con euro pillow dentro de la línea High Rest.',
    'High Rest Mid usa el nombre histórico como display comercial, pero conserva pocket como tecnología estructurada.',
    'active',
    true,
    jsonb_build_object('incluye', 'colchon + sommier'),
    jsonb_build_object('sale_type', 'set', 'line', 'High Rest', 'technology', 'pocket', 'display_name', 'Mid', 'legacy_name', 'Mid', 'commercial_alias', 'Mid', 'badges', ARRAY['Premium']),
    'Conjunto High Rest Mid | Sleep',
    'Conjunto High Rest Mid con plaza visible y medida exacta.'
  ),
  (
    (select id from public.categories where slug = 'conjuntos'),
    'conjunto-top-hotel-rest-pocket',
    'SLP-THR-PKT-SET',
    'Conjunto Top Hotel Rest Pocket',
    'Top Hotel Rest',
    'Conjunto pocket hotelero con pillow americano.',
    'Top Hotel Rest Pocket muestra con claridad la composición del sommier en medidas de queen y king.',
    'active',
    true,
    jsonb_build_object('incluye', 'colchon + sommier'),
    jsonb_build_object('sale_type', 'set', 'line', 'Top Hotel Rest', 'technology', 'pocket', 'display_name', 'Pocket', 'legacy_name', 'Pocket', 'commercial_alias', 'Pocket', 'badges', ARRAY['Hotel', 'Premium']),
    'Conjunto Top Hotel Rest Pocket | Sleep',
    'Conjunto Top Hotel Rest Pocket con lógica de sommier dividido desde 160 cm.'
  ),
  (
    (select id from public.categories where slug = 'almohadas'),
    'almohada-viscoelastica',
    'SLP-PIL-VSC',
    'Almohada Viscoelástica',
    'Almohadas',
    'Almohada premium de recuperación lenta.',
    'La línea de almohadas se modela por tecnología y deja el tamaño como dato opcional hasta nueva definición de negocio.',
    'active',
    false,
    jsonb_build_object('funda', 'lavable'),
    jsonb_build_object('pillow_technology', 'viscoelastica', 'badges', ARRAY['Premium']),
    'Almohada Viscoelástica | Sleep',
    'Almohada viscoelástica premium.'
  ),
  (
    (select id from public.categories where slug = 'almohadas'),
    'almohada-silicona',
    'SLP-PIL-SLC',
    'Almohada Silicona',
    'Almohadas',
    'Almohada con esfera siliconada y sensación mullida.',
    'Silicona completa la familia de almohadas con una lectura comercial simple por tecnología.',
    'active',
    false,
    jsonb_build_object('funda', 'lavable'),
    jsonb_build_object('pillow_technology', 'silicona', 'badges', ARRAY['Envio gratis']),
    'Almohada Silicona | Sleep',
    'Almohada con esfera siliconada.'
  ),
  (
    (select id from public.categories where slug = 'pillow'),
    'pillow-top-top-hotel',
    'SLP-TOP-PILLOW',
    'Pillow Top Top Hotel',
    'Top Hotel Rest',
    'Capa extra de confort para sumar una sensación hotelera.',
    'El pillow top queda fuera del eje principal colchón/conjunto pero conserva variantes por medida.',
    'active',
    false,
    jsonb_build_object('relleno', 'foam soft'),
    jsonb_build_object('badges', ARRAY['Premium']),
    'Pillow Top Top Hotel | Sleep',
    'Pillow top premium por medida.'
  )
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  tagline = excluded.tagline,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  status = excluded.status,
  is_featured = excluded.is_featured,
  attributes = excluded.attributes,
  metadata = excluded.metadata,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into public.product_variants (
  product_id,
  sku,
  title,
  price_cents,
  compare_at_price_cents,
  currency_code,
  stock_quantity,
  inventory_status,
  dimensions,
  metadata
)
values
  ((select id from public.products where slug = 'colchon-classic-rest-pocket'), 'SLP-CR-PKT-140190', '2 Plazas · 140 x 190 cm', 69999900, 139999800, 'ARS', 10, 'in_stock', jsonb_build_object('measure_code', '140x190', 'width_cm', 140, 'length_cm', 190, 'height_cm', 24), jsonb_build_object('measure_code', '140x190')),
  ((select id from public.products where slug = 'colchon-classic-rest-pocket'), 'SLP-CR-PKT-160200', 'Queen · 160 x 200 cm', 75999900, 151999800, 'ARS', 8, 'in_stock', jsonb_build_object('measure_code', '160x200', 'width_cm', 160, 'length_cm', 200, 'height_cm', 24), jsonb_build_object('measure_code', '160x200')),
  ((select id from public.products where slug = 'colchon-high-rest-foam'), 'SLP-HR-FRM-140190', '2 Plazas · 140 x 190 cm', 87999900, 175999800, 'ARS', 8, 'in_stock', jsonb_build_object('measure_code', '140x190', 'width_cm', 140, 'length_cm', 190, 'height_cm', 27), jsonb_build_object('measure_code', '140x190')),
  ((select id from public.products where slug = 'colchon-high-rest-foam'), 'SLP-HR-FRM-160200', 'Queen · 160 x 200 cm', 94999900, 189999800, 'ARS', 6, 'in_stock', jsonb_build_object('measure_code', '160x200', 'width_cm', 160, 'length_cm', 200, 'height_cm', 27), jsonb_build_object('measure_code', '160x200')),
  ((select id from public.products where slug = 'colchon-superior-rest-bonell'), 'SLP-SR-PLS-150190', '2 Plazas · 150 x 190 cm', 112999900, 225999800, 'ARS', 5, 'in_stock', jsonb_build_object('measure_code', '150x190', 'width_cm', 150, 'length_cm', 190, 'height_cm', 32), jsonb_build_object('measure_code', '150x190')),
  ((select id from public.products where slug = 'colchon-superior-rest-bonell'), 'SLP-SR-PLS-160200', 'Queen · 160 x 200 cm', 119999900, 239999800, 'ARS', 4, 'in_stock', jsonb_build_object('measure_code', '160x200', 'width_cm', 160, 'length_cm', 200, 'height_cm', 32), jsonb_build_object('measure_code', '160x200')),
  ((select id from public.products where slug = 'colchon-top-hotel-rest-pocket'), 'SLP-THR-PKT-160200', 'Queen · 160 x 200 cm', 139999900, 279999800, 'ARS', 4, 'in_stock', jsonb_build_object('measure_code', '160x200', 'width_cm', 160, 'length_cm', 200, 'height_cm', 37), jsonb_build_object('measure_code', '160x200')),
  ((select id from public.products where slug = 'colchon-top-hotel-rest-pocket'), 'SLP-THR-PKT-180200', 'King · 180 x 200 cm', 146999900, 293999800, 'ARS', 3, 'low_stock', jsonb_build_object('measure_code', '180x200', 'width_cm', 180, 'length_cm', 200, 'height_cm', 37), jsonb_build_object('measure_code', '180x200')),
  ((select id from public.products where slug = 'conjunto-classic-rest-bonell'), 'SLP-CR-BON-SET-100200', '1 Plaza · 100 x 200 cm', 88999900, 177999800, 'ARS', 7, 'in_stock', jsonb_build_object('measure_code', '100x200', 'width_cm', 100, 'length_cm', 200, 'height_cm', 24), jsonb_build_object('measure_code', '100x200')),
  ((select id from public.products where slug = 'conjunto-classic-rest-bonell'), 'SLP-CR-BON-SET-140190', '2 Plazas · 140 x 190 cm', 93999900, 187999800, 'ARS', 6, 'in_stock', jsonb_build_object('measure_code', '140x190', 'width_cm', 140, 'length_cm', 190, 'height_cm', 24), jsonb_build_object('measure_code', '140x190')),
  ((select id from public.products where slug = 'conjunto-high-rest-pocket'), 'SLP-HR-MID-SET-150190', '2 Plazas · 150 x 190 cm', 126999900, 253999800, 'ARS', 5, 'in_stock', jsonb_build_object('measure_code', '150x190', 'width_cm', 150, 'length_cm', 190, 'height_cm', 27), jsonb_build_object('measure_code', '150x190')),
  ((select id from public.products where slug = 'conjunto-high-rest-pocket'), 'SLP-HR-MID-SET-160200', 'Queen · 160 x 200 cm', 134999900, 269999800, 'ARS', 4, 'in_stock', jsonb_build_object('measure_code', '160x200', 'width_cm', 160, 'length_cm', 200, 'height_cm', 27), jsonb_build_object('measure_code', '160x200')),
  ((select id from public.products where slug = 'conjunto-top-hotel-rest-pocket'), 'SLP-THR-PKT-SET-160200', 'Queen · 160 x 200 cm', 169999900, 339999800, 'ARS', 3, 'in_stock', jsonb_build_object('measure_code', '160x200', 'width_cm', 160, 'length_cm', 200, 'height_cm', 37), jsonb_build_object('measure_code', '160x200')),
  ((select id from public.products where slug = 'conjunto-top-hotel-rest-pocket'), 'SLP-THR-PKT-SET-180200', 'King · 180 x 200 cm', 178999900, 357999800, 'ARS', 2, 'low_stock', jsonb_build_object('measure_code', '180x200', 'width_cm', 180, 'length_cm', 200, 'height_cm', 37), jsonb_build_object('measure_code', '180x200')),
  ((select id from public.products where slug = 'almohada-viscoelastica'), 'SLP-PIL-VSC-UNICO', 'Único', 8999900, 12999900, 'ARS', 20, 'in_stock', jsonb_build_object('width_cm', 70, 'length_cm', 40, 'height_cm', 14), '{}'::jsonb),
  ((select id from public.products where slug = 'almohada-silicona'), 'SLP-PIL-SLC-UNICO', 'Único', 5499900, 7999900, 'ARS', 18, 'in_stock', jsonb_build_object('width_cm', 70, 'length_cm', 40, 'height_cm', 14), '{}'::jsonb),
  ((select id from public.products where slug = 'pillow-top-top-hotel'), 'SLP-TOP-PILLOW-160200', '160 x 200 cm', 25999900, 35999900, 'ARS', 8, 'in_stock', jsonb_build_object('width_cm', 160, 'length_cm', 200, 'height_cm', 8), '{}'::jsonb),
  ((select id from public.products where slug = 'pillow-top-top-hotel'), 'SLP-TOP-PILLOW-180200', '180 x 200 cm', 28999900, 39999900, 'ARS', 6, 'in_stock', jsonb_build_object('width_cm', 180, 'length_cm', 200, 'height_cm', 8), '{}'::jsonb)
on conflict (sku) do update
  set title = excluded.title,
      price_cents = excluded.price_cents,
      compare_at_price_cents = excluded.compare_at_price_cents,
      stock_quantity = excluded.stock_quantity,
      inventory_status = excluded.inventory_status,
      dimensions = excluded.dimensions,
      metadata = excluded.metadata;

insert into public.product_media (product_id, media_type, url, alt, is_primary, sort_index)
values
  ((select id from public.products where slug = 'colchon-classic-rest-pocket'), 'image', 'storage://colchones/CLASSIC-POCKET-1.jpg', 'Colchón Classic Rest Pocket', true, 1),
  ((select id from public.products where slug = 'colchon-high-rest-foam'), 'image', 'storage://colchones/HIGH-REST-FIRM-1.jpg', 'Colchón High Rest Firm', true, 1),
  ((select id from public.products where slug = 'colchon-superior-rest-bonell'), 'image', 'storage://colchones/SUPERIOR-REST-MID-PLUSH-1.jpg', 'Colchón Superior Rest Plush', true, 1),
  ((select id from public.products where slug = 'colchon-top-hotel-rest-pocket'), 'image', 'storage://colchones/TOP-HOTEL-REST-1.jpg', 'Colchón Top Hotel Rest Pocket', true, 1),
  ((select id from public.products where slug = 'conjunto-classic-rest-bonell'), 'image', 'storage://colchones/CLASSIC-REST-BONELL.jpg', 'Conjunto Classic Rest Bonell', true, 1),
  ((select id from public.products where slug = 'conjunto-high-rest-pocket'), 'image', 'storage://colchones/HIGH-REST-MID.jpg', 'Conjunto High Rest Mid', true, 1),
  ((select id from public.products where slug = 'conjunto-top-hotel-rest-pocket'), 'image', 'storage://colchones/TOP-HOTEL-REST.jpg', 'Conjunto Top Hotel Rest Pocket', true, 2),
  ((select id from public.products where slug = 'almohada-viscoelastica'), 'image', '/pillow-hr-15eab100a6aa6084ea17635556028814-1024-1024.webp', 'Almohada Viscoelástica', true, 1),
  ((select id from public.products where slug = 'almohada-silicona'), 'image', '/pillow-hr-15eab100a6aa6084ea17635556028814-1024-1024.webp', 'Almohada Silicona', true, 1),
  ((select id from public.products where slug = 'pillow-top-top-hotel'), 'image', '/top-hotel-rest-14-copia-1-1-a28960852064fa321117635556678911-640-0.webp', 'Pillow Top Top Hotel', true, 1)
on conflict (product_id, url) do update
  set alt = excluded.alt,
      is_primary = excluded.is_primary,
      sort_index = excluded.sort_index;

insert into public.product_collections (product_id, collection_id, sort_index)
values
  ((select id from public.products where slug = 'colchon-classic-rest-pocket'), (select id from public.collections where slug = 'destacados'), 1),
  ((select id from public.products where slug = 'colchon-high-rest-foam'), (select id from public.collections where slug = 'destacados'), 2),
  ((select id from public.products where slug = 'conjunto-high-rest-pocket'), (select id from public.collections where slug = 'destacados'), 3),
  ((select id from public.products where slug = 'conjunto-top-hotel-rest-pocket'), (select id from public.collections where slug = 'destacados'), 4),
  ((select id from public.products where slug = 'colchon-top-hotel-rest-pocket'), (select id from public.collections where slug = 'catalogo-comercial'), 1),
  ((select id from public.products where slug = 'colchon-superior-rest-bonell'), (select id from public.collections where slug = 'catalogo-comercial'), 2),
  ((select id from public.products where slug = 'almohada-viscoelastica'), (select id from public.collections where slug = 'catalogo-comercial'), 3)
on conflict (product_id, collection_id) do update
  set sort_index = excluded.sort_index;

insert into public.discount_codes (code, description, discount_type, amount, currency_code, usage_limit, starts_at, ends_at)
values
  ('BIENVENIDA10', '10% off en tu primera compra', 'percentage', 10, 'ARS', 1000, now() - interval '7 days', now() + interval '60 days')
on conflict (code) do update
  set description = excluded.description,
      amount = excluded.amount,
      usage_limit = excluded.usage_limit,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at;

commit;
