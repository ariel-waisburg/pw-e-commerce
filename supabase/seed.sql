-- Seed data for Sleep ecommerce clone.
-- Apply with: supabase db reset --file supabase/schema.sql --seed supabase/seed.sql

begin;

-- ---------- Categories ----------
insert into public.categories (slug, name, description, hero_copy, sort_index)
values
  ('colchones', 'Colchones', 'Líneas híbridas y memory foam con certificaciones europeas.', 'Descubrí tu colchón ideal con tecnología europea y envío sin cargo.', 1),
  ('almohadas', 'Almohadas', 'Modelos viscoelásticos y de microfibra.', 'Combina soporte cervical y frescura en cualquier estación.', 2),
  ('accesorios', 'Accesorios', 'Sabanas, protectores y deco pensados para el descanso premium.', 'Vestí tu dormitorio con textiles hipoalergénicos.', 3)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      hero_copy = excluded.hero_copy,
      sort_index = excluded.sort_index;

-- ---------- Collections ----------
insert into public.collections (slug, name, description, merch_banner_url)
values
  ('destacados', 'Destacados', 'Productos con mayor demanda y stock prioritario.', null),
  ('combos-descanso', 'Combos de descanso', 'Bundles que integran colchón + base + almohadas con precio especial.', null)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description;

-- ---------- Products ----------
insert into public.products (category_id, slug, sku_base, name, tagline, short_description, long_description, status, is_featured, attributes, metadata, seo_title, seo_description)
values
(
  (select id from public.categories where slug = 'colchones'),
  'sleep-air-hybrid',
  'SLP-AIR',
  'Sleep Air Hybrid',
  'Frescura activa y soporte zonificado',
  'Colchón híbrido con resortes pocket y espuma viscoelástica respirable.',
  'La línea Air Hybrid combina cinco capas: base high resilience, núcleo de resortes pocket encapsulado, espuma viscoelástica con gel y tejido knit con tecnología CoolFlow. Ideal para quienes buscan frescura y soporte progresivo.',
  'active',
  true,
  jsonb_build_object('firmness', 'media', 'altura_cm', 32, 'garantia', '10 años', 'materiales', array['Pocket Coil', 'Visco Gel', 'HR Foam']),
  jsonb_build_object('badges', array['Envio 24hs CABA', 'Garantía extendida']),
  'Sleep Air Hybrid | Colchones premium con envío gratis',
  'Colchón híbrido con soporte zonificado, espuma visco y tela cool-touch. Disponible en todos los tamaños.'
),
(
  (select id from public.categories where slug = 'colchones'),
  'sleep-balance-foam',
  'SLP-BAL',
  'Sleep Balance Foam',
  'Memory foam europeo',
  'Experiencia memory foam con alivio de presión y funda lavable.',
  'Tres capas de espuma de densidad progresiva certificadas CertiPUR. Funda respirable con cierre y tratamiento antibacterial. Recomendado para quienes prefieren sensación envolvente.',
  'active',
  false,
  jsonb_build_object('firmness', 'suave', 'altura_cm', 28, 'garantia', '8 años', 'materiales', array['Memory Foam', 'Transitional Foam', 'Base Foam']),
  jsonb_build_object('badges', array['Mejor valor', 'Fundas removibles']),
  'Sleep Balance Foam | Memory Foam con funda lavable',
  'Colchón memory foam de densidades progresivas ideal para parejas y sleepers laterales.'
),
(
  (select id from public.categories where slug = 'almohadas'),
  'almohada-dual-gel',
  'SLP-PIL-DUAL',
  'Almohada Dual Gel',
  'Soporte cervical reversible',
  'Almohada visco-gel con funda doble y caras de distinta firmeza.',
  'Núcleo de espuma viscoelástica infundida en gel para disipar calor, funda reversible (knit fresco + tejido modal) y altura media ideal para dormir de lado o boca arriba.',
  'active',
  true,
  jsonb_build_object('firmness', 'media', 'altura_cm', 14, 'garantia', '2 años'),
  jsonb_build_object('badges', array['Antiácaros', 'Funda lavable']),
  'Almohada Dual Gel | Soporte cervical premium',
  'Almohada viscoelástica con gel y funda reversible para control térmico.'
)
on conflict (slug) do update set
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

-- ---------- Product variants ----------
insert into public.product_variants (product_id, sku, title, price_cents, compare_at_price_cents, currency_code, stock_quantity, inventory_status, dimensions, weight_kg)
values
  (
    (select id from public.products where slug = 'sleep-air-hybrid'),
    'SLP-AIR-MAT-150',
    'Queen 150 x 200',
    8900000,
    9500000,
    'ARS',
    25,
    'in_stock',
    jsonb_build_object('width_cm',150,'length_cm',200,'height_cm',32),
    42.5
  ),
  (
    (select id from public.products where slug = 'sleep-air-hybrid'),
    'SLP-AIR-MAT-160',
    'King 160 x 200',
    9900000,
    10500000,
    'ARS',
    18,
    'low_stock',
    jsonb_build_object('width_cm',160,'length_cm',200,'height_cm',32),
    48.0
  ),
  (
    (select id from public.products where slug = 'sleep-balance-foam'),
    'SLP-BAL-MAT-140',
    'Full 140 x 190',
    6200000,
    null,
    'ARS',
    40,
    'in_stock',
    jsonb_build_object('width_cm',140,'length_cm',190,'height_cm',28),
    35.1
  ),
  (
    (select id from public.products where slug = 'sleep-balance-foam'),
    'SLP-BAL-MAT-160',
    'King 160 x 200',
    7800000,
    null,
    'ARS',
    20,
    'in_stock',
    jsonb_build_object('width_cm',160,'length_cm',200,'height_cm',28),
    41.2
  ),
  (
    (select id from public.products where slug = 'almohada-dual-gel'),
    'SLP-PIL-DUAL-STD',
    'Standard 70 x 40',
    185000,
    210000,
    'ARS',
    120,
    'in_stock',
    jsonb_build_object('width_cm',70,'length_cm',40,'height_cm',14),
    1.2
  )
on conflict (sku) do update
  set title = excluded.title,
      price_cents = excluded.price_cents,
      compare_at_price_cents = excluded.compare_at_price_cents,
      stock_quantity = excluded.stock_quantity,
      inventory_status = excluded.inventory_status,
      dimensions = excluded.dimensions,
      weight_kg = excluded.weight_kg;

-- ---------- Product media ----------
insert into public.product_media (product_id, variant_id, media_type, url, alt, is_primary, sort_index)
values
  (
    (select id from public.products where slug = 'sleep-air-hybrid'),
    (select id from public.product_variants where sku = 'SLP-AIR-MAT-150'),
    'image',
    'https://images.sleep.cdn/sleep-air-hybrid/main.jpg',
    'Sleep Air Hybrid en dormitorio minimalista',
    true,
    1
  ),
  (
    (select id from public.products where slug = 'sleep-air-hybrid'),
    null,
    'image',
    'https://images.sleep.cdn/sleep-air-hybrid/layers.jpg',
    'Detalle de capas Sleep Air Hybrid',
    false,
    2
  ),
  (
    (select id from public.products where slug = 'sleep-balance-foam'),
    null,
    'image',
    'https://images.sleep.cdn/sleep-balance-foam/main.jpg',
    'Sleep Balance Foam con funda removible',
    true,
    1
  ),
  (
    (select id from public.products where slug = 'almohada-dual-gel'),
    (select id from public.product_variants where sku = 'SLP-PIL-DUAL-STD'),
    'image',
    'https://images.sleep.cdn/almohada-dual-gel/main.jpg',
    'Almohada Dual Gel detalle tejido',
    true,
    1
  )
on conflict (product_id, url) do update
  set alt = excluded.alt,
      is_primary = excluded.is_primary,
      sort_index = excluded.sort_index;

-- ---------- Product attributes ----------
insert into public.product_attributes (product_id, label, value, icon, sort_index)
values
  ((select id from public.products where slug = 'sleep-air-hybrid'), 'Firmeza', 'Media', 'balance', 1),
  ((select id from public.products where slug = 'sleep-air-hybrid'), 'Altura', '32 cm', 'height', 2),
  ((select id from public.products where slug = 'sleep-air-hybrid'), 'Tecnología', 'Pocket Coil + Visco Gel', 'layers', 3),
  ((select id from public.products where slug = 'sleep-balance-foam'), 'Firmeza', 'Suave', 'balance', 1),
  ((select id from public.products where slug = 'sleep-balance-foam'), 'Altura', '28 cm', 'height', 2),
  ((select id from public.products where slug = 'almohada-dual-gel'), 'Beneficio', 'Caras reversibles', 'swap_horizontal', 1)
on conflict (product_id, label) do update
  set value = excluded.value,
      icon = excluded.icon,
      sort_index = excluded.sort_index;

-- ---------- Collections mapping ----------
insert into public.product_collections (product_id, collection_id, sort_index)
values
  (
    (select id from public.products where slug = 'sleep-air-hybrid'),
    (select id from public.collections where slug = 'destacados'),
    1
  ),
  (
    (select id from public.products where slug = 'sleep-balance-foam'),
    (select id from public.collections where slug = 'destacados'),
    2
  ),
  (
    (select id from public.products where slug = 'sleep-air-hybrid'),
    (select id from public.collections where slug = 'combos-descanso'),
    1
  )
on conflict (product_id, collection_id) do update
  set sort_index = excluded.sort_index;

-- ---------- Discount example ----------
insert into public.discount_codes (code, description, discount_type, amount, currency_code, usage_limit, starts_at, ends_at)
values
  (
    'BIENVENIDA10',
    '10% off en tu primera compra',
    'percentage',
    10,
    'ARS',
    1000,
    now() - interval '7 days',
    now() + interval '60 days'
  )
on conflict (code) do update
  set description = excluded.description,
      amount = excluded.amount,
      usage_limit = excluded.usage_limit,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at;

commit;
