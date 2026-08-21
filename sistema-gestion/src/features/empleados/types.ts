export type GeneroEmpleado = 'masculino' | 'femenino' | 'otro';
export type EstadoEmpleado = 'activo' | 'inactivo' | 'vacaciones' | 'permiso' | 'suspendido';
export type TipoMarcaje = 'entrada' | 'salida';
export type ResultadoMarcaje = 'exitoso' | 'no_reconocido' | 'empleado_inactivo' | 'en_vacaciones' | 'con_permiso' | 'sin_horario';
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
export type EstadoVacacion = 'pendiente' | 'aprobada' | 'rechazada' | 'en_curso' | 'completada';
export type TipoVacacion = 'anual' | 'personal' | 'medica';
export type TipoPermiso = 'medico' | 'personal' | 'familiar' | 'educativo' | 'otro';
export type EstadoPermiso = 'pendiente' | 'aprobado' | 'rechazado';
export type TipoAusencia = 'injustificada' | 'justificada_medica' | 'justificada_personal' | 'otro';
export type EstadoAusencia = 'pendiente' | 'aprobada' | 'rechazada';
export type TipoAccionAuditoria = 'crear' | 'editar' | 'eliminar' | 'activar' | 'desactivar' | 'aprobar' | 'rechazar' | 'marcaje' | 'exportar';

export interface Empleado {
  id: string;
  numeroEmpleado: string;
  nombre: string;
  correo: string;
  departamento: string;
  cargo: string;
  genero: GeneroEmpleado;
  estado: EstadoEmpleado;
  fotoBase64: string;
  biometricTemplate: string;
  horarioLaboralId: string | null;
  sucursal: string;
  supervisorId: string | null;
  fechaIngreso: string;
  registradoPor: string;
  fechaRegistro: string;
}

export interface HorarioLaboral {
  id: string;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  dias: DiaSemana[];
  toleranciaMinutos: number;
  sucursal: string;
  creadoPor: string;
  fechaCreacion: string;
}

export interface HorarioAsignacion {
  id: string;
  empleadoId: string;
  horarioId: string;
  fechaInicio: string;
  fechaFin: string | null;
  asignadoPor: string;
  fechaAsignacion: string;
}

export interface Marcaje {
  id: string;
  empleadoId: string;
  tipo: TipoMarcaje;
  fecha: string;
  hora: string;
  ubicacion: string;
  resultado: ResultadoMarcaje;
  fotoCapturada: string;
  observaciones: string;
  registradoPor: string;
  fechaRegistro: string;
}

export interface Vacacion {
  id: string;
  empleadoId: string;
  tipo: TipoVacacion;
  fechaInicio: string;
  fechaFin: string;
  diasSolicitados: number;
  estado: EstadoVacacion;
  motivo: string;
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
  observaciones: string;
  registradoPor: string;
  fechaRegistro: string;
}

export interface BalanceVacaciones {
  empleadoId: string;
  anio: number;
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
}

export interface Permiso {
  id: string;
  empleadoId: string;
  tipo: TipoPermiso;
  fechaInicio: string;
  fechaFin: string;
  horas: number;
  motivo: string;
  documentoAdjunto: string;
  estado: EstadoPermiso;
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
  observaciones: string;
  registradoPor: string;
  fechaRegistro: string;
}

export interface Ausencia {
  id: string;
  empleadoId: string;
  fecha: string;
  tipo: TipoAusencia;
  motivo: string;
  documentoAdjunto: string;
  estado: EstadoAusencia;
  aprobadoPor: string | null;
  fechaAprobacion: string | null;
  observacionesAprobacion: string;
  registradoPor: string;
  fechaRegistro: string;
}

export interface RegistroAuditoria {
  id: string;
  usuario: string;
  fechaHora: string;
  accion: TipoAccionAuditoria;
  modulo: string;
  registroAfectado: string;
  descripcion: string;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  ip: string;
}

export interface ReporteFiltros {
  empleadoId?: string;
  departamento?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  usuario?: string;
}

export const DEPARTAMENTOS: string[] = [
  'Recursos Humanos', 'Tecnologia', 'Contabilidad',
  'Ventas', 'Marketing', 'Operaciones', 'Mantenimiento', 'Direccion'
];

export const SUCURSALES: string[] = [
  'Sede Central', 'Sucursal Norte', 'Sucursal Sur', 'Sucursal Este', 'Sucursal Oeste'
];

export const CARGOS: string[] = [
  'Director', 'Gerente', 'Supervisor', 'Analista', 'Tecnico',
  'Asistente', 'Operador', 'Practicante', 'Consultor'
];

export const DIAS_SEMANA: DiaSemana[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
];

export const HORARIOS_PREDEFINIDOS: Omit<HorarioLaboral, 'id' | 'creadoPor' | 'fechaCreacion'>[] = [
  { nombre: 'Matutino', horaEntrada: '06:00', horaSalida: '14:00', dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], toleranciaMinutos: 10, sucursal: 'Sede Central' },
  { nombre: 'Vespertino', horaEntrada: '14:00', horaSalida: '22:00', dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], toleranciaMinutos: 10, sucursal: 'Sede Central' },
  { nombre: 'Nocturno', horaEntrada: '22:00', horaSalida: '06:00', dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], toleranciaMinutos: 5, sucursal: 'Sede Central' },
  { nombre: 'Comercial', horaEntrada: '08:00', horaSalida: '17:00', dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], toleranciaMinutos: 15, sucursal: 'Sede Central' }
];

export const DIAS_VACACIONES_POR_ANIO = 15;

export const STORAGE_KEYS = {
  empleados: 'sg_empleados',
  horarios: 'sg_horarios_empleados',
  horarioAsignaciones: 'sg_horario_asignaciones',
  marcajes: 'sg_marcajes',
  vacaciones: 'sg_vacaciones',
  balanceVacaciones: 'sg_balance_vacaciones',
  permisos: 'sg_permisos_empleados',
  ausencias: 'sg_ausencias',
  auditoria: 'sg_auditoria'
} as const;

export const ACCIONES_AUDITORIA: TipoAccionAuditoria[] = ['crear', 'editar', 'eliminar', 'activar', 'desactivar', 'aprobar', 'rechazar', 'marcaje', 'exportar'];
