export interface RegistroEntradaSalida {
  id: string;
  nombre: string;
  area: string;
  tipo: 'entrada' | 'salida';
  fecha: string;
  hora: string;
  motivo: string;
  registradoPor: string;
  observaciones: string;
  fotoCapturada?: string;
  empleadoId?: string;
}
