# Instrucciones de Setup - Catálogo Captura

## ✅ Lo que ya está hecho

- ✅ Estructura completa de proyecto Vite + React + TypeScript
- ✅ Componentes para todas las pantallas (Home, Crear Producto, Detalle, Captura, Exportar)
- ✅ Servicios Supabase (autenticación, productos, variantes, fotos)
- ✅ Compresión de imágenes cliente-side (canvas API)
- ✅ Exportación a Excel (XLSX)
- ✅ PWA con Manifest y Service Worker
- ✅ Tailwind CSS configurado
- ✅ Schema SQL completo (con RLS policies)

## 📋 Pasos que TÚ debes hacer

### PASO 1: Obtener credenciales de Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. **Settings** → **API** (en la barra izquierda)
3. Copia:
   - `Project URL` → será `VITE_SUPABASE_URL`
   - `anon public` key → será `VITE_SUPABASE_ANON_KEY`

### PASO 2: Crear archivo `.env`

En la raíz del proyecto, crea `.env` con:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

(Reemplaza con tus valores reales)

### PASO 3: Ejecutar schema SQL en Supabase

1. Ve a **SQL Editor** en Supabase
2. Abre un nuevo query
3. **Copia TODO el contenido** de `supabase/schema.sql`
4. Pégalo en el editor SQL
5. Presiona **RUN** (▶)

⚠️ Esto creará todas las tablas, índices, triggers y policies.

### PASO 4: Crear bucket en Supabase Storage

1. Ve a **Storage** en Supabase
2. Presiona **+ New bucket**
3. Nombre: `catalogo-fotos`
4. Marca **Public bucket** ✓
5. Crea

#### Configurar políticas del bucket

En **Storage** → **catalogo-fotos** → **Policies**:

Presiona **+ New Policy** → **For authenticated users** y agrega estas 3 políticas:

**Política 1: Lectura pública**
```
SELECT (from storage.objects)
where bucket_id = 'catalogo-fotos'
```
✓ Grant

**Política 2: Inserción solo autenticados**
```
INSERT (to storage.objects)
with check (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated')
```
✓ Grant

**Política 3: Borrado solo autenticados**
```
DELETE (from storage.objects)
using (bucket_id = 'catalogo-fotos' and auth.role() = 'authenticated')
```
✓ Grant

### PASO 5: Crear usuarios en Supabase Auth

1. Ve a **Authentication** → **Users** en Supabase
2. Presiona **+ New user**
3. Email: `tu@email.com` | Password: `[genera uno fuerte]` | Auto confirm email
4. ✓ Create user
5. Repite con el email de tu ayudante

### PASO 6: Instalar y ejecutar localmente

En la carpeta del proyecto:

```bash
npm install
npm run dev
```

Se abrirá en http://localhost:5173

Prueba con el email/password que creaste en Paso 5.

### PASO 7: Deploy en Vercel (opcional, pero recomendado)

1. Sube el código a GitHub
2. Ve a https://vercel.com
3. **New Project** → Importa tu repo de GitHub
4. **Environment Variables** → Agrega:
   - `VITE_SUPABASE_URL` = tu URL
   - `VITE_SUPABASE_ANON_KEY` = tu key
5. **Deploy**

Vercel te dará una URL pública. Puedes acceder desde cualquier celular.

---

## 🎯 Flujo de uso (para ti + ayudante)

1. **Abrir app** → Login con credenciales
2. **Buscar o crear producto** (ej: "Vela")
3. **Definir variantes** (Tamaño, Color, Propósito) - solo 1 vez por producto
4. **Para cada variante:**
   - Seleccionar valores (Grande, Verde, Dinero)
   - Ingresar precio
   - Tomar 1-3 fotos con celular
   - Guardar
5. **Cuando termines de fotografiar** → Exportar a Excel
6. Excel tendrá todas las variantes con URLs de fotos listas para tu sitio web

---

## ❓ Troubleshooting

### "Faltan variables de entorno"
→ Revisa que `.env` esté en la raíz y tenga los dos valores correctos

### "Auth policy error" o "Permission denied"
→ Revisa que ejecutaste TODO el schema.sql (incluyendo las policies)

### "Fotos no se suben"
→ Revisa que el bucket `catalogo-fotos` exista y sea PÚBLICO

### "Cannot read property 'id' of null"
→ El usuario no está creado en Supabase Auth o sus credenciales son incorrectas

---

## 📁 Estructura del proyecto

```
├── src/
│   ├── components/       # AuthContext
│   ├── lib/              # Servicios (Supabase, imágenes, exportación)
│   ├── screens/          # Pantallas (Login, Home, Detail, Capture, Export)
│   ├── types/            # TypeScript interfaces
│   ├── App.tsx           # Navegación principal
│   ├── main.tsx          # Punto de entrada
│   └── index.css         # Tailwind
├── supabase/
│   └── schema.sql        # SQL para ejecutar en Supabase
├── public/
│   └── manifest.json     # Configuración PWA
├── .env.example          # Template de variables de entorno
├── vite.config.ts        # Configuración Vite + PWA
└── package.json
```

---

## 🚀 Próximos pasos (opcional, para después)

- Agregar edición/borrado de variantes
- Agregar historial de cambios
- Agregar modo offline queue mejorado
- Agregar métricas (cantidad de fotos subidas, etc.)
- Sincronizar con tu sitio web de catálogo (proyecto aparte)

---

**¿Preguntas?** Revisa el README.md o los comentarios en el código (especialmente en `src/lib/products.ts`).
