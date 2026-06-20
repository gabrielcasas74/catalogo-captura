import React, { useState, useEffect } from 'react';
import { Plus, Search, LogOut, FileDown } from 'lucide-react';
import { searchProductos } from '@/lib/products';
import { Producto } from '@/types';
import { useAuth } from '@/components/AuthContext';

interface HomeScreenProps {
  onSelectProducto: (producto: Producto) => void;
  onCreateProducto: () => void;
  onExport: () => void;
}

export function HomeScreen({
  onSelectProducto,
  onCreateProducto,
  onExport,
}: HomeScreenProps) {
  const [search, setSearch] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!search.trim()) {
      setResultados([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const datos = await searchProductos(search);
        setResultados(datos);
      } catch (error) {
        console.error('Error al buscar:', error);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Catálogo Captura</h1>
        <button
          onClick={handleSignOut}
          className="p-2 hover:bg-blue-700 rounded-full"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 p-4 pb-20 max-w-md mx-auto w-full">
        <div className="text-xs text-gray-600 mb-4">
          Conectado como: {user?.email}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar producto
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej: Vela, Camisa..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading && (
            <div className="text-center text-gray-600 py-4">Buscando...</div>
          )}

          {!loading && resultados.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
              </p>
              {resultados.map((producto) => (
                <button
                  key={producto.id}
                  onClick={() => onSelectProducto(producto)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <h3 className="font-medium text-gray-900">{producto.nombre}</h3>
                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 mt-1">
                      {producto.descripcion}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {!loading && search && resultados.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                No encontramos "{search}"
              </p>
              <button
                onClick={onCreateProducto}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Crear producto
              </button>
            </div>
          )}

          {!search && (
            <div className="pt-8 space-y-3">
              <button
                onClick={onCreateProducto}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
              >
                <Plus className="w-5 h-5" />
                Nuevo producto
              </button>

              <button
                onClick={onExport}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700"
              >
                <FileDown className="w-5 h-5" />
                Exportar a Excel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
