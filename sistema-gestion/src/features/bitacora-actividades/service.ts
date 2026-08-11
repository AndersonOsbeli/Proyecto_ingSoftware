import { createStore, genId, nowISO } from '../../lib/store';
import { ActividadDiaria, STORAGE_KEYS_ACTIVIDADES } from './types';

const KEY = STORAGE_KEYS_ACTIVIDADES.actividades;

export const actividadesStore = createStore<ActividadDiaria[]>(KEY, () => []);

export function registrar(data: Omit<ActividadDiaria, 'id' | 'fechaRegistro'>): ActividadDiaria {
  const nueva: ActividadDiaria = {
    ...data,
    id: genId(),
    fechaRegistro: nowISO()
  };
  actividadesStore.set([...actividadesStore.get(), nueva]);
  return nueva;
}

export function getAll(): ActividadDiaria[] {
  return actividadesStore.get();
}

export function getByFecha(fecha: string): ActividadDiaria[] {
  return actividadesStore.get().filter((a) => a.fecha === fecha);
}

export function getByRango(fechaInicio: string, fechaFin: string): ActividadDiaria[] {
  return actividadesStore.get().filter((a) => a.fecha >= fechaInicio && a.fecha <= fechaFin);
}

export function getByUsuario(usuarioId: string): ActividadDiaria[] {
  return actividadesStore.get().filter((a) => a.usuarioId === usuarioId);
}

export function getByFiltros(filtros: { fechaInicio?: string; fechaFin?: string; usuarioId?: string }): ActividadDiaria[] {
  return actividadesStore.get().filter((a) => {
    if (filtros.fechaInicio && a.fecha < filtros.fechaInicio) return false;
    if (filtros.fechaFin && a.fecha > filtros.fechaFin) return false;
    if (filtros.usuarioId && a.usuarioId !== filtros.usuarioId) return false;
    return true;
  });
}

export function getFechasConActividades(mes: number, anio: number): Map<string, number> {
  const mapa = new Map<string, number>();
  const prefijo = `${anio}-${(mes + 1).toString().padStart(2, '0')}`;
  actividadesStore.get().forEach((a) => {
    if (a.fecha.startsWith(prefijo)) {
      mapa.set(a.fecha, (mapa.get(a.fecha) || 0) + 1);
    }
  });
  return mapa;
}

export function eliminar(id: string): void {
  actividadesStore.set(actividadesStore.get().filter((a) => a.id !== id));
}
