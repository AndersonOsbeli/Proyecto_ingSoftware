import { createStore, genId, nowISO } from '../../lib/store';
import { Marcaje, TipoMarcaje, STORAGE_KEYS } from './types';
import { getById as getEmpleado } from './service-empleados';
import { getHorarioActual } from './service-horarios';
import { tieneVacacionesActivas } from './service-vacaciones';
import { tienePermisoActivo } from './service-permisos';

export const marcajesStore = createStore<Marcaje[]>(STORAGE_KEYS.marcajes, () => []);

function getDiaSemana(fecha: string): string {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return dias[new Date(fecha + 'T12:00:00').getDay()];
}

export function validarMarcaje(empleadoId: string): { permitido: boolean; razon: string } {
  const empleado = getEmpleado(empleadoId);
  if (!empleado) return { permitido: false, razon: 'Empleado no encontrado' };
  if (empleado.estado === 'inactivo' || empleado.estado === 'suspendido')
    return { permitido: false, razon: 'Empleado inactivo o suspendido' };

  const hoy = new Date().toISOString().split('T')[0];
  if (tieneVacacionesActivas(empleadoId, hoy))
    return { permitido: false, razon: 'Empleado en periodo vacacional' };

  if (tienePermisoActivo(empleadoId, hoy))
    return { permitido: true, razon: 'Empleado con permiso vigente' };

  const horario = getHorarioActual(empleadoId);
  if (!horario) return { permitido: false, razon: 'Sin horario asignado' };

  const diaSemana = getDiaSemana(hoy);
  if (!horario.dias.includes(diaSemana as any))
    return { permitido: false, razon: 'Hoy no es dia laboral segun horario' };

  return { permitido: true, razon: 'OK' };
}

export function registrarMarcaje(
  empleadoId: string,
  tipo: TipoMarcaje,
  fotoCapturada: string,
  ubicacion: string = 'Sede Central'
): Marcaje {
  const validacion = validarMarcaje(empleadoId);
  const ahora = new Date();
  const empleado = getEmpleado(empleadoId);
  const marcaje: Marcaje = {
    id: genId(),
    empleadoId,
    tipo,
    fecha: ahora.toISOString().split('T')[0],
    hora: ahora.toTimeString().substring(0, 5),
    ubicacion,
    resultado: validacion.permitido ? 'exitoso' : (validacion.razon.includes('vacacion') ? 'en_vacaciones' :
      validacion.razon.includes('permiso') ? 'con_permiso' :
      validacion.razon.includes('inactivo') ? 'empleado_inactivo' :
      validacion.razon.includes('horario') ? 'sin_horario' : 'no_reconocido'),
    fotoCapturada,
    observaciones: validacion.razon,
    registradoPor: empleado?.nombre || 'Sistema',
    fechaRegistro: nowISO()
  };
  marcajesStore.set([...getAll(), marcaje]);
  return marcaje;
}

export function getAll(): Marcaje[] {
  return marcajesStore.get();
}

export function getByEmpleado(empleadoId: string): Marcaje[] {
  return getAll().filter((m) => m.empleadoId === empleadoId);
}

export function getByFecha(fecha: string): Marcaje[] {
  return getAll().filter((m) => m.fecha === fecha);
}

export function getByRangoFechas(fechaInicio: string, fechaFin: string): Marcaje[] {
  return getAll().filter((m) => m.fecha >= fechaInicio && m.fecha <= fechaFin);
}

export function getByEmpleadoYRango(empleadoId: string, fechaInicio: string, fechaFin: string): Marcaje[] {
  return getAll().filter((m) => m.empleadoId === empleadoId && m.fecha >= fechaInicio && m.fecha <= fechaFin);
}

export function getResumenDia(fecha: string): { total: number; entradas: number; salidas: number; pendientes: number } {
  const dia = getByFecha(fecha);
  return {
    total: dia.length,
    entradas: dia.filter((m) => m.tipo === 'entrada' && m.resultado === 'exitoso').length,
    salidas: dia.filter((m) => m.tipo === 'salida' && m.resultado === 'exitoso').length,
    pendientes: dia.filter((m) => m.resultado !== 'exitoso').length
  };
}

export function calcularHorasTrabajadas(empleadoId: string, fecha: string): number {
  const marcajes = getByEmpleado(empleadoId).filter((m) => m.fecha === fecha && m.resultado === 'exitoso');
  const entrada = marcajes.find((m) => m.tipo === 'entrada');
  const salida = marcajes.find((m) => m.tipo === 'salida');
  if (!entrada || !salida) return 0;
  const [eH, eM] = entrada.hora.split(':').map(Number);
  const [sH, sM] = salida.hora.split(':').map(Number);
  return ((sH * 60 + sM) - (eH * 60 + eM)) / 60;
}

export function calcularRetraso(empleadoId: string, fecha: string): number {
  const horario = getHorarioActual(empleadoId);
  if (!horario) return 0;
  const entrada = getByEmpleado(empleadoId).find((m) => m.fecha === fecha && m.tipo === 'entrada' && m.resultado === 'exitoso');
  if (!entrada) return 0;
  const [hH, hM] = horario.horaEntrada.split(':').map(Number);
  const [eH, eM] = entrada.hora.split(':').map(Number);
  const diff = (eH * 60 + eM) - (hH * 60 + hM) - horario.toleranciaMinutos;
  return diff > 0 ? diff : 0;
}
