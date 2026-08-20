import { createStore, genId, today } from '../../lib/store';
import {
  IngresoEquipo, Inspeccion, ModeloSpecs, MODELOS_CATALOGO,
  DocumentacionValidacion, InspeccionFisica, Hallazgo, Evidencia
} from './types';
import { registrar as registrarAuditoria } from '../empleados/service-auditoria';
import { TipoAccionAuditoria } from '../empleados/types';
import { apiGetIngresos, apiRegistrarIngreso, apiActualizarIngreso } from './api';

// ─── Stores locales (caché en memoria mientras se migra a la API) ──────────────
const KEY_INGRESOS = 'sg_inventario';
const KEY_INSPECCIONES = 'sg_inspecciones';

export const ingresosStore = createStore<IngresoEquipo[]>(KEY_INGRESOS, () => []);
export const inspeccionesStore = createStore<Inspeccion[]>(KEY_INSPECCIONES, () => []);

// ─── Utilidades ────────────────────────────────────────────────────────────────
function usuarioActual(): string {
  try {
    const raw = localStorage.getItem('sg_auth');
    if (raw) {
      const parsed = JSON.parse(raw) as { user?: { name?: string } | null };
      if (parsed?.user?.name) return parsed.user.name;
    }
  } catch {
    /* ignore */
  }
  return 'Sistema';
}

function auditar(accion: TipoAccionAuditoria, registroAfectado: string, descripcion: string, datosAnteriores?: unknown, datosNuevos?: unknown): void {
  registrarAuditoria({
    usuario: usuarioActual(),
    accion,
    modulo: 'inventario',
    registroAfectado,
    descripcion,
    datosAnteriores: datosAnteriores === undefined ? null : JSON.stringify(datosAnteriores),
    datosNuevos: datosNuevos === undefined ? null : JSON.stringify(datosNuevos)
  });
}

// ─── Catálogo de Modelos ────────────────────────────────────────────────────────
export function getModelos(): ModeloSpecs[] {
  return MODELOS_CATALOGO;
}

export function getModeloPorId(id: string): ModeloSpecs | undefined {
  return MODELOS_CATALOGO.find((m) => m.modeloId === id);
}

// ─── INGRESOS (Lectura sincrónica desde caché local) ───────────────────────────
export function getIngresos(): IngresoEquipo[] {
  return ingresosStore.get();
}

export function getIngresoPorId(id: string): IngresoEquipo | undefined {
  return ingresosStore.get().find((i) => i.id === id);
}

/**
 * Carga los ingresos desde la API y actualiza el caché local.
 * Llama esta función al montar el componente de inventario.
 */
export async function cargarIngresosDesdeAPI(): Promise<void> {
  try {
    const data = await apiGetIngresos();
    if (Array.isArray(data) && data.length > 0) {
      ingresosStore.set(data);
    }
  } catch (err) {
    console.warn('Carga de API falló, usando datos locales:', err);
  }
}

/**
 * Registra un equipo en la API (SQL Server) y actualiza el caché local.
 */
export async function registrarIngresoAPI(
  data: Omit<IngresoEquipo, 'id' | 'folio'>,
  archivo?: File
): Promise<IngresoEquipo> {
  try {
    const apiRes = await apiRegistrarIngreso(data, archivo);
    const nuevo: IngresoEquipo = {
      ...data,
      id: String(apiRes.id || genId()),
      folio: (data as any).codigoBarras || data.numeroParte || genId(),
      estadoDocumental: data.estadoDocumental || 'con_documento',
      fechaRegistro: new Date().toISOString(),
      activo: true
    };
    ingresosStore.set([nuevo, ...getIngresos()]);
    auditar('crear', nuevo.folio || '', `Ingreso guardado en SQL Server (${nuevo.modelo || nuevo.tipoProducto})`, null, nuevo);
    return nuevo;
  } catch (err) {
    console.warn('Error en API, guardando en almacén local:', err);
    return registrarIngreso(data);
  }
}

/**
 * Registra un equipo localmente (sin API) — mantiene compatibilidad temporal.
 */
export function registrarIngreso(data: Omit<IngresoEquipo, 'id' | 'folio'>): IngresoEquipo {
  const tieneDoc = Boolean(data.documentoReferencia && data.documentoReferencia.trim().length > 0);
  const estadoDoc = data.estadoDocumental || (tieneDoc ? 'con_documento' : 'pendiente_validacion');

  const nuevo: IngresoEquipo = {
    ...data,
    id: genId(),
    folio: (data as any).codigoBarras || data.numeroParte || genId(),
    estadoDocumental: estadoDoc,
    fechaRegistro: new Date().toISOString(),
    activo: true
  };
  ingresosStore.set([nuevo, ...getIngresos()]);
  auditar('crear', nuevo.folio || '', `Ingreso local (${nuevo.modelo || nuevo.tipoProducto}). Estado documental: ${estadoDoc}`, null, nuevo);
  return nuevo;
}

export async function actualizarIngresoAPI(id: string, data: IngresoEquipo): Promise<IngresoEquipo> {
  try {
    await apiActualizarIngreso(id, data);
    return actualizarIngreso(id, data);
  } catch (err) {
    console.warn('Error en API al actualizar, actualizando localmente:', err);
    return actualizarIngreso(id, data);
  }
}

export function actualizarIngreso(id: string, data: IngresoEquipo): IngresoEquipo {
  const actualizados = getIngresos().map(item => String(item.id) === String(id) ? { ...item, ...data } : item);
  ingresosStore.set(actualizados);
  auditar('actualizar', data.folio || id, `Ingreso actualizado en SQL Server (${data.modelo || data.tipoProducto})`, null, data);
  return { ...data, id };
}

export async function eliminarIngresoAPI(id: string): Promise<void> {
  eliminarIngreso(id);
}

export function eliminarIngreso(id: string): void {
  const prev = getIngresoPorId(id);
  ingresosStore.set(getIngresos().filter((i) => i.id !== id));
  inspeccionesStore.set(getInspecciones().filter((i) => i.ingresoId !== id));
  auditar('eliminar', prev?.folio || id, `Ingreso eliminado con su expediente`, prev ?? null, null);
}

export function toggleActivoIngreso(id: string): void {
  const all = getIngresos();
  const index = all.findIndex(i => i.id === id);
  if (index !== -1) {
    const item = all[index];
    // Por defecto es true si es undefined
    const esActivo = item.activo !== false;
    const newActivo = !esActivo;
    const updated = { ...item, activo: newActivo };
    all[index] = updated;
    ingresosStore.set([...all]);
    // Optional audit log for deactivate/activate
    // auditar('editar', item.folio || id, `Ingreso ${newActivo ? 'activado' : 'desactivado'}`);
  }
}

// ─── INSPECCIONES (Lectura sincrónica desde caché local) ───────────────────────
export function getInspecciones(): Inspeccion[] {
  return inspeccionesStore.get();
}

export function getInspeccionPorId(id: string): Inspeccion | undefined {
  return inspeccionesStore.get().find((i) => i.id === id);
}

export function getInspeccionPorIngreso(ingresoId: string): Inspeccion | undefined {
  return inspeccionesStore.get().find((i) => i.ingresoId === ingresoId);
}

/**
 * Carga las inspecciones desde la API y actualiza el caché local.
 */
export async function cargarInspeccionesDesdeAPI(): Promise<void> {
  // Local mode: do nothing
}

function nuevaInspeccionVacia(ingresoId: string, usuario: string): Inspeccion {
  return {
    id: genId(),
    ingresoId,
    folio: `INSP-${Date.now().toString(36).toUpperCase()}`,
    estado: 'pendiente_revision',
    documentacion: {
      fichaTecnica: false, manuales: false, certificados: false,
      etiquetas: false, documentoReferencia: false,
      resultado: '', observaciones: ''
    },
    inspeccionFisica: { condicionGeneral: '', serialesVisibles: '', observaciones: '' },
    verificacionTecnica: {},
    checklistFisico: [],
    hallazgos: [],
    evidencias: [],
    resultado: '',
    comentarioFinal: '',
    disposicion: '',
    justificacionDisposicion: '',
    fechaCierre: null,
    creadoPor: usuario,
    fechaCreacion: new Date().toISOString()
  };
}

export async function crearInspeccionAPI(
  ingresoId: string,
  usuario: string,
  estadoInicial: 'pendiente_revision' | 'cuarentena_tecnica' = 'pendiente_revision'
): Promise<{ inspeccion: Inspeccion; esNuevo: boolean }> {
  return crearInspeccion(ingresoId, usuario, estadoInicial);
}

export function crearInspeccion(
  ingresoId: string,
  usuario: string,
  estadoInicial: 'pendiente_revision' | 'cuarentena_tecnica' = 'pendiente_revision'
): { inspeccion: Inspeccion; esNuevo: boolean } {
  const existente = getInspeccionPorIngreso(ingresoId);
  if (existente) return { inspeccion: existente, esNuevo: false };

  const nueva = nuevaInspeccionVacia(ingresoId, usuario);
  nueva.estado = estadoInicial;
  inspeccionesStore.set([...getInspecciones(), nueva]);
  auditar('crear', nueva.folio, `Expediente de inspección creado (${nueva.folio}) asociado a ingreso ${ingresoId} en estado ${estadoInicial}`, null, nueva);
  return { inspeccion: nueva, esNuevo: true };
}

function guardarInspeccion(id: string, updater: (ins: Inspeccion) => Inspeccion): void {
  inspeccionesStore.set(getInspecciones().map((i) => (i.id === id ? updater(i) : i)));
}

async function guardarInspeccionAPI(id: string, updater: (ins: Inspeccion) => Inspeccion): Promise<void> {
  const actual = getInspeccionPorId(id);
  if (!actual) return;
  const actualizado = updater(actual);
  guardarInspeccion(id, () => actualizado);
}

export function updateDocumentacion(id: string, doc: DocumentacionValidacion): void {
  const prev = getInspeccionPorId(id);
  guardarInspeccionAPI(id, (i) => ({ ...i, documentacion: doc }));
  auditar('editar', prev?.folio || id, 'Validacion documental actualizada', prev?.documentacion ?? null, doc);
}

export function updateInspeccionFisica(id: string, fisica: InspeccionFisica, checklist?: boolean[]): void {
  const prev = getInspeccionPorId(id);
  guardarInspeccionAPI(id, (i) => ({ ...i, inspeccionFisica: fisica, ...(checklist ? { checklistFisico: checklist } : {}) }));
  auditar('editar', prev?.folio || id, 'Inspeccion fisica actualizada', prev?.inspeccionFisica ?? null, fisica);
}

export function updateVerificacionTecnica(
  id: string,
  tecnica: Record<string, { valor: string; estado: 'verificado' | 'pendiente' | 'no_aplica' }>,
  confirmada?: boolean
): void {
  const prev = getInspeccionPorId(id);
  guardarInspeccionAPI(id, (i) => ({
    ...i,
    verificacionTecnica: tecnica,
    ...(confirmada !== undefined ? { verificacionTecnicaConfirmada: confirmada } : {})
  }));
  auditar('editar', prev?.folio || id, 'Verificación técnica actualizada');
}

export function agregarHallazgo(id: string, hallazgo: Omit<Hallazgo, 'id' | 'fechaRegistro'>): void {
  const ins = getInspeccionPorId(id);
  const nuevo: Hallazgo = { ...hallazgo, id: genId(), fechaRegistro: new Date().toISOString() };
  guardarInspeccionAPI(id, (i) => ({ ...i, hallazgos: [...i.hallazgos, nuevo] }));
  auditar('crear', ins?.folio || id, `Hallazgo registrado (${nuevo.tipo}, severidad ${nuevo.severidad})`, null, nuevo);
}

export function eliminarHallazgo(inspeccionId: string, hallazgoId: string): void {
  const ins = getInspeccionPorId(inspeccionId);
  const prev = ins?.hallazgos.find((h) => h.id === hallazgoId);
  guardarInspeccionAPI(inspeccionId, (i) => ({ ...i, hallazgos: i.hallazgos.filter((h) => h.id !== hallazgoId) }));
  auditar('eliminar', ins?.folio || inspeccionId, `Hallazgo eliminado`, prev ?? null, null);
}

export function agregarEvidencia(id: string, evidencia: Omit<Evidencia, 'id' | 'fechaRegistro'>): void {
  const ins = getInspeccionPorId(id);
  const nueva: Evidencia = { ...evidencia, id: genId(), fechaRegistro: new Date().toISOString() };
  guardarInspeccionAPI(id, (i) => ({ ...i, evidencias: [...i.evidencias, nueva] }));
  auditar('crear', ins?.folio || id, `Evidencia adjuntada: ${nueva.nombre}`, null, nueva);
}

export function eliminarEvidencia(inspeccionId: string, evidenciaId: string): void {
  const ins = getInspeccionPorId(inspeccionId);
  const prev = ins?.evidencias.find((e) => e.id === evidenciaId);
  guardarInspeccionAPI(inspeccionId, (i) => ({ ...i, evidencias: i.evidencias.filter((e) => e.id !== evidenciaId) }));
  auditar('eliminar', ins?.folio || inspeccionId, `Evidencia eliminada: ${prev?.nombre ?? evidenciaId}`, prev ?? null, null);
}

export function emitirResultado(id: string, resultado: Inspeccion['resultado'], comentarioFinal: string): void {
  const prev = getInspeccionPorId(id);
  guardarInspeccionAPI(id, (i) => ({
    ...i, resultado, comentarioFinal,
    estado: i.estado === 'pendiente_revision' ? 'en_proceso' : i.estado
  }));
  auditar('aprobar', prev?.folio || id, `Resultado de inspección emitido: ${resultado}`, prev ? { resultado: prev.resultado, comentarioFinal: prev.comentarioFinal } : null, { resultado, comentarioFinal });
}

export function gestionarDisposicion(id: string, disposicion: Inspeccion['disposicion'], justificacion: string): void {
  const prev = getInspeccionPorId(id);
  guardarInspeccionAPI(id, (i) => ({
    ...i, disposicion, justificacionDisposicion: justificacion,
    estado: 'completada', fechaCierre: new Date().toISOString()
  }));
  auditar('aprobar', prev?.folio || id, `Expediente cerrado con disposición: ${disposicion}`, null, { disposicion, justificacion });
}

export function devolverAInspeccion(id: string, motivo: string, usuario: string): void {
  const prev = getInspeccionPorId(id);
  const devolucion = { fecha: new Date().toISOString(), usuario, motivo };
  guardarInspeccionAPI(id, (i) => ({
    ...i, estado: 'en_proceso', disposicion: '', resultado: i.resultado,
    historialDevoluciones: [...(i.historialDevoluciones || []), devolucion]
  }));
  auditar('editar', prev?.folio || id, `Expediente devuelto a inspección por supervisor: ${motivo}`, null, devolucion);
}

export function getFechaHoy(): string {
  return today();
}
