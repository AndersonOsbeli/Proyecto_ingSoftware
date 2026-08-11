import * as XLSX from 'xlsx';
import { ReporteFiltros } from './types';
import { getById as getEmpleado } from './service-empleados';
import { getEmpleados } from './service-empleados';
import * as marcajeService from './service-marcaje';
import * as vacacionesService from './service-vacaciones';
import * as permisosService from './service-permisos';
import * as ausenciasService from './service-ausencias';
import * as horariosService from './service-horarios';
import * as auditoriaService from './service-auditoria';

function descargarExcel(data: Record<string, unknown>[], nombreArchivo: string): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportarAsistencia(filtros: ReporteFiltros): void {
  let marcajes = marcajeService.getAll();
  if (filtros.empleadoId) marcajes = marcajes.filter((m) => m.empleadoId === filtros.empleadoId);
  if (filtros.fechaInicio) marcajes = marcajes.filter((m) => m.fecha >= filtros.fechaInicio!);
  if (filtros.fechaFin) marcajes = marcajes.filter((m) => m.fecha <= filtros.fechaFin!);

  const data = marcajes.map((m) => {
    const emp = getEmpleado(m.empleadoId);
    return {
      'No.Empleado': emp?.numeroEmpleado || '',
      'Nombre': emp?.nombre || '',
      'Departamento': emp?.departamento || '',
      'Fecha': m.fecha,
      'Hora': m.hora,
      'Tipo': m.tipo,
      'Resultado': m.resultado,
      'Ubicacion': m.ubicacion,
      'Observaciones': m.observaciones
    };
  });

  descargarExcel(data, 'Reporte_Asistencia');
}

export function exportarHorarios(filtros: ReporteFiltros): void {
  const horarios = horariosService.getAllHorarios();
  let asignaciones = horariosService.asignacionesStore.get();

  if (filtros.empleadoId) asignaciones = asignaciones.filter((a) => a.empleadoId === filtros.empleadoId);

  const data = asignaciones.map((a) => {
    const emp = getEmpleado(a.empleadoId);
    const horario = horariosService.getHorario(a.horarioId);
    return {
      'No.Empleado': emp?.numeroEmpleado || '',
      'Nombre': emp?.nombre || '',
      'Horario': horario?.nombre || '',
      'Entrada': horario?.horaEntrada || '',
      'Salida': horario?.horaSalida || '',
      'Dias': horario?.dias.join(', ') || '',
      'Fecha Inicio': a.fechaInicio,
      'Fecha Fin': a.fechaFin || 'Indefinido'
    };
  });

  descargarExcel(data, 'Reporte_Horarios');
}

export function exportarVacacionesPermisos(filtros: ReporteFiltros): void {
  let vacaciones = vacacionesService.getAll();
  let permisos = permisosService.getAll();

  if (filtros.empleadoId) {
    vacaciones = vacaciones.filter((v) => v.empleadoId === filtros.empleadoId);
    permisos = permisos.filter((p) => p.empleadoId === filtros.empleadoId);
  }
  if (filtros.estado) {
    vacaciones = vacaciones.filter((v) => v.estado === filtros.estado);
    permisos = permisos.filter((p) => p.estado === filtros.estado);
  }

  const wb = XLSX.utils.book_new();

  const vacData = vacaciones.map((v) => {
    const emp = getEmpleado(v.empleadoId);
    return {
      'No.Empleado': emp?.numeroEmpleado || '', 'Nombre': emp?.nombre || '',
      'Tipo': v.tipo, 'Fecha Inicio': v.fechaInicio, 'Fecha Fin': v.fechaFin,
      'Dias': v.diasSolicitados, 'Estado': v.estado, 'Aprobado por': v.aprobadoPor || ''
    };
  });
  const wsVac = XLSX.utils.json_to_sheet(vacData);
  XLSX.utils.book_append_sheet(wb, wsVac, 'Vacaciones');

  const permData = permisos.map((p) => {
    const emp = getEmpleado(p.empleadoId);
    return {
      'No.Empleado': emp?.numeroEmpleado || '', 'Nombre': emp?.nombre || '',
      'Tipo': p.tipo, 'Fecha Inicio': p.fechaInicio, 'Fecha Fin': p.fechaFin,
      'Horas': p.horas, 'Estado': p.estado, 'Aprobado por': p.aprobadoPor || ''
    };
  });
  const wsPerm = XLSX.utils.json_to_sheet(permData);
  XLSX.utils.book_append_sheet(wb, wsPerm, 'Permisos');

  XLSX.writeFile(wb, `Reporte_Vacaciones_Permisos_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportarAuditoria(filtros: ReporteFiltros): void {
  let registros = auditoriaService.getAll();

  if (filtros.usuario) registros = registros.filter((r) => r.usuario.toLowerCase().includes(filtros.usuario!.toLowerCase()));
  if (filtros.fechaInicio) registros = registros.filter((r) => r.fechaHora >= filtros.fechaInicio!);
  if (filtros.fechaFin) registros = registros.filter((r) => r.fechaHora <= filtros.fechaFin! + 'T23:59:59');

  const data = registros.map((r) => ({
    'Usuario': r.usuario, 'Fecha/Hora': r.fechaHora,
    'Accion': r.accion, 'Modulo': r.modulo,
    'Registro Afectado': r.registroAfectado, 'Descripcion': r.descripcion,
    'IP': r.ip
  }));

  descargarExcel(data, 'Reporte_Auditoria');
}

function getEmpleadosExport(): Record<string, unknown>[] {
  return getEmpleados().map((e) => ({
    'No.Empleado': e.numeroEmpleado,
    'Nombre': e.nombre,
    'Departamento': e.departamento,
    'Cargo': e.cargo,
    'Sucursal': e.sucursal,
    'Estado': e.estado
  }));
}

export function generarReporte(concepto: string, filtros: ReporteFiltros): void {  switch (concepto) {
    case 'Marcajes': exportarAsistencia(filtros); break;
    case 'Vacaciones': exportarVacacionesPermisos(filtros); break;
    case 'Permisos': exportarVacacionesPermisos(filtros); break;
    case 'Ausencias': {
      const data = ausenciasService.getAll()
        .filter((a) => !filtros.empleadoId || a.empleadoId === filtros.empleadoId)
        .map((a) => ({
          'No.Empleado': getEmpleado(a.empleadoId)?.numeroEmpleado || '',
          'Nombre': getEmpleado(a.empleadoId)?.nombre || '',
          'Fecha': a.fecha, 'Tipo': a.tipo, 'Estado': a.estado, 'Motivo': a.motivo
        }));
      descargarExcel(data, 'Reporte_Ausencias');
      break;
    }
    case 'Empleados': {
      const data = marcajeService.getAll().length >= 0 ? getEmpleadosExport() : [];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
      XLSX.writeFile(wb, `Reporte_Empleados_${new Date().toISOString().split('T')[0]}.xlsx`);
      break;
    }
    default:
      break;
  }
}
