import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react';
import {
  getProductoConVariantes,
  getCategorias,
  addAtributoDefinicion,
  addAtributoValor,
} from '@/lib/products';
import {
  Producto,
  Categoria,
  AtributoDefinicion,
  ProductoConVariantes,
} from '@/types';

interface ProductDetailScreenProps {
  producto: Producto;
  onBack: () => void;
  onCreateVariante: (producto: ProductoConVariantes) => void;
  onSelectVariante: (variante: any) => void;
}

export function ProductDetailScreen({
  producto,
  onBack,
  onCreateVariante,
  onSelectVariante,
}: ProductDetailScreenProps) {
  const [productoDetalles, setProductoDetalles] =
    useState<ProductoConVariantes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProductoDetalles();
  }, [producto.id]);

  async function loadProductoDetalles() {
    setLoading(true);
    setError('');
    try {
      const datos = await getProductoConVariantes(producto.id);
      if (datos) {
        setProductoDetalles(datos);
      }

      const cats = await getCategorias();
      setCategorias(cats);
    } catch (err: any) {
      setError(err.message || 'Error al cargar producto');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAttribute() {
    if (!newAttrName.trim() || !newAttrValues.trim()) {
      setError('Ingresa nombre y valores del atributo');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const atributo = await addAtributoDefinicion(
        producto.id,
        newAttrName.trim(),
        (productoDetalles?.atributos_definicion.length || 0) + 1
      );

      const valores = newAttrValues
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      for (let i = 0; i < valores.length; i++) {
        await addAtributoValor(atributo.id, valores[i], i + 1);
      }

      setNewAttrName('');
      setNewAttrValues('');
      setShowAddAttribute(false);

      await loadProductoDetalles();
    } catch (err: any) {
      setError(err.message || 'Error al agregar atributo');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!productoDetalles) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="bg-blue-600 text-white p-4 flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-blue-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold ml-2">Error</h1>
        </header>
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-gray-600">No se pudo cargar el producto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-xl font-bold">{productoDetalles.nombre}</h1>
          {productoDetalles.descripcion && (
            <p className="text-sm text-blue-100">{productoDetalles.descripcion}</p>
          )}
        </div>
      </header>

      <div className="flex-1 p-4 pb-20 max-w-md mx-auto w-full overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Atributos */}
        {productoDetalles.atributos_definicion.length > 0 ? (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Variantes del producto</h2>
            <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-3">
              Este producto tiene {productoDetalles.atributos_definicion.length} eje
              {productoDetalles.atributos_definicion.length !== 1 ? 's' : ''} de
              variación:
              <ul className="mt-2 space-y-1">
                {productoDetalles.atributos_definicion.map((attr) => (
                  <li key={attr.id}>• {attr.nombre_atributo}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Este producto aún no tiene variantes definidas.
            </p>
          </div>
        )}

        {/* Agregar atributo */}
        {!showAddAttribute && (
          <button
            onClick={() => setShowAddAttribute(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 py-3 rounded-lg text-gray-700 hover:border-gray-400 mb-6"
          >
            <Plus className="w-4 h-4" />
            Agregar eje de variación
          </button>
        )}

        {showAddAttribute && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre (ej: Tamaño, Color)
              </label>
              <input
                type="text"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                placeholder="Tamaño"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valores (separados por coma)
              </label>
              <input
                type="text"
                value={newAttrValues}
                onChange={(e) => setNewAttrValues(e.target.value)}
                placeholder="Grande, Mediano, Pequeño"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                disabled={submitting}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAttribute}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowAddAttribute(false);
                  setNewAttrName('');
                  setNewAttrValues('');
                  setError('');
                }}
                disabled={submitting}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-400 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Variantes */}
        {productoDetalles.variantes.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-gray-900 mb-3">
              Variantes guardadas ({productoDetalles.variantes.length})
            </h2>
            <div className="space-y-3">
              {productoDetalles.variantes.map((variante) => (
                <div
                  key={variante.id}
                  onClick={() => onSelectVariante(variante)}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      {Object.entries(variante.atributos).length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(variante.atributos).map(([key, val]) => (
                            <span
                              key={key}
                              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {key}: {val}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="font-medium text-gray-900">
                        ${variante.precio.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {variante.fotos.length} foto{variante.fotos.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {variante.fotos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {variante.fotos.map((foto) => (
                        <img
                          key={foto.id}
                          src={foto.url_publica || ''}
                          alt="Miniatura"
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón nueva variante */}
        <button
          onClick={() => onCreateVariante(productoDetalles)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
          Nueva variante
        </button>
      </div>
    </div>
  );
}
