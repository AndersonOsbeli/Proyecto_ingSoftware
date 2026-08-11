export type MedioSolicitud = 'telefono' | 'correo' | 'presencial';

export interface BitacoraEntry {
  id: string;
  fecha: string;
  hora: string;
  solicitante: string;
  area: string;
  medioSolicitud: MedioSolicitud;
  descripcion: string;
  accionRealizada: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  registradoPor: string;
}

export const MEDIO_LABELS: Record<MedioSolicitud, string> = {
  telefono: 'Telefono',
  correo: 'Correo',
  presencial: 'Presencial'
};

export const MEDIO_ICONS: Record<MedioSolicitud, string> = {
  telefono: 'phone',
  correo: 'email',
  presencial: 'person'
};

export const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En Proceso',
  completado: 'Completado'
};
