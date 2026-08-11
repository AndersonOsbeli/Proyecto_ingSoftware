import { createStore, genId, nowISO } from '../../lib/store';
import { Ausencia, EstadoAusencia, STORAGE_KEYS } from './types';

export const ausenciasStore = createStore<Ausencia[]>(STORAGE_KEYS.ausencias, () => []);

export function registrar(data: Omit<Ausencia, 'id' | 'estado' | 'aprobadoPor' | 'fechaAprobacion' | 'fechaRegistro'>): Ausencia {
  const nueva: Ausencia = {
    ...data, id: genId(), estado: 'pendiente',
    aprobadoPor: null, fechaAprobacion: null,
    fechaRegistro: nowISO()
  };
  ausenciasStore.set([...getAll(), nueva]);
  return nueva;
}

export function getAll(): Ausencia[] {
  return ausenciasStore.get();
}

export function getByEmpleado(empleadoId: string): Ausencia[] {
  return getAll().filter((a) => a.empleadoId === empleadoId);
}

export function getByFecha(fecha: string): Ausencia[] {
  return getAll().filter((a) => a.fecha === fecha);
}

export function getPendientes(): Ausencia[] {
  return getAll().filter((a) => a.estado === 'pendiente');
}

export function aprobar(id: string, aprobadoPor: string, observaciones: string): void {
  updateEstado(id, 'aprobada', aprobadoPor, observaciones);
}

export function rechazar(id: string, aprobadoPor: string, observaciones: string): void {
  updateEstado(id, 'rechazada', aprobadoPor, observaciones);
}

function updateEstado(id: string, estado: EstadoAusencia, aprobadoPor: string, observaciones: string): void {
  ausenciasStore.set(getAll().map((a) =>
    a.id === id ? { ...a, estado, aprobadoPor, fechaAprobacion: nowISO(), observacionesAprobacion: observaciones } : a
  ));
}
