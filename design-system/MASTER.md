# Design System Master File

> Este archivo es la fuente global de verdad para la UI de Sleep.
> El output bruto del generador se conserva en `design-system/sleep/MASTER.md`.
> Este `MASTER.md` lo reemplaza como referencia canónica para el proyecto.

---

**Project:** Sleep  
**Updated:** 2026-06-13  
**Category:** E-commerce guiado para colchones y sommiers

---

## Brand Direction

Sleep no debe verse como una marca de spa, lujo frío ni tecnología.

La marca debe sentirse:

- simple y cercana
- confiable y clara
- moderna sin gestos futuristas
- accesible sin verse barata
- visualmente calma
- orientada a facilitar la decisión

### Core Principle

La UI tiene que bajar ansiedad.
Cada pantalla debe ayudar a entender:

1. qué cambia entre modelos
2. qué medida corresponde
3. si conviene colchón o conjunto
4. cuánto cuesta y en cuántas cuotas

---

## What Changed From The Generated System

El sistema generado automáticamente proponía:

- negro + dorado como base
- una estética `Liquid Glass`
- tipografía con tono wellness/luxury
- un patrón de landing demasiado genérico para un e-commerce de decisión guiada

Para Sleep se cambia eso por:

- una paleta anclada en el celeste de la marca, con teal oscuro para confianza
- superficies sólidas y claras, no vidrio ni blur como lenguaje principal
- una tipografía editorial-confiable, no “spa”
- componentes hechos para comparar, seleccionar y comprar con claridad

---

## Global Rules

### Color Palette

El celeste debe ser más visible que en el sistema generado, pero no usado de forma estridente.
Se usa como color de identidad, selección y alivio visual.
Para CTA principal se usa una variante más profunda para mantener contraste.

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Trust / Primary | `#123A3F` | `--color-primary` | encabezados, texto fuerte, anchors de confianza |
| Primary Light | `#1E5A61` | `--color-primary-light` | hovers, estados secundarios, encabezados de apoyo |
| Brand Accent | `#27C2C7` | `--color-accent` | identidad visible, chips activos, detalles, highlights |
| CTA Accent | `#0F8F95` | `--color-accent-strong` | CTA principal, focus, selección con alto contraste |
| CTA Hover | `#0B7A80` | `--color-accent-hover` | hover / pressed del CTA principal |
| Accent Soft | `#E8F8F8` | `--color-accent-soft` | fondos suaves para chips, badges, ayudas |
| Background | `#FFFDF8` | `--color-background` | fondo principal cálido |
| Surface | `#FFFFFF` | `--color-surface` | cards y formularios |
| Surface Alt | `#F5F8F6` | `--color-surface-alt` | paneles secundarios, specs, bloques de apoyo |
| Surface Warm | `#F8F5EF` | `--color-surface-warm` | secciones de transición, fondos editoriales |
| Text Primary | `#163238` | `--color-text-primary` | texto principal |
| Text Secondary | `#5D7273` | `--color-text-secondary` | cuerpo, ayuda, metadata |
| Text Muted | `#8FA2A3` | `--color-text-muted` | labels débiles, supporting copy |
| Border | `#D7E6E3` | `--color-border` | bordes estándar |
| Border Light | `#E8F1EF` | `--color-border-light` | divisores suaves |
| Success | `#22A06B` | `--color-success` | envío gratis, confirmaciones |

### Color Notes

- No usar negro puro como color identitario.
- No usar dorado como CTA dominante.
- Evitar degradés llamativos tipo wellness, fintech o SaaS.
- El celeste debe aparecer en selección, señales de confianza, filtros activos, badges y foco.
- El CTA principal usa `--color-accent-strong`, no `--color-accent`, para asegurar contraste.

---

## Typography

La tipografía debe sentirse confiable, legible y comercial.
No buscamos una voz de spa ni una voz corporativa dura.

- **Heading Font:** Newsreader
- **Body / UI Font:** Source Sans 3
- **Mood:** confiable, cálida, legible, editorial, humana
- **Why:** Newsreader da personalidad serena sin caer en lujo artificial; Source Sans 3 hace más clara la navegación, formularios y fichas.
- **Google Fonts:** [Newsreader + Source Sans 3](https://fonts.google.com/share?selection.family=Newsreader:wght@400;500;600;700|Source+Sans+3:wght@300;400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
```

### Type Scale

| Role | Size | Line Height | Notes |
|------|------|-------------|-------|
| Hero Display | `clamp(2.5rem, 5vw, 4.25rem)` | `1.02-1.08` | headline principal |
| H1 | `clamp(2.1rem, 4vw, 3.2rem)` | `1.06` | PDP, selector hero |
| H2 | `clamp(1.75rem, 3vw, 2.4rem)` | `1.1` | secciones |
| H3 | `1.25rem - 1.6rem` | `1.15` | cards, módulos |
| Body L | `1.0625rem` | `1.7` | texto explicativo importante |
| Body | `1rem` | `1.65` | texto principal |
| Body S | `0.875rem` | `1.55` | metadata |
| Label | `0.75rem - 0.8125rem` | `1.3` | filtros, specs, chips |

### Typography Rules

- Serif sólo para títulos y momentos editoriales.
- Sans para navegación, forms, precios, comparativas y acciones.
- Evitar uppercase excesivo en bloques largos.
- Precios siempre en sans, con tracking compacto y peso alto.
- No usar combinaciones que se sientan “boutique”, “hotel de lujo” o “wellness orgánico”.

---

## Spacing Scale

La escala debe ayudar a que la información respire sin parecer premium vacía.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-2xs` | `4px` | micro separación |
| `--space-xs` | `8px` | íconos, pills, inline gaps |
| `--space-sm` | `12px` | grupos cortos |
| `--space-md` | `16px` | padding base |
| `--space-lg` | `24px` | cards, bloques |
| `--space-xl` | `32px` | separación entre módulos |
| `--space-2xl` | `48px` | secciones |
| `--space-3xl` | `64px` | hero / bloques grandes |
| `--space-4xl` | `96px` | aperturas de página desktop |

### Spacing Rules

- En mobile, priorizar `16 / 24 / 32`.
- En desktop, priorizar `24 / 32 / 48 / 64`.
- No usar espaciados arbitrarios por página.
- El ruido visual se reduce más con spacing consistente que con más color.

---

## Radius Scale

Sleep puede tener bordes suaves y amigables, pero no hiper-redondeados infantiles.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | `6px` | inputs compactos |
| `--radius-sm` | `10px` | botones secundarios, chips |
| `--radius-md` | `14px` | inputs, botones primarios |
| `--radius-lg` | `20px` | cards principales |
| `--radius-xl` | `28px` | héroes, paneles destacados |
| `--radius-full` | `9999px` | pills, badges |

### Radius Rules

- No usar radios duros tipo dashboard.
- No usar cápsulas gigantes en todos los componentes.
- Combinar radios medianos con superficies claras da cercanía sin verse barato.

---

## Shadow Depths

Las sombras deben separar capas, no dramatizar la interfaz.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 4px rgba(22, 50, 56, 0.06)` | separaciones sutiles |
| `--shadow-md` | `0 6px 18px rgba(22, 50, 56, 0.10)` | cards, botones |
| `--shadow-lg` | `0 14px 36px rgba(22, 50, 56, 0.12)` | dropdowns, paneles sticky |
| `--shadow-xl` | `0 22px 56px rgba(22, 50, 56, 0.16)` | overlays, drawers |
| `--shadow-accent` | `0 10px 24px rgba(15, 143, 149, 0.24)` | CTA principal |

### Shadow Rules

- No usar glass blur como lenguaje base.
- No usar sombras negras duras.
- Hover de cards: priorizar borde + sombra, no salto grande de elevación.

---

## Component Specs

### Buttons

Los botones deben dejar claro qué acción principal resuelve la decisión.

```css
.btn-primary {
  min-height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 14px;
  background: var(--color-accent-strong);
  color: #ffffff;
  font-family: var(--font-ui);
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
  cursor: pointer;
  box-shadow: var(--shadow-accent);
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

.btn-primary:focus-visible {
  outline: 3px solid rgba(39, 194, 199, 0.35);
  outline-offset: 2px;
}

.btn-secondary {
  min-height: 48px;
  padding: 0 22px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 0.9375rem;
  font-weight: 700;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent-strong);
  background: var(--color-accent-soft);
}
```

### Button Rules

- CTA principal: uno por bloque.
- No competir con dos botones primarios iguales.
- En mobile, los CTA críticos deben ser full-width.
- Evitar texto de botón demasiado técnico.

### Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid rgba(18, 58, 63, 0.08);
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.card:hover {
  border-color: rgba(39, 194, 199, 0.28);
  box-shadow: var(--shadow-md);
}

.card--soft {
  background: var(--color-surface-alt);
}
```

### Card Rules

- Las cards de producto tienen que priorizar:
  - línea
  - modelo
  - tecnología
  - precio
  - medida / presentación
- La imagen no debe robarle protagonismo a la comprensión.
- En cards comparativas, usar specs cortas y consistentes.

### Inputs

```css
.input {
  min-height: 48px;
  width: 100%;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: #ffffff;
  color: var(--color-text-primary);
  font-size: 1rem;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.input::placeholder {
  color: var(--color-text-muted);
}

.input:focus {
  border-color: var(--color-accent-strong);
  outline: none;
  box-shadow: 0 0 0 3px rgba(39, 194, 199, 0.22);
}
```

### Input Rules

- Labels visibles siempre.
- Usar `inputmode` correcto en mobile cuando aplique.
- El foco no se reemplaza con nada invisible.
- No oscurecer el fondo del input salvo en estados de error o disabled.

### Chips

```css
.chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: #ffffff;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  font-weight: 700;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.chip:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.chip--active {
  border-color: var(--color-accent-strong);
  background: rgba(39, 194, 199, 0.14);
  color: var(--color-primary);
}

.chip--removable {
  gap: 8px;
  cursor: pointer;
}
```

### Chip Rules

- Los estados activos deben verse por color, borde y peso.
- No confiar sólo en celeste saturado para marcar selección.
- En filtros, los chips activos deben poder removerse rápido.

---

## Interactive States

### Focus

- Siempre visible.
- Usar ring celeste con offset cuando el fondo lo necesite.
- Nunca usar `outline: none` sin reemplazo claro.

### Hover

- Sutil y estable.
- Cambiar borde, color o sombra.
- Evitar scale grande y rebotes.

### Pressed / Selected

- Debe sentirse más firme y más claro, no sólo “más oscuro”.
- En chips, pills y variantes usar combinación de:
  - borde
  - fondo
  - color
  - peso del texto

### Disabled

- Reducir contraste y sombra.
- Mantener legibilidad.
- No usar disabled ambiguo si el usuario no entiende por qué está bloqueado.

### Motion

- Transiciones estándar: `150ms - 220ms`.
- Usar `prefers-reduced-motion`.
- Las animaciones deben apoyar lectura, no decorar.

### Touch Targets

- mínimo `44x44px` para mobile
- preferido `48px` en CTA, filtros y selección de variantes

---

## Page Pattern

El patrón principal de Sleep no es `wellness landing`.
Es `guided comparison commerce`.

### Recommended Order

1. Propuesta clara
2. Señales de confianza
3. Selector o entrada guiada
4. Comparación entre líneas/modelos
5. Grid de productos
6. Ayuda contextual sobre medidas y presentación
7. CTA de cierre o contacto

### Layout Principles

- Mobile-first real
- navegación corta
- una acción principal por pantalla
- filtros secundarios colapsables
- información comercial y técnica separadas

---

## Photography Criteria

La fotografía debe sentirse real, luminosa y comercial.
No editorial de lujo extremo, no catálogo frío de tecnología, no spa.

### Do

- ambientes de dormitorio claros y ordenados
- luz natural o suave
- textiles neutros, cálidos y limpios
- fondos crema, blanco roto, gris cálido, madera clara
- mostrar altura, pillow y volumen del colchón con claridad
- incluir tomas que ayuden a comparar líneas
- producto sobre base limpia cuando haga falta leer detalles

### Avoid

- tonos negros + dorados dominantes
- tratamiento azulado frío o clínico
- exceso de blur, glow o reflejos “glass”
- escenas demasiado aspiracionales que oculten el producto
- props innecesarios que compitan con la lectura
- compresión agresiva o recortes poco consistentes

---

## Anti-Patterns (Do NOT Use)

- ❌ estética spa / wellness genérica
- ❌ `Liquid Glass` como lenguaje principal
- ❌ negro + dorado como identidad dominante
- ❌ superficies demasiado transparentes
- ❌ promos estridentes compitiendo con la propuesta de valor
- ❌ emojis como íconos
- ❌ hover con desplazamientos bruscos
- ❌ focus invisible
- ❌ exceso de uppercase en textos explicativos
- ❌ confundir línea, modelo comercial y tecnología en el mismo nivel visual

---

## Pre-Delivery Checklist

- [ ] El celeste de Sleep está visible en estados clave, chips, foco y señales de confianza
- [ ] El CTA principal usa una variante profunda con contraste suficiente
- [ ] La UI se siente calma, clara y comercial, no wellness ni tecnológica
- [ ] El naming separa línea, modelo, tecnología, medida y presentación
- [ ] Precio, cuotas, medida y presentación son visibles sin esfuerzo
- [ ] Cards y filtros ayudan a comparar, no sólo a decorar
- [ ] No hay emojis usados como íconos de producto o confianza
- [ ] Todos los interactivos tienen `cursor: pointer`
- [ ] El foco de teclado es visible en toda la app
- [ ] Responsive verificado en 375, 768, 1024 y 1440 px
- [ ] No hay horizontal scroll en mobile
- [ ] `prefers-reduced-motion` respetado
