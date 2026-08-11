import { createStore, genId, nowISO } from '../../lib/store';
import { HorarioLaboral, HorarioAsignacion, HORARIOS_PREDEFINIDOS, STORAGE_KEYS } from './types';

export const horariosStore = createStore<HorarioLaboral[]>(STORAGE_KEYS.horarios, () => []);
export const asignacionesStore = createStore<HorarioAsignacion[]>(STORAGE_KEYS.horarioAsignaciones, () => []);

function inicializarSiVacio(): void {
  if (horariosStore.get().length === 0) {
    const creadoPor = 'Sistema';
    HORARIOS_PREDEFINIDOS.forEach((h) => crear({ ...h, creadoPor }));
  }
}

inicializarSiVacio();

export function crear(data: Omit<HorarioLaboral, 'id' | 'fechaCreacion'>): HorarioLaboral {
  const nuevo: HorarioLaboral = { ...data, id: genId(), fechaCreacion: nowISO() };
  horariosStore.set([...getAllHorarios(), nuevo]);
  return nuevo;
}

export function getAllHorarios(): HorarioLaboral[] {
  return horariosStore.get();
}

export function getHorario(id: string): HorarioLaboral | undefined {
  return horariosStore.get().find((h) => h.id === id);
}

export function updateHorario(id: string, data: Partial<HorarioLaboral>): void {
  horariosStore.set(getAllHorarios().map((h) => (h.id === id ? { ...h, ...data } : h)));
}

export function eliminarHorario(id: string): void {
  horariosStore.set(getAllHorarios().filter((h) => h.id !== id));
  asignacionesStore.set(asignacionesStore.get().filter((a) => a.horarioId !== id));
}

export function asignarEmpleado(
  empleadoId: string, horarioId: string, fechaInicio: string,
  fechaFin: string | null, asignadoPor: string
): HorarioAsignacion {
  const nueva: HorarioAsignacion = {
    id: genId(), empleadoId, horarioId, fechaInicio, fechaFin,
    asignadoPor, fechaAsignacion: nowISO()
  };
  asignacionesStore.set([...asignacionesStore.get(), nueva]);
  return nueva;
}

export function asignarDepartamento(
  departamento: string, horarioId: string, fechaInicio: string,
  fechaFin: string | null, asignadoPor: string, empleadoIds: string[]
): void {
  empleadoIds.forEach((empId) => asignarEmpleado(empId, horarioId, fechaInicio, fechaFin, asignadoPor));
}

export function desasignar(asignacionId: string): void {
  asignacionesStore.set(asignacionesStore.get().filter((a) => a.id !== asignacionId));
}

export function getHorarioActual(empleadoId: string): HorarioLaboral | null {
  const hoy = new Date().toISOString().split('T')[0];
  const asignacion = asignacionesStore.get().find((a) =>
    a.empleadoId === empleadoId &&
    a.fechaInicio <= hoy &&
    (!a.fechaFin || a.fechaFin >= hoy)
  );
  if (!asignacion) return null;
  return getHorario(asignacion.horarioId) || null;
}

export function getAsignacionesByEmpleado(empleadoId: string): HorarioAsignacion[] {
  return asignacionesStore.get().filter((a) => a.empleadoId === empleadoId);
}

export function getAsignacionesByHorario(horarioId: string): HorarioAsignacion[] {
  return asignacionesStore.get().filter((a) => a.horarioId === horarioId);
}

export function getHorariosPredefinidos(): Omit<HorarioLaboral, 'id' | 'creadoPor' | 'fechaCreacion'>[] {
  return HORARIOS_PREDEFINIDOS;
}
