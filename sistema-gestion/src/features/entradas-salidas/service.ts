import { createStore, genId } from '../../lib/store';
import { RegistroEntradaSalida } from './types';

const STORAGE_KEY = 'sg_entradas_salidas';

export const registrosStore = createStore<RegistroEntradaSalida[]>(STORAGE_KEY, () => []);

export function getAll(): RegistroEntradaSalida[] {
  return registrosStore.get();
}

export function add(registro: Omit<RegistroEntradaSalida, 'id'>): void {
  const nuevo: RegistroEntradaSalida = { ...registro, id: genId() };
  registrosStore.set([...getAll(), nuevo]);
}

export function eliminar(id: string): void {
  registrosStore.set(getAll().filter((r) => r.id !== id));
}

export function update(id: string, data: Partial<RegistroEntradaSalida>): void {
  registrosStore.set(getAll().map((r) => (r.id === id ? { ...r, ...data } : r)));
}

