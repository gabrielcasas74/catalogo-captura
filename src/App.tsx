import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { CreateProductScreen } from '@/screens/CreateProductScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CaptureVariantScreen } from '@/screens/CaptureVariantScreen';
import { ExportScreen } from '@/screens/ExportScreen';
import { Producto, ProductoConVariantes } from '@/types';

type Screen =
  | 'login'
  | 'home'
  | 'createProduct'
  | 'productDetail'
  | 'captureVariant'
  | 'export';

interface ScreenState {
  screen: Screen;
  producto?: Producto;
  productoDetalles?: ProductoConVariantes;
}

export function App() {
  const { user, loading } = useAuth();
  const [screenState, setScreenState] = useState<ScreenState>({
    screen: 'home',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => setScreenState({ screen: 'home' })} />;
  }

  const currentScreen = screenState.screen;

  return (
    <>
      {currentScreen === 'home' && (
        <HomeScreen
          onSelectProducto={(producto) => {
            setScreenState({ screen: 'productDetail', producto });
          }}
          onCreateProducto={() => {
            setScreenState({ screen: 'createProduct' });
          }}
          onExport={() => {
            setScreenState({ screen: 'export' });
          }}
        />
      )}

      {currentScreen === 'createProduct' && (
        <CreateProductScreen
          onBack={() => setScreenState({ screen: 'home' })}
          onProductCreated={(producto) => {
            setScreenState({ screen: 'productDetail', producto });
          }}
        />
      )}

      {currentScreen === 'productDetail' && screenState.producto && (
        <ProductDetailScreen
          producto={screenState.producto}
          onBack={() => setScreenState({ screen: 'home' })}
          onCreateVariante={(productoDetalles) => {
            setScreenState({
              screen: 'captureVariant',
              producto: screenState.producto,
              productoDetalles,
            });
          }}
          onSelectVariante={() => {
            // Por ahora no hay edición de variantes
          }}
        />
      )}

      {currentScreen === 'captureVariant' && screenState.producto && (
        <CaptureVariantScreen
          producto={screenState.producto}
          onBack={() => {
            setScreenState({ screen: 'productDetail', producto: screenState.producto });
          }}
          onVariantCreated={() => {
            setScreenState({ screen: 'productDetail', producto: screenState.producto });
          }}
        />
      )}

      {currentScreen === 'export' && (
        <ExportScreen onBack={() => setScreenState({ screen: 'home' })} />
      )}
    </>
  );
}
