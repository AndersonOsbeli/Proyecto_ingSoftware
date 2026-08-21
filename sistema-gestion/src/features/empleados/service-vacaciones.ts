import { createStore, genId, nowISO } from '../../lib/store';
import { Vacacion, BalanceVacaciones, EstadoVacacion, DIAS_VACACIONES_POR_ANIO, STORAGE_KEYS } from './types';

export const vacacionesStore = createStore<Vacacion[]>(STORAGE_KEYS.vacaciones, () => []);
export const balanceStore = createStore<BalanceVacaciones[]>(STORAGE_KEYS.balanceVacaciones, () => []);

export function getBalance(empleadoId: string, anio: number): BalanceVacaciones {
  let bal = balanceStore.get().find((b) => b.empleadoId === empleadoId && b.anio === anio);
  if (!bal) {
    bal = { empleadoId, anio, diasTotales: DIAS_VACACIONES_POR_ANIO, diasUsados: 0, diasPendientes: DIAS_VACACIONES_POR_ANIO };
    balanceStore.set([...balanceStore.get(), bal]);
  }
  return bal;
}

export function solicitar(data: Omit<Vacacion, 'id' | 'estado' | 'aprobadoPor' | 'fechaAprobacion' | 'fechaRegistro'>): Vacacion {
  const nueva: Vacacion = {
    ...data, id: genId(), estado: 'pendiente',
    aprobadoPor: null, fechaAprobacion: null,
    fechaRegistro: nowISO()
  };
  vacacionesStore.set([...getAll(), nueva]);
  return nueva;
}

export function getAll(): Vacacion[] {
  return vacacionesStore.get();
}

export function getByEmpleado(empleadoId: string): Vacacion[] {
  return getAll().filter((v) => v.empleadoId === empleadoId);
}

export function getById(id: string): Vacacion | undefined {
  return getAll().find((v) => v.id === id);
}

export function getPendientes(): Vacacion[] {
  return getAll().filter((v) => v.estado === 'pendiente');
}

export function aprobar(id: string, aprobadoPor: string): void {
  const vac = getById(id);
  if (!vac || vac.estado !== 'pendiente') return;
  const hoy = nowISO();
  updateEstado(id, 'aprobada', aprobadoPor, hoy);
  const bal = getBalance(vac.empleadoId, new Date(vac.fechaInicio).getFullYear());
  balanceStore.set(balanceStore.get().map((b) =>
    b.empleadoId === vac.empleadoId && b.anio === bal.anio
      ? { ...b, diasUsados: b.diasUsados + vac.diasSolicitados, diasPendientes: b.diasPendientes - vac.diasSolicitados }
      : b
  ));
}

export function rechazar(id: string, aprobadoPor: string, observaciones: string): void {
  updateEstado(id, 'rechazada', aprobadoPor, nowISO(), observaciones);
}

export function tieneVacacionesActivas(empleadoId: string, fecha: string): boolean {
  return getAll().some((v) =>
    v.empleadoId === empleadoId &&
    (v.estado === 'aprobada' || v.estado === 'en_curso') &&
    v.fechaInicio <= fecha && v.fechaFin >= fecha
  );
}

export function actualizarEstadoVacaciones(id: string, estado: EstadoVacacion): void {
  updateEstado(id, estado, null, null);
}

function updateEstado(id: string, estado: EstadoVacacion, aprobadoPor: string | null, fechaAprobacion: string | null, observaciones?: string): void {
  vacacionesStore.set(getAll().map((v) =>
    v.id === id ? {
      ...v, estado, aprobadoPor,
      fechaAprobacion,
      observaciones: observaciones ?? v.observaciones
    } : v
  ));
}
