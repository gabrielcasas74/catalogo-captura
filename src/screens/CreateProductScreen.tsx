import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { createProducto, getCategorias, createCategoria } from '@/lib/products';
import { Producto, Categoria } from '@/types';

interface CreateProductScreenProps {
  onBack: () => void;
  onProductCreated: (producto: Producto) => void;
}

export function CreateProductScreen({
  onBack,
  onProductCreated,
}: CreateProductScreenProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showNewCategoria, setShowNewCategoria] = useState(false);
  const [newCategoriaNombre, setNewCategoriaNombre] = useState('');

  useEffect(() => {
    loadCategorias();
  }, []);

  async function loadCategorias() {
    setLoading(true);
    try {
      const cats = await getCategorias();
      setCategorias(cats);
    } catch (err: any) {
      setError(err.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCategoria() {
    if (!newCategoriaNombre.trim()) {
      setError('Ingresa el nombre de la categoría');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const newCat = await createCategoria(newCategoriaNombre.trim());
      setCategorias([...categorias, newCat]);
      setCategoriaId(newCat.id);
      setNewCategoriaNombre('');
      setShowNewCategoria(false);
    } catch (err: any) {
      setError(err.message || 'Error al crear categoría');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateProducto(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      setError('Ingresa el nombre del producto');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const producto = await createProducto(
        nombre.trim(),
        categoriaId || null,
        descripcion.trim() || undefined
      );

      onProductCreated(producto);
    } catch (err: any) {
      setError(err.message || 'Error al crear producto');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold ml-2">Nuevo producto</h1>
      </header>

      <form
        onSubmit={handleCreateProducto}
        className="flex-1 p-4 pb-20 max-w-md mx-auto w-full space-y-4"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del producto *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Vela, Camisa, Taza"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            disabled={submitting}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Vela artesanal hecha a mano..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría (opcional)
          </label>
          {!showNewCategoria ? (
            <div className="space-y-2">
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={submitting}
              >
                <option value="">Selecciona una categoría...</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategoria(true)}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 py-2 rounded text-gray-700 hover:border-gray-400 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nueva categoría
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newCategoriaNombre}
                onChange={(e) => setNewCategoriaNombre(e.target.value)}
                placeholder="Nombre de la categoría"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                disabled={submitting}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateCategoria}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategoria(false);
                    setNewCategoriaNombre('');
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded text-sm font-medium hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? 'Creando...' : 'Crear producto'}
        </button>
      </form>
    </div>
  );
}
