# Rodríguez Barbería — Réplica Web (con Supabase real)

Réplica web 1:1 del Design System de la app Android nativa **BRapp2**
(Jetpack Compose / Material 3), construida con **React + TypeScript + Vite**,
conectada al **mismo backend real de Supabase** que usa la app móvil.

## 1. Configurar Supabase

1. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los datos de tu
   proyecto. **Puedes usar exactamente el mismo proyecto de Supabase que usa
   la app Android** (los mismos valores que `SUPABASE_URL` /
   `SUPABASE_ANON_KEY` en las variables de entorno con las que se compila
   `app/build.gradle.kts`) — así ambas apps comparten los mismos clientes,
   reservas, servicios y productos en tiempo real.
3. (Opcional) Rellena `VITE_ANDROID_DOWNLOAD_URL` con el enlace de Google
   Play o el APK de la app — ver sección 4.

Si `.env` no está configurado, la web lo detecta y muestra una pantalla
explicándolo en vez de fallar de forma confusa.

### Si vas a crear un proyecto de Supabase nuevo (no compartir el de Android)

La app espera este esquema (inferido de `data/models/*.kt` y
`service/SupabaseClient.kt`):

```sql
-- PERFILES (uno por usuario de Auth; phone es el "nombre de usuario" real)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text not null,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz default now()
);

create table services (
  id bigint generated always as identity primary key,
  name text not null,
  duration_minutes int not null default 30,
  duration_slots int not null default 1,
  price numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table products (
  id bigint generated always as identity primary key,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  image_url1 text,
  image_url2 text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table appointments (
  id bigint generated always as identity primary key,
  client_id uuid not null references profiles(id),
  service_id bigint not null references services(id),
  ticket_number int not null,
  full_name text not null,
  last_name1 text,
  last_name2 text,
  phone text not null,
  is_annexed boolean not null default false,
  main_client_id uuid references profiles(id),
  appointment_date date not null,
  appointment_time time not null,
  status text not null default 'confirmed'
    check (status in ('confirmed','attended','canceled','in_progress')),
  created_by_admin boolean not null default false,
  notes text,
  is_rescheduled boolean not null default false,
  original_appointment_id bigint references appointments(id),
  canceled_by text,
  canceled_at timestamptz,
  created_at timestamptz default now()
);

create table blocked_slots (
  id bigint generated always as identity primary key,
  block_date date not null,
  block_time time not null,
  reason text,
  blocked_by text,
  created_at timestamptz default now()
);

-- Clave/valor: manager_name, manager_phone, store_hours, working_days
-- (CSV "MON,TUE,..."), slot_definitions (CSV "10:00,10:30,...": turnos
-- configurables por el admin, sin cantidad fija; ver pantalla "Horario")
create table settings (
  id bigint generated always as identity primary key,
  key text unique not null,
  value text not null,
  updated_at timestamptz default now()
);

-- Notas acumulables del admin por cliente (por teléfono), reemplaza al
-- viejo campo único "notes" por cita
create table client_notes (
  id bigint generated always as identity primary key,
  client_phone text not null,
  client_name text not null,
  note text not null,
  admin_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Bucket público de Storage para imágenes de productos
insert into storage.buckets (id, name, public) values ('Product_image', 'Product_image', true);
```

**Políticas RLS mínimas** (ajusta a tus necesidades reales de seguridad):

```sql
alter table profiles enable row level security;
alter table services enable row level security;
alter table products enable row level security;
alter table appointments enable row level security;
alter table blocked_slots enable row level security;
alter table settings enable row level security;

-- Perfiles: cada quien lee/edita el suyo; el registro inserta su propia fila
create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

-- Servicios y productos: lectura pública, escritura solo admin
create policy "public read services" on services for select using (true);
create policy "public read products" on products for select using (true);
create policy "admin write services" on services for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admin write products" on products for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Reservas: cliente ve/crea las suyas, admin ve/edita todas
create policy "client own appointments" on appointments for select using (
  client_id = auth.uid() or main_client_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "client create appointment" on appointments for insert with check (
  client_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admin update appointments" on appointments for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Turnos bloqueados y ajustes: solo admin
create policy "admin blocked_slots" on blocked_slots for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "public read settings" on settings for select using (true);
create policy "admin write settings" on settings for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Notas de cliente: solo admin
alter table client_notes enable row level security;
create policy "admin client_notes" on client_notes for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

**Importante — desactivar confirmación de email:** como la app usa teléfono
como identidad real (mapeado internamente a `TELEFONO@barberia.cu` para
GoTrue), ve a *Authentication → Providers → Email* en Supabase y desactiva
"Confirm email", igual que necesita la app Android para funcionar sin buzón
de correo real.

## 2. Ejecutar

```bash
npm install
npm run dev       # http://localhost:5173
```

Build de producción:

```bash
npm run build
npm run preview
```

## 3. Responsive: dos layouts reales, no un teléfono simulado

- **Móvil (< 900px):** el contenido ocupa el 100% del viewport, como app
  nativa, con navegación inferior (`BottomNavigation`), altura táctil mínima
  de 48px en todo elemento interactivo y soporte de `safe-area-inset` para
  el notch/home indicator del iPhone.
- **Escritorio (≥ 900px):** layout propio de escritorio — **no** se simula
  un teléfono dentro del navegador. Hay una barra lateral fija (`Sidebar`)
  con la navegación, y el panel de contenido aprovecha el ancho real de la
  pantalla: las listas de servicios/productos/reservas pasan a mostrarse en
  cuadrícula de varias columnas (`.card-grid`), y el flujo de reserva usa un
  layout de dos columnas (calendario/horarios + reservas activas en
  paralelo, `.two-col`).

Ambos modos comparten exactamente los mismos componentes, colores y
tipografía — solo cambia cómo se distribuye la interfaz
(`src/styles/global.css`, sección `RESPONSIVE REAL`, y el hook
`src/utils/useIsDesktop.ts` que decide entre `Sidebar` y `BottomNavigation`
en `ClientHomeScreen`/`AdminHomeScreen`).

## 4. Detección de Android + enlace de descarga de la app nativa

Si `VITE_ANDROID_DOWNLOAD_URL` está configurada, la web detecta
automáticamente (`navigator.userAgent`) cuando se abre desde un dispositivo
Android y muestra un banner superior invitando a descargar la app nativa,
con un botón que abre ese enlace (Google Play o un APK directo). El banner
se puede cerrar y la web recuerda esa preferencia (`localStorage`).

Lógica en `src/utils/deviceDetect.ts` y `src/components/AndroidDownloadBanner.tsx`.

## Cuentas de prueba

Usa las cuentas reales que ya existan en tu proyecto de Supabase (las
mismas con las que entras desde la app Android). Para crear una cuenta de
prueba nueva, usa la pantalla de **Registro** de la propia web — creará el
usuario en Supabase Auth + su fila en `profiles` con rol `client`. Para un
admin, crea el usuario y luego actualiza manualmente `role = 'admin'` en la
tabla `profiles` desde el panel de Supabase.

## De dónde sale cada cosa

- **`src/styles/tokens.css`** — paleta exacta de `Color.kt`/`Theme.kt`,
  radios, elevaciones M3 y escala tipográfica de `Type.kt`.
- **`src/data/supabaseClient.ts`** — cliente real de Supabase, puerto de
  `service/SupabaseClient.kt` (mismo dominio de auth ficticio
  `@barberia.cu`, mismo bucket `Product_image`).
- **`src/data/store.ts`** — puerto real de `AuthService.kt`,
  `AppointmentService.kt`, `ProductService.kt` y `BlockedSlotService.kt`
  sobre PostgREST/GoTrue — ya no usa `localStorage` como base de datos.
- **`src/utils/`** — puertos línea a línea de `Validators.kt`,
  `DateFormatter.kt` y `SlotSchedule.kt`.
- **`src/screens/`** — un screen por cada `*Screen.kt` de `ui/auth`,
  `ui/client` y `ui/admin`, incluyendo el flujo de reserva de 5 pasos y la
  regla de negocio real "1 titular + 1 anexada" (`AppointmentService.createAppointment`).

## Notas de fidelidad

- Los roles de color M3 que Kotlin no sobreescribe explícitamente en
  `Theme.kt` (`*Container`, `error*`, `outline`, etc.) se derivaron
  siguiendo las convenciones de Material You a partir de las mismas
  semillas de `Color.kt`.
- A diferencia del Kotlin original (que en algún punto silencia errores de
  inserción y devuelve un objeto local simulado), esta versión propaga
  cualquier error real de Supabase/RLS para que la persona vea exactamente
  qué falló al reservar, guardar o eliminar algo.
- Los íconos usan la fuente **Material Symbols Rounded** de Google, la
  misma familia visual que `Icons.Default.*` en Jetpack Compose. El efecto
  *ripple* se replica con una animación CSS (`.ripple`), respetando
  `prefers-reduced-motion`.

## Sincronizado con la versión corregida del Kotlin (última pasada)

- **Turnos configurables**: ya no hay 12 turnos fijos por código. El admin
  los administra desde Ajustes → Horario (`AdminScheduleScreen.tsx`):
  agregar/quitar turnos sueltos y prender/apagar días laborables, guardado en
  `settings.slot_definitions` con fallback automático a los 12 de siempre.
- **Hora sin AM/PM**: `formatTimeForDisplay` ahora devuelve `"1:00"` en vez
  de `"1:00 PM"`, igual que la app.
- **Calendario rediseñado**: "hoy" es un círculo ámbar sólido con texto
  negro en negrita; el estado verde/rojo colorea el *texto* del día, no el
  fondo; el día seleccionado usa un anillo del color primario.
- **Refresh feedback con estado de red**: antes de refrescar se verifica
  `navigator.onLine` (equivalente web de `NetworkUtils.isOnline()`); hay un
  toast rojo de error si falla o no hay conexión; el punto de frescura dura
  60s en el panel de admin (antes 3s) y hay un botón de actualizar manual en
  la barra superior.
- **Notas de cliente acumulables**: reemplaza el viejo campo único "notas"
  por cita. Ahora el admin agrega notas libres por cliente (por teléfono),
  visibles en cualquier cita de ese cliente (`client_notes`,
  `ClientNotesSection.tsx`).
- **Contraseña con mostrar/ocultar**: nuevo `PasswordField` en login,
  registro y ambos diálogos de cambiar contraseña (cliente y admin).
- **Pie de página del desarrollador**: "Esta app fue hecha por L2dev" con
  enlaces a sitio web y WhatsApp, al final de Ajustes (cliente y admin).

Los cambios de Kotlin que son puramente de Android (migraciones de Room,
callback de gesto "atrás", notificaciones de arranque del sistema) no
aplican a la web y no se replicaron.
