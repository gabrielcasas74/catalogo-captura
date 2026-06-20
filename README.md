# Catálogo Captura

App web de captura y organización de fotos de productos para catálogo. PWA mobile-first optimizada para trabajo de campo.

## Setup

### 1. Variables de entorno

Copia `.env.example` a `.env` e ingresa tus credenciales de Supabase:

```bash
cp .env.example .env
```

Edita `.env` con:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Encuentra estas valores en tu dashboard de Supabase → Settings → API.

### 2. Crear bucket en Supabase Storage

En Supabase Dashboard → Storage:

1. Crea un bucket llamado `catalogo-fotos`
2. Hazlo **público**
3. Configura estas políticas SQL:

```sql
create policy "lectura_publica_fotos_storage" on storage.objects
  for select using (bucket_id = 'catalogo-fotos');

create policy "escritura_autenticada_fotos_storage" on storage.objects
  for insert with check (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated');

create policy "borrado_autenticado_fotos_storage" on storage.objects
  for delete using (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated');
```

### 3. Ejecutar schema SQL

En Supabase → SQL Editor, ejecuta el contenido de `supabase/schema.sql` completo.

### 4. Crear usuarios

En Supabase → Authentication → Users, crea los usuarios que usarán la app (tu email + ayudante).

### 5. Instalar dependencias

```bash
npm install
```

### 6. Ejecutar en desarrollo

```bash
npm run dev
```

Se abrirá en http://localhost:5173

### 7. Build para producción

```bash
npm run build
```

El resultado estará en `dist/`.

## Deployment en Vercel

1. Sube el repo a GitHub
2. En Vercel → New Project → Import tu repo
3. Configura las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

## Características

- **Búsqueda/creación rápida** de productos
- **Definición dinámica** de atributos por producto (Tamaño, Color, Propósito, etc.)
- **Captura de fotos** directa desde celular (hasta 3 por variante)
- **Compresión automática** de imágenes (1600px max)
- **Exportación a Excel** con todas las variantes, atributos y URLs de fotos
- **PWA instalable** en celular, funciona offline
- **Autenticación** vía Supabase (email + password)

## Flujo de uso

1. **Inicio** → Buscar producto existente o crear uno nuevo
2. **Detalle de producto** → Ver variantes, definir atributos
3. **Captura de variante** → Seleccionar atributos, ingresar precio, tomar fotos
4. **Exportar** → Descargar Excel con todo el catálogo

## Datos guardados

- Toda la información se almacena en Supabase (PostgreSQL)
- Las fotos se guardan en Supabase Storage (bucket público)
- Estructura optimizada para catálogo web (1000+ productos)
- View `catalogo_completo` para exportación directa
