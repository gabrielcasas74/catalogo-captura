import React, { useState, useEffect } from 'react';
import { ArrowLeft, Camera, X, AlertCircle } from 'lucide-react';
import {
  getAtributosDefinicionProducto,
  getValoresAtributo,
  createVariante,
  uploadFoto,
} from '@/lib/products';
import {
  compressImage,
  createThumbnail,
  getImageDimensions,
} from '@/lib/imageCompression';
import { Producto, AtributoDefinicion, AtributoValor, Foto } from '@/types';

interface CaptureVariantScreenProps {
  producto: Producto;
  onBack: () => void;
  onVariantCreated: () => void;
}

interface PhotoUpload {
  orden: number;
  file?: File;
  preview?: string;
  uploading: boolean;
  error?: string;
}

export function CaptureVariantScreen({
  producto,
  onBack,
  onVariantCreated,
}: CaptureVariantScreenProps) {
  const [atributos, setAtributos] = useState<AtributoDefinicion[]>([]);
  const [valoresMap, setValoresMap] = useState<Record<string, AtributoValor[]>>({});
  const [selectedAtributos, setSelectedAtributos] = useState<Record<string, string>>({});
  const [precio, setPrecio] = useState('');
  const [fotos, setFotos] = useState<PhotoUpload[]>([
    { orden: 1, uploading: false },
    { orden: 2, uploading: false },
    { orden: 3, uploading: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAtributos();
  }, [producto.id]);

  async function loadAtributos() {
    setLoading(true);
    try {
      const attrs = await getAtributosDefinicionProducto(producto.id);
      setAtributos(attrs);

      const vMap: Record<string, AtributoValor[]> = {};
      for (const attr of attrs) {
        vMap[attr.id] = await getValoresAtributo(attr.id);
      }
      setValoresMap(vMap);
    } catch (err: any) {
      setError(err.message || 'Error al cargar atributos');
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoCapture(orden: number, file: File) {
    if (file.type && !file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen');
      return;
    }

    const newFotos = [...fotos];
    const fotoIndex = newFotos.findIndex((f) => f.orden === orden);

    if (fotoIndex >= 0) {
      newFotos[fotoIndex].file = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        newFotos[fotoIndex].preview = e.target?.result as string;
        setFotos([...newFotos]);
      };
      reader.readAsDataURL(file);
    }
  }

  function removePhoto(orden: number) {
    const newFotos = [...fotos];
    const fotoIndex = newFotos.findIndex((f) => f.orden === orden);
    if (fotoIndex >= 0) {
      newFotos[fotoIndex] = { orden, uploading: false };
      setFotos(newFotos);
    }
  }

  async function handleCreateVariante() {
    // Validaciones
    if (atributos.length > 0) {
      for (const attr of atributos) {
        if (!selectedAtributos[attr.id]) {
          setError(`Selecciona valor para ${attr.nombre_atributo}`);
          return;
        }
      }
    }

    if (!precio.trim() || parseFloat(precio) < 0) {
      setError('Ingresa un precio válido');
      return;
    }

    const fotosConArchivo = fotos.filter((f) => f.file);
    if (fotosConArchivo.length === 0) {
      setError('Al menos debe haber 1 foto');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Construir mapa de atributos con nombres reales
      const atributosNombres: Record<string, string> = {};
      for (const attr of atributos) {
        const selectedId = selectedAtributos[attr.id];
        if (selectedId) {
          const valor = valoresMap[attr.id]?.find((v) => v.id === selectedId);
          if (valor) {
            atributosNombres[attr.nombre_atributo] = valor.valor;
          }
        }
      }

      // Crear variante
      const variante = await createVariante(
        producto.id,
        parseFloat(precio),
        undefined,
        atributosNombres
      );

      // Subir fotos
      for (const foto of fotosConArchivo) {
        const file = foto.file!;

        const fullBlob = await compressImage(file, 1600, 0.82);
        const thumbBlob = await createThumbnail(file, 400, 0.82);
        const dimensions = await getImageDimensions(fullBlob);

        await uploadFoto(
          variante.id,
          foto.orden,
          fullBlob,
          thumbBlob,
          dimensions,
          producto.id
        );
      }

      onVariantCreated();
    } catch (err: any) {
      setError(err.message || 'Error al guardar variante');
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold ml-2">Nueva variante</h1>
      </header>

      <div className="flex-1 p-4 pb-20 max-w-md mx-auto w-full overflow-y-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Atributos */}
        {atributos.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-900">Configuración</h2>
            {atributos.map((attr) => (
              <div key={attr.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {attr.nombre_atributo} *
                </label>
                <select
                  value={selectedAtributos[attr.id] || ''}
                  onChange={(e) => {
                    const newSelected = { ...selectedAtributos };
                    newSelected[attr.id] = e.target.value;
                    setSelectedAtributos(newSelected);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  disabled={submitting}
                >
                  <option value="">Selecciona...</option>
                  {(valoresMap[attr.id] || []).map((val) => (
                    <option key={val.id} value={val.id}>
                      {val.valor}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Precio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Precio *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            disabled={submitting}
            inputMode="decimal"
          />
        </div>

        {/* Fotos */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Fotos (1-3) *</h2>
          <div className="space-y-3">
            {fotos.map((foto) => (
              <div key={foto.orden} className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {foto.preview ? (
                  <div className="relative">
                    <img
                      src={foto.preview}
                      alt={`Foto ${foto.orden}`}
                      className="w-full h-40 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(foto.orden)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                      disabled={submitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block text-center cursor-pointer py-4 hover:bg-gray-50 rounded transition">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">Foto {foto.orden}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoCapture(foto.orden, file);
                      }}
                      disabled={submitting}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleCreateVariante}
          disabled={submitting}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 mt-6"
        >
          {submitting ? 'Guardando...' : 'Guardar variante'}
        </button>
      </div>
    </div>
  );
}
