import * as XLSX from 'xlsx';
import { CatalogoFila } from '@/types';

export function exportToXLSX(data: CatalogoFila[]): void {
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const allAtributos = new Set<string>();
  data.forEach((fila) => {
    Object.keys(fila.atributos).forEach((key) => allAtributos.add(key));
  });
  const atributosOrdenados = Array.from(allAtributos).sort();

  const rows = data.map((fila) => {
    const row: Record<string, any> = {
      'Producto': fila.producto_nombre,
      'Descripción': fila.producto_descripcion || '',
      'Categoría': fila.categoria || '',
      'SKU': fila.sku || '',
      'Precio': fila.precio,
      'Precio Oferta': fila.precio_oferta || '',
      'Stock': fila.stock || '',
    };

    atributosOrdenados.forEach((attr) => {
      row[attr] = fila.atributos[attr] || '';
    });

    for (let i = 1; i <= 3; i++) {
      const foto = fila.fotos.find((f) => f.orden === i);
      row[`Foto ${i}`] = foto?.url || '';
    }

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const columnWidths = [
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
  ];

  atributosOrdenados.forEach(() => columnWidths.push({ wch: 15 }));

  for (let i = 0; i < 3; i++) {
    columnWidths.push({ wch: 30 });
  }

  ws['!cols'] = columnWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');

  const filename = `catalogo-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportToCSV(data: CatalogoFila[]): void {
  if (data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  const allAtributos = new Set<string>();
  data.forEach((fila) => {
    Object.keys(fila.atributos).forEach((key) => allAtributos.add(key));
  });
  const atributosOrdenados = Array.from(allAtributos).sort();

  const headers = [
    'Producto',
    'Descripción',
    'Categoría',
    'SKU',
    'Precio',
    'Precio Oferta',
    'Stock',
    ...atributosOrdenados,
    'Foto 1',
    'Foto 2',
    'Foto 3',
  ];

  const rows = data.map((fila) => [
    fila.producto_nombre,
    fila.producto_descripcion || '',
    fila.categoria || '',
    fila.sku || '',
    fila.precio,
    fila.precio_oferta || '',
    fila.stock || '',
    ...atributosOrdenados.map((attr) => fila.atributos[attr] || ''),
    fila.fotos.find((f) => f.orden === 1)?.url || '',
    fila.fotos.find((f) => f.orden === 2)?.url || '',
    fila.fotos.find((f) => f.orden === 3)?.url || '',
  ]);

  const csv = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return `"${cell}"`;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `catalogo-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
