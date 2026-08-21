import { ActividadDiaria, FiltrosReporte } from './types';

const API_BASE = 'http://localhost:5000/api/bitacora';

export async function registrar(data: Omit<ActividadDiaria, 'id' | 'fechaRegistro'>): Promise<ActividadDiaria> {
  const res = await fetch(`${API_BASE}/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al registrar la actividad');
  return res.json();
}

export async function getByFecha(fecha: string, usuarioId: string | number): Promise<ActividadDiaria[]> {
  if (!usuarioId) return [];
  const res = await fetch(`${API_BASE}/por-fecha?fecha=${fecha}&usuarioId=${usuarioId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getFechasConActividades(mes: number, anio: number, usuarioId: string | number): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (!usuarioId) return mapa;
  
  try {
    const res = await fetch(`${API_BASE}/calendario?mes=${mes + 1}&anio=${anio}&usuarioId=${usuarioId}`);
    if (res.ok) {
      const data = await res.json();
      data.forEach((d: { fecha: string; cantidad: number }) => mapa.set(d.fecha, Number(d.cantidad)));
    }
  } catch (err) {
    console.error('Error cargando calendario:', err);
  }
  return mapa;
}

export async function getByFiltros(filtros: FiltrosReporte): Promise<ActividadDiaria[]> {
  const params = new URLSearchParams();
  if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
  if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
  if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId);

  const res = await fetch(`${API_BASE}/reportes?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function eliminar(id: string): Promise<void> {
  await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export async function enviarReportePorCorreo(params: {
  destinatario: string;
  actividades: ActividadDiaria[];
  remitenteNombre: string;
  rangoFechas: string;
  archivoAdjunto?: {
    nombre: string;
    base64: string;
  } | null;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/enviar-correo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al enviar correo');
  return data;
}