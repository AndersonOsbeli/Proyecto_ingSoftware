import { createStore, genId } from '../../lib/store';
import { BitacoraEntry } from './types';

const STORAGE_KEY = 'sg_bitacora';

export const registrosStore = createStore<BitacoraEntry[]>(STORAGE_KEY, () => []);

export function getAll(): BitacoraEntry[] {
  return registrosStore.get();
}

export function add(entry: Omit<BitacoraEntry, 'id'>): void {
  const nuevo: BitacoraEntry = { ...entry, id: genId() };
  registrosStore.set([...getAll(), nuevo]);
}

export function updateEstado(id: string, estado: BitacoraEntry['estado']): void {
  registrosStore.set(getAll().map((r) => (r.id === id ? { ...r, estado } : r)));
}

export function eliminar(id: string): void {
  registrosStore.set(getAll().filter((r) => r.id !== id));
}
