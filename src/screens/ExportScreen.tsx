import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileDown, AlertCircle, Loader } from 'lucide-react';
import { getCatalogCompleto } from '@/lib/products';
import { exportToXLSX } from '@/lib/export';
import { CatalogoFila } from '@/types';

interface ExportScreenProps {
  onBack: () => void;
}

export function ExportScreen({ onBack }: ExportScreenProps) {
  const [datos, setDatos] = useState<CatalogoFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const catalogo = await getCatalogCompleto();
      setDatos(catalogo);
    } catch (err: any) {
      setError(err.message || 'Error al cargar catálogo');
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    try {
      exportToXLSX(datos);
    } catch (err: any) {
      setError(err.message || 'Error al exportar');
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold ml-2">Exportar catálogo</h1>
      </header>

      <div className="flex-1 p-4 pb-20 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Cargando catálogo...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2 mt-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{error}</p>
              <button
                onClick={loadData}
                className="text-sm underline mt-2 hover:no-underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <FileDown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-bold text-gray-900 mb-1">
                {datos.length} variante{datos.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-600">
                {datos.length > 0
                  ? 'Descarga todos tus datos en Excel'
                  : 'No hay datos para exportar'}
              </p>
            </div>

            {datos.length > 0 && (
              <>
                <div className="space-y-2">
                  <h2 className="font-bold text-gray-900">Productos registrados:</h2>
                  <div className="bg-gray-50 p-3 rounded space-y-2 max-h-48 overflow-y-auto text-sm">
                    {Array.from(
                      new Map(
                        datos.map((d) => [
                          d.producto_id,
                          {
                            nombre: d.producto_nombre,
                            cantidad: datos.filter((x) => x.producto_id === d.producto_id)
                              .length,
                          },
                        ])
                      ).values()
                    ).map((item, idx) => (
                      <div key={idx}>
                        <strong>{item.nombre}</strong> ({item.cantidad} variante
                        {item.cantidad !== 1 ? 's' : ''})
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
                >
                  <FileDown className="w-5 h-5" />
                  Descargar Excel
                </button>
              </>
            )}

            <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-900">
              <p className="font-medium mb-2">ℹ️ Información de exportación:</p>
              <ul className="space-y-1 text-xs">
                <li>
                  • Se exporta 1 fila por variante (nombre del producto,
                  atributos, precio, fotos)
                </li>
                <li>
                  • Las URLs de fotos son públicas y pueden usarse para el sitio
                  web
                </li>
                <li>• Compatible con Excel, Google Sheets y otros programas</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
