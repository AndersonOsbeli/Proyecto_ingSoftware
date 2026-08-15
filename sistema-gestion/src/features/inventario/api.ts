/**
 * api.ts - Capa de comunicación HTTP con la API de Inventario (ASP.NET Core / Visual Studio)
 * Ajusta API_BASE_URL al puerto que asignó Visual Studio al ejecutar la API.
 */

import { IngresoEquipo, Inspeccion } from './types';

// ⚠️ Cambia este puerto al que aparece en Visual Studio cuando ejecutas la API (F5)
export const API_BASE_URL = 'https://localhost:7213/api';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// ARCHIVOS (Fichas Técnicas / Evidencias)
// ─────────────────────────────────────────────

export async function subirArchivo(file: File): Promise<{ ruta: string; nombreOriginal: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/Files/Upload`, {
    method: 'POST',
    body: formData // No agregar Content-Type manualmente, el navegador lo configura solo
  });

  return handleResponse(res);
}

// ─────────────────────────────────────────────
// INGRESOS DE EQUIPOS
// ─────────────────────────────────────────────

export async function apiGetIngresos(): Promise<IngresoEquipo[]> {
  const res = await fetch(`${API_BASE_URL}/Ingresos`);
  return handleResponse<IngresoEquipo[]>(res);
}

export async function apiGetIngresoPorId(id: string): Promise<IngresoEquipo | null> {
  const res = await fetch(`${API_BASE_URL}/Ingresos/${id}`);
  if (res.status === 404) return null;
  return handleResponse<IngresoEquipo>(res);
}

export async function apiRegistrarIngreso(
  data: Omit<IngresoEquipo, 'id' | 'folio'>,
  archivo?: File
): Promise<IngresoEquipo> {
  let rutaArchivo = '';

  // 1. Si hay archivo adjunto, subirlo primero y obtener la ruta
  if (archivo) {
    const uploadResult = await subirArchivo(archivo);
    rutaArchivo = uploadResult.ruta; // Ej: "/uploads/uuid_ficha.pdf"
  }

  // 2. Registrar el equipo en SQL Server con la ruta del documento
  const payload = {
    ...data,
    id: crypto.randomUUID(),
    folio: data.numeroParte,
    documentoReferencia: rutaArchivo || data.documentoReferencia || '',
    estadoDocumental: rutaArchivo ? 'con_documento' : (data.estadoDocumental || 'pendiente_validacion'),
    fechaRegistro: new Date().toISOString()
  };

  const res = await fetch(`${API_BASE_URL}/Ingresos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return handleResponse<IngresoEquipo>(res);
}

export async function apiEliminarIngreso(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/Ingresos/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al eliminar: ${text}`);
  }
}

// ─────────────────────────────────────────────
// INSPECCIONES
// ─────────────────────────────────────────────

export async function apiGetInspecciones(): Promise<Inspeccion[]> {
  const res = await fetch(`${API_BASE_URL}/Inspecciones`);
  return handleResponse<Inspeccion[]>(res);
}

export async function apiGetInspeccionPorId(id: string): Promise<Inspeccion | null> {
  const res = await fetch(`${API_BASE_URL}/Inspecciones/${id}`);
  if (res.status === 404) return null;
  return handleResponse<Inspeccion>(res);
}

export async function apiGetInspeccionPorIngreso(ingresoId: string): Promise<Inspeccion | null> {
  const todas = await apiGetInspecciones();
  return todas.find(i => i.ingresoId === ingresoId) ?? null;
}

export async function apiCrearInspeccion(inspeccion: Omit<Inspeccion, 'id'>): Promise<Inspeccion> {
  const payload: Inspeccion = {
    ...inspeccion,
    id: crypto.randomUUID(),
  };

  const res = await fetch(`${API_BASE_URL}/Inspecciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return handleResponse<Inspeccion>(res);
}

export async function apiActualizarInspeccion(inspeccion: Inspeccion): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/Inspecciones/${inspeccion.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inspeccion)
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Error al actualizar inspección: ${text}`);
  }
}
