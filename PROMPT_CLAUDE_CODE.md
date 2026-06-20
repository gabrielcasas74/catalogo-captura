# PROMPT PARA CLAUDE CODE — App de Captura y Organización de Fotos de Producto

Copia y pega todo este documento como prompt inicial en Claude Code, dentro de la carpeta del proyecto (recomendado: `C:\Users\gabo1\Downloads\catalogo-captura\`).

---

## CONTEXTO Y ALCANCE DEL PROYECTO (leer con atención)

Tengo una tienda física con **más de 1000 productos** que necesito fotografiar. Muchos productos tienen **variantes** (ej: una "Vela" puede venir en tamaño Grande/Mediano/Pequeño, color Verde/Azul/Amarillo, y propósito Dinero/Amor — cada combinación con su propio precio). Cada variante necesita entre 1 y 3 fotos.

**El único objetivo de este proyecto es construir UNA app de captura** (PWA web, mobile-first) que yo y 1-2 ayudantes usaremos en el piso de la tienda para:
1. Tomar las fotos de cada producto/variante con el celular.
2. Que cada foto quede automáticamente correlacionada con el nombre del producto y sus datos (variantes, precio) — sin tener que adivinar después a qué producto pertenece cada foto.
3. Dejar todo organizado en una base de datos estructurada, exportable a Excel/CSV.

**NO estamos construyendo:**
- La página web del catálogo público (eso es un proyecto totalmente aparte, para más adelante).
- Carrito de compra, checkout, ni nada cara al cliente final.
- Ningún diseño visual orientado a clientes.

Esta app es una **herramienta interna de trabajo de campo**, no un producto cara al público. Prioriza velocidad de captura y simplicidad de uso por encima de estética.

---

## STACK TÉCNICO (consistente con mis otros proyectos)

- **Frontend**: React + TypeScript + Vite
- **Backend/DB**: Supabase (Postgres + Auth + Storage)
- **Deploy**: Vercel
- **Estilos**: Tailwind CSS
- **Iconos**: lucide-react

---

## ESQUEMA DE BASE DE DATOS

Ya tengo el schema SQL diseñado. Ejecuta este SQL completo en el SQL Editor de Supabase como primer paso (yo lo ejecutaré manualmente, pero quiero que generes el archivo `supabase/schema.sql` con este contenido exacto para que quede versionado en el repo):

```sql
-- ============================================================
-- CATÁLOGO TIENDA - Schema Supabase
-- Productos con variantes (tamaño/color/propósito/etc) + fotos
-- ============================================================

create extension if not exists "uuid-ossp";

create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  orden int default 0,
  created_at timestamptz default now()
);

create table productos (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  descripcion text,
  categoria_id uuid references categorias(id) on delete set null,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index idx_productos_categoria on productos(categoria_id);
create index idx_productos_nombre on productos using gin (to_tsvector('spanish', nombre));

create table atributos_definicion (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid not null references productos(id) on delete cascade,
  nombre_atributo text not null,
  orden int default 0,
  created_at timestamptz default now(),
  unique (producto_id, nombre_atributo)
);

create table atributos_valores (
  id uuid primary key default uuid_generate_v4(),
  atributo_id uuid not null references atributos_definicion(id) on delete cascade,
  valor text not null,
  orden int default 0,
  created_at timestamptz default now(),
  unique (atributo_id, valor)
);

create table variantes (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid not null references productos(id) on delete cascade,
  sku text unique,
  precio numeric(12,2) not null default 0,
  precio_oferta numeric(12,2),
  stock int,
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index idx_variantes_producto on variantes(producto_id);

create table variante_atributos (
  id uuid primary key default uuid_generate_v4(),
  variante_id uuid not null references variantes(id) on delete cascade,
  atributo_id uuid not null references atributos_definicion(id) on delete cascade,
  valor_id uuid not null references atributos_valores(id) on delete restrict,
  unique (variante_id, atributo_id)
);

create index idx_variante_atributos_variante on variante_atributos(variante_id);

create table fotos (
  id uuid primary key default uuid_generate_v4(),
  variante_id uuid references variantes(id) on delete cascade,
  producto_id uuid references productos(id) on delete cascade,
  storage_path text not null,
  url_publica text,
  orden int default 1,
  ancho int,
  alto int,
  tamano_bytes int,
  subida_por uuid references auth.users(id),
  created_at timestamptz default now(),
  constraint chk_foto_pertenece check (
    (variante_id is not null and producto_id is null) or
    (variante_id is null and producto_id is not null)
  )
);

create index idx_fotos_variante on fotos(variante_id);
create index idx_fotos_producto on fotos(producto_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_productos_updated_at
  before update on productos
  for each row execute function set_updated_at();

create trigger trg_variantes_updated_at
  before update on variantes
  for each row execute function set_updated_at();

-- Esta vista une producto + variante + atributos + fotos en una sola fila.
-- Útil tanto para revisar datos dentro de la app de captura como para
-- generar la exportación a CSV/Excel.
create or replace view catalogo_completo as
select
  p.id as producto_id,
  p.nombre as producto_nombre,
  p.descripcion as producto_descripcion,
  c.nombre as categoria,
  v.id as variante_id,
  v.sku,
  v.precio,
  v.precio_oferta,
  v.stock,
  coalesce(
    jsonb_object_agg(ad.nombre_atributo, av.valor) filter (where ad.nombre_atributo is not null),
    '{}'::jsonb
  ) as atributos,
  (
    select jsonb_agg(jsonb_build_object('url', f.url_publica, 'orden', f.orden) order by f.orden)
    from fotos f
    where f.variante_id = v.id
  ) as fotos
from productos p
left join categorias c on c.id = p.categoria_id
join variantes v on v.producto_id = p.id
left join variante_atributos va on va.variante_id = v.id
left join atributos_definicion ad on ad.id = va.atributo_id
left join atributos_valores av on av.id = va.valor_id
where p.activo = true and v.activo = true
group by p.id, p.nombre, p.descripcion, c.nombre, v.id, v.sku, v.precio, v.precio_oferta, v.stock;

alter table categorias enable row level security;
alter table productos enable row level security;
alter table atributos_definicion enable row level security;
alter table atributos_valores enable row level security;
alter table variantes enable row level security;
alter table variante_atributos enable row level security;
alter table fotos enable row level security;

-- Acceso completo solo para usuarios autenticados (tú + ayudantes).
-- No hay lectura pública: esto es una herramienta interna, no una
-- web de catálogo (eso es un proyecto aparte).
create policy "acceso_autenticado_categorias" on categorias
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "acceso_autenticado_productos" on productos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "acceso_autenticado_atributos_def" on atributos_definicion
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "acceso_autenticado_atributos_val" on atributos_valores
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "acceso_autenticado_variantes" on variantes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "acceso_autenticado_variante_atributos" on variante_atributos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "acceso_autenticado_fotos" on fotos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

**Notas del modelo de datos:**
- `productos` = el concepto general (ej: "Vela", "Camisa")
- `atributos_definicion` = qué ejes de variación tiene ESE producto (ej: Tamaño, Color, Propósito) — esto es dinámico por producto, no fijo
- `atributos_valores` = lista cerrada de opciones por atributo (ej: Tamaño → Grande/Mediano/Pequeño) — esto llena los dropdowns, evita texto libre
- `variantes` = cada combinación vendible con su propio precio/stock/sku
- `variante_atributos` = tabla puente que dice qué valor de cada atributo tiene cada variante
- `fotos` = 1 a 3 por variante (o por producto si no aplica variantes), con `orden` para el carrusel
- Para productos SIN variantes reales (un solo SKU), simplemente se crea 1 sola fila en `variantes` sin atributos asociados.

---

## LA APP: CAPTURA Y ORGANIZACIÓN DE FOTOS DE PRODUCTO (PWA mobile-first)

### Objetivo
App web optimizada para celular (PWA instalable, sin necesidad de Play Store), usada en el piso de la tienda para fotografiar y registrar productos lo más rápido posible. Debe minimizar taps y tiempo de espera. Es la única app de este proyecto.

### Autenticación
- Login simple con Supabase Auth (email + password). Sin registro público — yo creo manualmente los usuarios (mi cuenta + 1-2 ayudantes) desde el dashboard de Supabase.
- Sesión persistente (no pedir login cada vez que se abre la app).

### Flujo principal (optimizado para velocidad)

**Pantalla 1 — Inicio / Buscar o crear producto**
- Campo de búsqueda con autocompletado sobre productos ya existentes (para no duplicar "Vela" si ya existe).
- Botón grande "+ Nuevo producto" si no existe.
- Lista reciente de productos editados (para continuar trabajo).

**Pantalla 2 — Detalle de producto**
- Si es producto nuevo: campo nombre, descripción (opcional), selector de categoría (dropdown, con opción de crear categoría nueva inline).
- Si el producto es nuevo, ofrecer definir sus "atributos" (ejes de variación): UI simple tipo chips para agregar atributos (ej: escribir "Tamaño" → agregar valores "Grande", "Mediano", "Pequeño" como chips). Esto debe ser opcional — un producto puede no tener variantes.
- Lista de variantes existentes del producto, cada una mostrando sus atributos + precio + miniaturas de fotos ya cargadas.
- Botón "+ Nueva variante".

**Pantalla 3 — Captura de variante**
- Si el producto tiene atributos definidos: mostrar un dropdown por cada atributo (ej: Tamaño: [Grande/Mediano/Pequeño], Color: [...], Propósito: [...]) — selección obligatoria de un valor por atributo antes de continuar.
- Campo de precio (numérico, teclado numérico del celular).
- Captura de fotos: hasta 3 slots de foto. Cada slot abre la cámara nativa del celular directamente (usar `<input type="file" accept="image/*" capture="environment">` para evitar fricción de UI custom de cámara). Mostrar miniatura inmediatamente tras tomar la foto.
- Botón "Guardar variante" — debe guardar y volver a Pantalla 2 (detalle de producto), permitiendo agregar la siguiente variante rápidamente sin tener que re-navegar.

**Pantalla 4 — Exportar datos**
- Botón "Exportar a Excel/CSV" accesible desde el inicio (no enterrado en un menú).
- Genera un archivo descargable con una fila por variante, columnas: nombre de producto, categoría, cada atributo como columna propia (ej: Tamaño, Color, Propósito), precio, SKU, y las URLs públicas de sus fotos (foto_1, foto_2, foto_3).
- Esto sirve tanto para revisar el trabajo de campo como para tener un respaldo legible fuera de Supabase, y será el insumo de entrada el día que se construya la web del catálogo (proyecto aparte).
- Usar `papaparse` para generar CSV, o `xlsx` (SheetJS) si prefieres salida `.xlsx` directamente — usa xlsx si es fácil, ya que abre mejor en Excel con columnas correctas.

### Manejo de fotos
- Antes de subir a Supabase Storage, redimensionar en el cliente (canvas API) a máximo 1600px en el lado más largo, comprimiendo a calidad ~0.82 JPEG. Esto reduce tiempo de subida y espacio sin pérdida visible para uso futuro en web.
- Generar también un thumbnail de 400px para visualización rápida dentro de la misma app de captura (listados, miniaturas).
- Guardar tanto la imagen grande como el thumbnail en el bucket `catalogo-fotos`, con paths organizados así: `catalogo-fotos/{producto_id}/{variante_id}/{orden}_full.jpg` y `.../{orden}_thumb.jpg`.
- Subir con manejo de reintentos — si fallan por mala señal, encolar localmente (IndexedDB) y reintentar cuando vuelva la conexión. Mostrar indicador de "pendiente de subir" si hay fotos en cola.

### PWA / Offline
- Configurar como PWA instalable (manifest.json + service worker via `vite-plugin-pwa`).
- Cache de assets estáticos para que la app cargue aunque no haya señal.
- Cola de subida offline para fotos y datos de variantes (usar IndexedDB, ej. con `idb` o `dexie`), sincronizando en background cuando vuelva la conexión.

### Validaciones importantes
- No permitir guardar una variante sin al menos 1 foto.
- No permitir variantes duplicadas (misma combinación exacta de atributos para el mismo producto) — verificar antes de guardar y avisar si ya existe.
- Precio no puede ser negativo ni vacío.

---

## ESTRUCTURA DE CARPETAS SUGERIDA

```
catalogo-captura/
├── src/
│   ├── components/
│   ├── screens/         # Inicio, DetalleProducto, CapturaVariante, Exportar
│   ├── lib/              # cliente Supabase, utilidades de imagen, cola offline
│   └── types/            # tipos TypeScript (Producto, Variante, Foto, Atributo)
├── public/
│   └── manifest.json
├── supabase/
│   └── schema.sql
├── .env.example
└── package.json
```

Un solo proyecto Vite, sin monorepo — no hace falta esa complejidad para una sola app.

---

## ORDEN DE TRABAJO SUGERIDO

1. Confirmar conmigo el archivo `supabase/schema.sql` y que yo lo ejecute en mi proyecto Supabase.
2. Crear el bucket `catalogo-fotos` en Supabase Storage (público) y sus políticas — dame las instrucciones exactas o el SQL si es posible vía CLI.
3. Armar el flujo de Pantallas 1-3 (buscar/crear producto → variante → fotos) — esto es lo crítico, ya que sin esto no hay nada que exportar.
4. Una vez el flujo de captura funcione, agregar la Pantalla 4 (exportación CSV/Excel).
5. Configurar variables de entorno (`.env`) para `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` — yo las voy a pegar manualmente, indícame dónde.
6. Preparar para deploy en Vercel.

---

## PREGUNTAS QUE DEBES HACERME ANTES DE EMPEZAR A CODEAR (si no las he respondido ya)

- ¿Tengo ya cuenta de Supabase creada, o hay que guiarme para crearla?
- ¿Cuántos usuarios (ayudantes) necesito crear en Supabase Auth para la app?
- ¿Exportar como `.xlsx` directo, o `.csv` es suficiente?

Empieza por confirmar el plan conmigo en 3-5 líneas antes de generar código, y luego procede paso a paso.
