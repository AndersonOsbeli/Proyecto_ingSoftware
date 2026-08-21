export interface ActividadDiaria {
  id: string;
  fecha: string;
  horaRegistro: string;
  usuario: string;
  usuarioId: string;
  titulo: string;
  descripcion: string;
  fechaRegistro: string;
}

export interface DiaCalendario {
  fecha: string;
  dia: number;
  esHoy: boolean;
  esMesActual: boolean;
  tieneActividades: boolean;
  cantidadActividades: number;
}

export interface FiltrosReporte {
  fechaInicio?: string;
  fechaFin?: string;
  usuarioId?: string;
}

export const STORAGE_KEYS_ACTIVIDADES = {
  actividades: 'sg_actividades_diarias'
} as const;