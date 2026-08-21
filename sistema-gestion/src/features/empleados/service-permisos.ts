import { createStore, genId, nowISO } from '../../lib/store';
import { Permiso, EstadoPermiso, STORAGE_KEYS } from './types';

export const permisosStore = createStore<Permiso[]>(STORAGE_KEYS.permisos, () => []);

export function solicitar(data: Omit<Permiso, 'id' | 'estado' | 'aprobadoPor' | 'fechaAprobacion' | 'fechaRegistro'>): Permiso {
  const nuevo: Permiso = {
    ...data, id: genId(), estado: 'pendiente',
    aprobadoPor: null, fechaAprobacion: null,
    fechaRegistro: nowISO()
  };
  permisosStore.set([...getAll(), nuevo]);
  return nuevo;
}

export function getAll(): Permiso[] {
  return permisosStore.get();
}

export function getByEmpleado(empleadoId: string): Permiso[] {
  return getAll().filter((p) => p.empleadoId === empleadoId);
}

export function getById(id: string): Permiso | undefined {
  return getAll().find((p) => p.id === id);
}

export function getPendientes(): Permiso[] {
  return getAll().filter((p) => p.estado === 'pendiente');
}

export function aprobar(id: string, aprobadoPor: string): void {
  updateEstado(id, 'aprobado', aprobadoPor);
}

export function rechazar(id: string, aprobadoPor: string, observaciones: string): void {
  permisosStore.set(getAll().map((p) =>
    p.id === id ? { ...p, estado: 'rechazado' as EstadoPermiso, aprobadoPor, fechaAprobacion: nowISO(), observaciones } : p
  ));
}

export function tienePermisoActivo(empleadoId: string, fecha: string): boolean {
  return getAll().some((p) =>
    p.empleadoId === empleadoId &&
    p.estado === 'aprobado' &&
    p.fechaInicio <= fecha && p.fechaFin >= fecha
  );
}

function updateEstado(id: string, estado: EstadoPermiso, aprobadoPor: string): void {
  permisosStore.set(getAll().map((p) =>
    p.id === id ? { ...p, estado, aprobadoPor, fechaAprobacion: nowISO() } : p
  ));
}
