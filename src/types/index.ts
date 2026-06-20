export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria_id?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AtributoDefinicion {
  id: string;
  producto_id: string;
  nombre_atributo: string;
  orden: number;
  created_at: string;
}

export interface AtributoValor {
  id: string;
  atributo_id: string;
  valor: string;
  orden: number;
  created_at: string;
}

export interface Variante {
  id: string;
  producto_id: string;
  sku?: string;
  precio: number;
  precio_oferta?: number;
  stock?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VarianteAtributo {
  id: string;
  variante_id: string;
  atributo_id: string;
  valor_id: string;
}

export interface Foto {
  id: string;
  variante_id?: string;
  producto_id?: string;
  storage_path: string;
  url_publica?: string;
  orden: number;
  ancho?: number;
  alto?: number;
  tamano_bytes?: number;
  subida_por?: string;
  created_at: string;
}

export interface VarianteConDetalles extends Variante {
  atributos: Record<string, string>;
  fotos: Foto[];
}

export interface ProductoConVariantes extends Producto {
  atributos_definicion: AtributoDefinicion[];
  variantes: VarianteConDetalles[];
}

export interface QueuedPhoto {
  id: string;
  variante_id: string;
  file: Blob;
  orden: number;
  timestamp: number;
}

export interface QueuedVariante {
  id: string;
  producto_id: string;
  sku?: string;
  precio: number;
  atributos: Record<string, string>;
  fotos: QueuedPhoto[];
  timestamp: number;
}

export interface CatalogoFila {
  producto_id: string;
  producto_nombre: string;
  producto_descripcion?: string;
  categoria?: string;
  variante_id: string;
  sku?: string;
  precio: number;
  precio_oferta?: number;
  stock?: number;
  atributos: Record<string, string>;
  fotos: Array<{ url: string; orden: number }>;
}
