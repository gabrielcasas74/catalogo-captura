-- ============================================================
-- CATÁLOGO TIENDA - Schema Supabase
-- Productos con variantes (tamaño/color/propósito/etc) + fotos
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- TABLA: categorias
-- ------------------------------------------------------------
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  orden int default 0,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- TABLA: productos (el "padre" — ej: "Vela")
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- TABLA: atributos_definicion
-- Define QUÉ tipos de variante existen por producto
-- (ej: para "Vela" → tamaño, color, propósito)
-- Esto permite que cada producto tenga sus propios ejes de variación
-- sin necesidad de columnas fijas en la tabla de variantes.
-- ------------------------------------------------------------
create table atributos_definicion (
  id uuid primary key default uuid_generate_v4(),
  producto_id uuid not null references productos(id) on delete cascade,
  nombre_atributo text not null,        -- ej: "tamaño", "color", "propósito"
  orden int default 0,
  created_at timestamptz default now(),
  unique (producto_id, nombre_atributo)
);

-- ------------------------------------------------------------
-- TABLA: atributos_valores
-- Lista cerrada de valores posibles por atributo
-- (ej: tamaño → grande/mediano/pequeño)
-- Esto es lo que llena los dropdowns en la app de captura,
-- evitando texto libre y typos ("Berde" vs "Verde").
-- ------------------------------------------------------------
create table atributos_valores (
  id uuid primary key default uuid_generate_v4(),
  atributo_id uuid not null references atributos_definicion(id) on delete cascade,
  valor text not null,
  orden int default 0,
  created_at timestamptz default now(),
  unique (atributo_id, valor)
);

-- ------------------------------------------------------------
-- TABLA: variantes
-- Cada combinación vendible de un producto (con su propio precio)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- TABLA: variante_atributos
-- Tabla puente: qué valor de cada atributo tiene esta variante
-- (ej: variante X → tamaño=Grande, color=Verde, propósito=Dinero)
-- ------------------------------------------------------------
create table variante_atributos (
  id uuid primary key default uuid_generate_v4(),
  variante_id uuid not null references variantes(id) on delete cascade,
  atributo_id uuid not null references atributos_definicion(id) on delete cascade,
  valor_id uuid not null references atributos_valores(id) on delete restrict,
  unique (variante_id, atributo_id)
);

create index idx_variante_atributos_variante on variante_atributos(variante_id);

-- ------------------------------------------------------------
-- TABLA: fotos
-- 1 a 3 fotos por variante (o por producto si no hay variantes)
-- ------------------------------------------------------------
create table fotos (
  id uuid primary key default uuid_generate_v4(),
  variante_id uuid references variantes(id) on delete cascade,
  producto_id uuid references productos(id) on delete cascade,
  storage_path text not null,         -- path dentro del bucket de Supabase Storage
  url_publica text,                   -- url pública cacheada (opcional, se puede regenerar)
  orden int default 1,                -- 1, 2, 3 (posición en el carrusel)
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

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
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

-- ------------------------------------------------------------
-- VISTA: catalogo_completo
-- Une producto + variante + atributos + fotos en una sola fila.
-- Útil para revisar datos y para generar la exportación CSV/Excel
-- desde la app de captura.
-- ------------------------------------------------------------
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

-- ============================================================
-- ROW LEVEL SECURITY
-- Esta app es de uso interno (tú + ayudantes autenticados).
-- No hay lectura pública porque todavía no existe una web de
-- catálogo consumiendo estos datos — eso es un proyecto aparte.
-- ============================================================
alter table categorias enable row level security;
alter table productos enable row level security;
alter table atributos_definicion enable row level security;
alter table atributos_valores enable row level security;
alter table variantes enable row level security;
alter table variante_atributos enable row level security;
alter table fotos enable row level security;

-- Acceso completo solo para usuarios autenticados (tú + ayudantes)
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

-- ============================================================
-- STORAGE: bucket para fotos
-- ============================================================
-- Ejecutar esto desde el Dashboard de Supabase (Storage > New bucket)
-- o vía SQL si tienes el extension de storage habilitado:
--
-- insert into storage.buckets (id, name, public)
-- values ('catalogo-fotos', 'catalogo-fotos', true);
--
-- Políticas de Storage (ejecutar después de crear el bucket):
--
-- create policy "lectura_publica_fotos_storage" on storage.objects
--   for select using (bucket_id = 'catalogo-fotos');
--
-- create policy "escritura_autenticada_fotos_storage" on storage.objects
--   for insert with check (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated');
--
-- create policy "borrado_autenticado_fotos_storage" on storage.objects
--   for delete using (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated');

-- ============================================================
-- DATOS DE EJEMPLO (opcional, para probar el flujo)
-- ============================================================
-- insert into categorias (nombre, orden) values ('Velas', 1);
--
-- insert into productos (nombre, descripcion, categoria_id)
-- values ('Vela', 'Vela artesanal', (select id from categorias where nombre = 'Velas'))
-- returning id; -- guardar este id como :producto_id
--
-- insert into atributos_definicion (producto_id, nombre_atributo, orden) values
--   (:producto_id, 'Tamaño', 1),
--   (:producto_id, 'Color', 2),
--   (:producto_id, 'Propósito', 3);
--
-- insert into atributos_valores (atributo_id, valor, orden) values
--   ((select id from atributos_definicion where nombre_atributo='Tamaño' and producto_id=:producto_id), 'Grande', 1),
--   ((select id from atributos_definicion where nombre_atributo='Tamaño' and producto_id=:producto_id), 'Mediano', 2),
--   ((select id from atributos_definicion where nombre_atributo='Tamaño' and producto_id=:producto_id), 'Pequeño', 3),
--   ((select id from atributos_definicion where nombre_atributo='Color' and producto_id=:producto_id), 'Verde', 1),
--   ((select id from atributos_definicion where nombre_atributo='Color' and producto_id=:producto_id), 'Azul', 2),
--   ((select id from atributos_definicion where nombre_atributo='Color' and producto_id=:producto_id), 'Amarillo', 3),
--   ((select id from atributos_definicion where nombre_atributo='Propósito' and producto_id=:producto_id), 'Dinero', 1),
--   ((select id from atributos_definicion where nombre_atributo='Propósito' and producto_id=:producto_id), 'Amor', 2);
