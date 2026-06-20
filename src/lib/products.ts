import { supabase } from './supabase';
import {
  Categoria,
  Producto,
  AtributoDefinicion,
  AtributoValor,
  Variante,
  VarianteAtributo,
  Foto,
  ProductoConVariantes,
  VarianteConDetalles,
  CatalogoFila,
} from '@/types';

export async function searchProductos(search: string): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .or(`nombre.ilike.%${search}%,descripcion.ilike.%${search}%`)
    .eq('activo', true)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

export async function getCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden');

  if (error) throw error;
  return data || [];
}

export async function createCategoria(nombre: string): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre, orden: 0 })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createProducto(
  nombre: string,
  categoria_id: string | null,
  descripcion?: string
): Promise<Producto> {
  const { data, error } = await supabase
    .from('productos')
    .insert({
      nombre,
      descripcion,
      categoria_id,
      activo: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProductoConVariantes(
  productoId: string
): Promise<ProductoConVariantes | null> {
  const { data: producto, error: productError } = await supabase
    .from('productos')
    .select('*')
    .eq('id', productoId)
    .single();

  if (productError) throw productError;
  if (!producto) return null;

  const { data: atributos, error: atributosError } = await supabase
    .from('atributos_definicion')
    .select('*')
    .eq('producto_id', productoId)
    .order('orden');

  if (atributosError) throw atributosError;

  const { data: variantes, error: variantesError } = await supabase
    .from('variantes')
    .select('*')
    .eq('producto_id', productoId)
    .eq('activo', true);

  if (variantesError) throw variantesError;

  const variantesConDetalles: VarianteConDetalles[] = await Promise.all(
    (variantes || []).map(async (v) => {
      const fotos = await getFotosVariante(v.id);
      const atributosValores = await getAtributosVariante(v.id);

      return {
        ...v,
        atributos: atributosValores,
        fotos,
      };
    })
  );

  return {
    ...producto,
    atributos_definicion: atributos || [],
    variantes: variantesConDetalles,
  };
}

export async function addAtributoDefinicion(
  producto_id: string,
  nombre_atributo: string,
  orden: number = 0
): Promise<AtributoDefinicion> {
  const { data, error } = await supabase
    .from('atributos_definicion')
    .insert({
      producto_id,
      nombre_atributo,
      orden,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addAtributoValor(
  atributo_id: string,
  valor: string,
  orden: number = 0
): Promise<AtributoValor> {
  const { data, error } = await supabase
    .from('atributos_valores')
    .insert({
      atributo_id,
      valor,
      orden,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAtributosDefinicionProducto(
  producto_id: string
): Promise<AtributoDefinicion[]> {
  const { data, error } = await supabase
    .from('atributos_definicion')
    .select('*')
    .eq('producto_id', producto_id)
    .order('orden');

  if (error) throw error;
  return data || [];
}

export async function getValoresAtributo(
  atributo_id: string
): Promise<AtributoValor[]> {
  const { data, error } = await supabase
    .from('atributos_valores')
    .select('*')
    .eq('atributo_id', atributo_id)
    .order('orden');

  if (error) throw error;
  return data || [];
}

export async function createVariante(
  producto_id: string,
  precio: number,
  sku?: string,
  atributosMap?: Record<string, string>
): Promise<Variante> {
  const { data, error } = await supabase
    .from('variantes')
    .insert({
      producto_id,
      precio,
      sku,
      activo: true,
    })
    .select()
    .single();

  if (error) throw error;

  if (atributosMap) {
    await linkVarianteAtributos(data.id, producto_id, atributosMap);
  }

  return data;
}

async function linkVarianteAtributos(
  variante_id: string,
  producto_id: string,
  atributosMap: Record<string, string>
): Promise<void> {
  const atributos = await getAtributosDefinicionProducto(producto_id);

  for (const atributo of atributos) {
    const valor = atributosMap[atributo.nombre_atributo];
    if (!valor) continue;

    const { data: valoresData, error: valoresError } = await supabase
      .from('atributos_valores')
      .select('id')
      .eq('atributo_id', atributo.id)
      .eq('valor', valor)
      .single();

    if (valoresError) throw valoresError;
    if (!valoresData) {
      throw new Error(`Valor "${valor}" no existe para atributo`);
    }

    const { error: linkError } = await supabase
      .from('variante_atributos')
      .insert({
        variante_id,
        atributo_id: atributo.id,
        valor_id: valoresData.id,
      });

    if (linkError) throw linkError;
  }
}

export async function getAtributosVariante(
  variante_id: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('variante_atributos')
    .select(`
      atributo_id,
      atributos_definicion(nombre_atributo),
      atributos_valores(valor)
    `)
    .eq('variante_id', variante_id);

  if (error) throw error;

  const resultado: Record<string, string> = {};
  (data || []).forEach((item: any) => {
    const atributoNombre = item.atributos_definicion?.nombre_atributo;
    const valor = item.atributos_valores?.valor;
    if (atributoNombre && valor) {
      resultado[atributoNombre] = valor;
    }
  });

  return resultado;
}

export async function uploadFoto(
  variante_id: string,
  orden: number,
  fullBlob: Blob,
  thumbBlob: Blob,
  dimensions: { width: number; height: number },
  producto_id: string
): Promise<Foto> {
  const fullPath = `${producto_id}/${variante_id}/${orden}_full.jpg`;
  const thumbPath = `${producto_id}/${variante_id}/${orden}_thumb.jpg`;

  const { error: fullError } = await supabase.storage
    .from('catalogo-fotos')
    .upload(fullPath, fullBlob, { upsert: true });

  if (fullError) throw fullError;

  const { error: thumbError } = await supabase.storage
    .from('catalogo-fotos')
    .upload(thumbPath, thumbBlob, { upsert: true });

  if (thumbError) throw thumbError;

  const publicUrl = supabase.storage
    .from('catalogo-fotos')
    .getPublicUrl(fullPath).data.publicUrl;

  const { data: foto, error: dbError } = await supabase
    .from('fotos')
    .insert({
      variante_id,
      storage_path: fullPath,
      url_publica: publicUrl,
      orden,
      ancho: dimensions.width,
      alto: dimensions.height,
      tamano_bytes: fullBlob.size,
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return foto;
}

export async function getFotosVariante(variante_id: string): Promise<Foto[]> {
  const { data, error } = await supabase
    .from('fotos')
    .select('*')
    .eq('variante_id', variante_id)
    .order('orden');

  if (error) throw error;
  return data || [];
}

export async function getCatalogCompleto(): Promise<CatalogoFila[]> {
  const { data, error } = await supabase
    .from('catalogo_completo')
    .select('*');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    producto_id: row.producto_id,
    producto_nombre: row.producto_nombre,
    producto_descripcion: row.producto_descripcion,
    categoria: row.categoria,
    variante_id: row.variante_id,
    sku: row.sku,
    precio: row.precio,
    precio_oferta: row.precio_oferta,
    stock: row.stock,
    atributos: row.atributos || {},
    fotos: row.fotos ? row.fotos.map((f: any) => ({
      url: f.url,
      orden: f.orden,
    })) : [],
  }));
}
