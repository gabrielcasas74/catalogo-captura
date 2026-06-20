import Dexie, { Table } from 'dexie';
import { QueuedPhoto, QueuedVariante } from '@/types';

export class CatalogoDB extends Dexie {
  photos!: Table<QueuedPhoto>;
  variantes!: Table<QueuedVariante>;

  constructor() {
    super('CatalogoDB');
    this.version(1).stores({
      photos: '++id, variante_id, timestamp',
      variantes: '++id, producto_id, timestamp',
    });
  }
}

export const db = new CatalogoDB();

export async function addPhotoToQueue(
  variante_id: string,
  file: Blob,
  orden: number
): Promise<string> {
  const id = crypto.randomUUID();
  await db.photos.add({
    id,
    variante_id,
    file,
    orden,
    timestamp: Date.now(),
  });
  return id;
}

export async function getPhotosInQueue(): Promise<QueuedPhoto[]> {
  return db.photos.toArray();
}

export async function removePhotoFromQueue(id: string): Promise<void> {
  await db.photos.delete(id);
}

export async function addVarianteToQueue(
  variante: Omit<QueuedVariante, 'timestamp'>
): Promise<void> {
  await db.variantes.add({
    ...variante,
    timestamp: Date.now(),
  });
}

export async function getVariantesInQueue(): Promise<QueuedVariante[]> {
  return db.variantes.toArray();
}

export async function removeVarianteFromQueue(id: string): Promise<void> {
  await db.variantes.delete(id);
}

export async function clearQueue(): Promise<void> {
  await db.photos.clear();
  await db.variantes.clear();
}
