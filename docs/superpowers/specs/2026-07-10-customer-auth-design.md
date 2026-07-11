# Auth de clientes (registro, login, checkout con sesión)

## Contexto

La corrección de la cátedra señaló "únicamente valida el mail": el proyecto no
tiene ningún sistema de autenticación de clientes. El checkout hoy es 100%
invitado (carrito por cookie `anonymous_key`), y el único formulario de email
que existe (Zod, en `app/actions/checkout.js`) valida formato, no identidad.

El schema de Supabase (`supabase/schema.sql`) ya modela todo lo necesario para
cuentas de cliente: tabla `customers` (1:1 con `auth.users`), `addresses`, y
tanto `carts` como `orders` ya tienen columna `customer_id` con políticas RLS
completas (`auth.uid() = customer_id` en select/insert/update). Ese modelo
nunca se conectó a una interfaz — este spec cierra esa brecha.

**Decisión confirmada con el usuario:** el login pasa a ser **obligatorio**
para completar una compra (no queda opción de invitado). El alcance de esta
pasada es el mínimo que pide la Clase 9: registro, login, logout, sesión
visible, y checkout atado a `customer_id`.

**Fuera de alcance de este spec** (quedan para pasadas futuras): recuperar
contraseña, libreta de direcciones reutilizable (la tabla `addresses` existe
pero no se usa todavía), vincular el carrito por `customer_id` en vez de por
cookie de invitado (si el mismo usuario entra desde otro dispositivo no ve el
mismo carrito — limitación conocida, no un bug nuevo), página "Mis pedidos"
(la cubre el spec de APIs de carrito/órdenes que sigue después de este), y el
fix del error de rutas del pago en producción (bug distinto, ya señalado como
pendiente en el spec de 2026-07-08 y todavía no abordado).

## Arquitectura

### Sesión de cliente (mirror del patrón admin)

El admin (`lib/supabase/admin-auth.js`) ya resuelve este problema para el rol
admin con `@supabase/ssr`. Se repite el mismo patrón para clientes en un
módulo nuevo `lib/supabase/customer-auth.js`:

- `getCustomerSession()`: crea un `createServerClient` con cookies vía
  `cookies()` de Next, llama `supabase.auth.getUser()`. Si hay usuario,
  devuelve `{ user }` (a diferencia del admin, no hace falta cruzar contra
  otra tabla — cualquier fila en `auth.users` con su `customers` asociada es
  un cliente válido).
- `requireCustomerSession()`: igual que `requireAdminSession()`, para usar
  dentro de server actions que necesitan rechazar con error si no hay sesión.
- No se agrega `middleware.js` global — mismo criterio que el admin: el
  chequeo vive en el punto de uso (layout/página/acción), no en un
  interceptor global. Mantiene el blast radius acotado.

### Páginas nuevas

- **`/registro`** (client component, mismo patrón que
  `app/admin/login/page.js`): campos Nombre, Email, Password, Confirmar
  password (validación de coincidencia en cliente). Al enviar:
  1. `supabase.auth.signUp({ email, password })` con
     `getSupabaseBrowserClient()`.
  2. Si no hay error, llama a un server action `createCustomerProfileAction`
     que usa **service role** (no el cliente con sesión) para insertar la fila
     en `public.customers` (`id`, `full_name`). Se usa service role
     específicamente porque si el proyecto tiene confirmación de email
     activada, todavía no hay sesión activa en ese momento y la policy RLS
     `customers_insert_self` (que exige `auth.uid() = id`) fallaría.
  3. Redirige a `/login` con mensaje "Cuenta creada, iniciá sesión".
- **`/login`**: mismo patrón que `/admin/login`
  (`supabase.auth.signInWithPassword`), pero sin cruce contra `admin_users`.
  Acepta `?next=` (ej. `/checkout`) y redirige ahí tras loguear; por defecto
  redirige a `/`.
- **Logout**: botón/client component chico en el header,
  `supabase.auth.signOut()` seguido de `router.refresh()`.

### Header con estado de sesión

`app/layout.js` (o el wrapper que renderiza `Navbar`) pasa a leer
`getCustomerSession()` server-side y pasarle el usuario (o `null`) a
`Navbar` como prop. `Navbar` (ya es client component) muestra "Hola,
{nombre}" + logout si hay sesión, o links "Ingresar" / "Registrarme" si no.

### Checkout atado a sesión

- `app/checkout/page.js` (Server Component): al principio, `const session =
  await getCustomerSession();` — si es `null`, `redirect('/login?next=/checkout')`.
- `createCheckoutPreferenceAction` (`app/actions/checkout.js`) **también**
  valida la sesión al inicio de la función (`requireCustomerSession()`), no
  solo confía en el redirect de la página — una acción de servidor es un
  endpoint invocable directamente, así que el gate tiene que estar ahí. Si no
  hay sesión, lanza el mismo tipo de error que ya maneja el formulario
  (`throw new Error(...)`), que el cliente ya muestra en el bloque `catch`.
- Al crear la orden: el cart existente (encontrado por la cookie de
  invitado, igual que hoy) se "reclama" — se le hace `update` con
  `customer_id = session.user.id` antes/junto con el insert de la orden, y la
  orden se crea con `customer_id` seteado. El resto del flujo (creación de
  preferencia de Mercado Pago, `order_items`, `payments`) no cambia.

## Manejo de errores

- Registro con email ya usado → Supabase Auth devuelve error específico; se
  traduce a "Ese email ya tiene una cuenta, iniciá sesión" con link a
  `/login`.
- Login con credenciales inválidas → mismo mensaje genérico que ya usa el
  admin ("Email o contraseña incorrectos"), para no filtrar si el email
  existe o no.
- Checkout sin sesión (acción invocada directo) → error claro devuelto al
  formulario: "Iniciá sesión para completar la compra".
- Fallo al crear la fila en `customers` tras un `signUp` exitoso (poco
  probable, pero posible con service role) → se loguea server-side y se
  muestra "No se pudo completar el registro, probá de nuevo" — no se deja al
  usuario con un `auth.users` sin `customers` asociado sin avisar.

## Paso operativo (no lo puedo hacer yo)

Verificar en el dashboard de Supabase (Authentication → Settings → Email)
si "Confirm email" está activado. Si lo está, después de `signUp()` el
usuario no tiene sesión activa hasta confirmar por mail, y el flujo
registro → login inmediato no cierra para la demo. Recomendación: desactivarlo
para este proyecto (práctica común en trabajos de cátedra), o si se deja
activado, documentarlo como paso manual en el flujo de prueba.

## Testing

- Unit tests (`node --test`) para la lógica de armado de sesión/gate donde
  sea practicable sin mockear todo Supabase (ej. validación de formulario de
  registro: contraseñas no coinciden, email inválido).
- Verificación manual en preview: registro → login → header muestra sesión →
  intentar `/checkout` sin sesión redirige a `/login?next=/checkout` → tras
  loguear vuelve a `/checkout` → completar compra → la orden en Supabase
  tiene `customer_id` seteado.

## Documentación

- README: sección "Cuentas de cliente" — variables de entorno (ninguna
  nueva, ya están todas), y la nota sobre "Confirm email" en Supabase Auth
  settings.
