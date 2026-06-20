export async function compressImage(
  file: File,
  maxWidth: number = 1600,
  quality: number = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto de canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));

      const result = event.target?.result;
      if (typeof result === 'string') {
        img.src = result;
      }
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

export async function createThumbnail(
  file: File,
  maxWidth: number = 400,
  quality: number = 0.82
): Promise<Blob> {
  return compressImage(file, maxWidth, quality);
}

export async function getImageDimensions(
  blob: Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));

      const result = event.target?.result;
      if (typeof result === 'string') {
        img.src = result;
      }
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(blob);
  });
}
