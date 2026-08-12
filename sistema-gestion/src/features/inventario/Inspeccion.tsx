import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, IconButton, Checkbox, FormControlLabel,
  Radio, RadioGroup, Chip, Divider, Snackbar, Alert, Tab, Tabs, List,
  ListItem, ListItemIcon, ListItemText, TableContainer, Dialog, DialogTitle,
  DialogContent, DialogActions, Card, CardContent, Tooltip, AlertTitle,
  Table, TableHead, TableRow, TableCell, TableBody, Stack
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import LockIcon from '@mui/icons-material/Lock';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import RuleIcon from '@mui/icons-material/Rule';
import ReplayIcon from '@mui/icons-material/Replay';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import { useAuth } from '../../lib/auth';
import {
  getIngresoPorId, getInspeccionPorIngreso, crearInspeccion, getModeloPorId,
  getInspeccionPorId, updateDocumentacion, updateInspeccionFisica,
  updateVerificacionTecnica, agregarHallazgo, eliminarHallazgo,
  agregarEvidencia, eliminarEvidencia, emitirResultado, gestionarDisposicion,
  devolverAInspeccion
} from './service';
import {
  MAPA_CHECKLIST_POR_TIPO, PLANTILLA_GENERICA_SPECS, Inspeccion, IngresoEquipo,
  Hallazgo, EstadoInspeccion, Evidencia
} from './types';

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const ESTADO_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  pendiente_revision: 'warning',
  cuarentena_tecnica: 'warning',
  en_proceso: 'info',
  completada: 'success'
};

const ESTADO_NOMBRES: Record<string, string> = {
  pendiente_revision: 'Pendiente de revisión',
  cuarentena_tecnica: 'En cuarentena técnica',
  en_proceso: 'En proceso de inspección',
  completada: 'Completada y cerrada'
};

export default function InspeccionPage() {
  const { ingresoId } = useParams<{ ingresoId: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'warning' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [estadoInicialSeleccionado, setEstadoInicialSeleccionado] = useState<EstadoInspeccion>('pendiente_revision');
  const [openModalCreacion, setOpenModalCreacion] = useState(false);
  const [openModalDevolucion, setOpenModalDevolucion] = useState(false);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [previewEvidencia, setPreviewEvidencia] = useState<Evidencia | null>(null);

  const [inspeccionState, setInspeccionState] = useState<Inspeccion | null>(null);
  const [esNuevaCreacion, setEsNuevaCreacion] = useState(false);

  const [filePreview, setFilePreview] = useState<{ nombre: string; tipo: string; tamano: number; contenido: string } | null>(null);
  const [nuevaEvidencia, setNuevaEvidencia] = useState({ etapa: 'general', hallazgoId: '' });
  const [nuevoHallazgo, setNuevoHallazgo] = useState<Omit<Hallazgo, 'id' | 'origen' | 'registradoPor' | 'fechaRegistro'>>({
    tipo: 'fisico', severidad: 'media', pasoAsociado: 'inspeccion_fisica', descripcion: ''
  });

  const ingreso: IngresoEquipo | undefined = ingresoId ? getIngresoPorId(ingresoId) : undefined;

  useEffect(() => {
    if (!ingresoId || !ingreso) return;
    const existente = getInspeccionPorIngreso(ingresoId);
    if (existente) {
      setInspeccionState(existente);
      setEsNuevaCreacion(false);
    } else {
      setOpenModalCreacion(true);
    }
  }, [ingresoId, ingreso]);

  // Confirmar creación de expediente
  const handleConfirmarCreacion = (estadoElegido: EstadoInspeccion) => {
    if (!ingreso) return;
    const usuario = currentUser?.name ? `${currentUser.name} (Inspector)` : 'Inspector Técnico';
    const { inspeccion: creada, esNuevo } = crearInspeccion(ingreso.id, usuario, estadoElegido);
    setInspeccionState(creada);
    setEsNuevaCreacion(esNuevo);
    setOpenModalCreacion(false);
    setSnack({
      open: true,
      message: esNuevo
        ? `¡Expediente ${creada.folio} creado exitosamente en estado "${ESTADO_NOMBRES[creada.estado]}"!`
        : `Atención: El expediente ${creada.folio} ya existía previamente.`,
      severity: esNuevo ? 'success' : 'warning'
    });
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <LockIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h5" color="error" gutterBottom>Acceso Bloqueado (Flujo Alterno)</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          No tiene los permisos suficientes para abrir o gestionar expedientes de inspección.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>Iniciar Sesión</Button>
      </Box>
    );
  }

  if (!ingreso) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <WarningAmberIcon color="warning" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" gutterBottom>Ingreso no encontrado</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          El folio de ingreso solicitado no existe en la base de datos.
        </Typography>
        <Button startIcon={<ArrowBackIcon />} variant="contained" onClick={() => navigate('/inventario')}>
          Volver a Inventario
        </Button>
      </Box>
    );
  }

  const inspeccion = inspeccionState;
  const modelo = getModeloPorId(ingreso.modelo);

  // Caso 5 Flujo Alterno: Si no hay plantilla de modelo en catálogo, usar plantilla genérica por tipo de equipo
  const specsBase: Record<string, string> = modelo
    ? modelo.specsRequeridas
    : (PLANTILLA_GENERICA_SPECS[ingreso.tipoEquipo.toLowerCase()] || PLANTILLA_GENERICA_SPECS.generica);

  const specKeys = Object.keys(specsBase);
  const checklistFisico = MAPA_CHECKLIST_POR_TIPO[ingreso.tipoEquipo.toLowerCase()] || MAPA_CHECKLIST_POR_TIPO.otro;

  const checksFisicos = inspeccion && inspeccion.checklistFisico.length === checklistFisico.length
    ? inspeccion.checklistFisico
    : checklistFisico.map(() => false);

  const getModeloName = () => (modelo ? `${modelo.marca} ${modelo.nombre}` : ingreso.modelo || 'Modelo Sin Configuración Spec');

  // CASO DE USO 3: VALIDAR DOCUMENTACIÓN
  const handleDocCheckbox = (field: keyof Omit<Inspeccion['documentacion'], 'resultado' | 'observaciones' | 'coincidenciaDatosClave'>) => {
    if (!inspeccion) return;
    const next = { ...inspeccion.documentacion, [field]: !inspeccion.documentacion[field] };
    updateDocumentacion(inspeccion.id, next);
    setInspeccionState((prev) => (prev ? { ...prev, documentacion: next } : null));
    setSnack({ open: true, message: 'Validación documental actualizada', severity: 'success' });
  };

  const handleCoincidenciaDato = (datoKey: 'marca' | 'modelo' | 'numeroParte' | 'numeroSerie') => {
    if (!inspeccion) return;
    const coincidenciaActual = inspeccion.documentacion.coincidenciaDatosClave || {
      marca: true, modelo: true, numeroParte: true, numeroSerie: true
    };
    const nextCoincidencias = {
      ...coincidenciaActual,
      [datoKey]: !coincidenciaActual[datoKey]
    };
    const nextDoc = {
      ...inspeccion.documentacion,
      coincidenciaDatosClave: nextCoincidencias
    };
    updateDocumentacion(inspeccion.id, nextDoc);
    setInspeccionState((prev) => (prev ? { ...prev, documentacion: nextDoc } : null));
    setSnack({ open: true, message: 'Coincidencia de datos clave actualizada', severity: 'info' });
  };

  const handleDocSelect = (field: 'resultado' | 'observaciones', value: string) => {
    if (!inspeccion) return;
    const next = { ...inspeccion.documentacion, [field]: value };
    updateDocumentacion(inspeccion.id, next);
    setInspeccionState((prev) => (prev ? { ...prev, documentacion: next } : null));
    setSnack({ open: true, message: 'Dictamen documental guardado', severity: 'success' });
  };

  // CASO DE USO 4: EJECUTAR INSPECCIÓN FÍSICA
  const handleChecklist = (i: number) => {
    if (!inspeccion) return;
    const next = [...checksFisicos];
    next[i] = !next[i];
    updateInspeccionFisica(inspeccion.id, inspeccion.inspeccionFisica, next);
    setInspeccionState((prev) => (prev ? { ...prev, checklistFisico: next } : null));
    setSnack({ open: true, message: 'Checklist físico guardado', severity: 'success' });
  };

  const handleFisica = (field: keyof Inspeccion['inspeccionFisica'], value: any) => {
    if (!inspeccion) return;
    const next = { ...inspeccion.inspeccionFisica, [field]: value };
    updateInspeccionFisica(inspeccion.id, next);
    setInspeccionState((prev) => (prev ? { ...prev, inspeccionFisica: next } : null));
    setSnack({ open: true, message: 'Inspección física actualizada', severity: 'success' });
  };

  const handleCrearHallazgoAccesorioFaltante = () => {
    if (!inspeccion || !inspeccion.inspeccionFisica.accesoriosFaltantes) return;
    agregarHallazgo(inspeccion.id, {
      tipo: 'accesorio_faltante',
      severidad: 'media',
      pasoAsociado: 'inspeccion_fisica',
      descripcion: `Accesorios faltantes reportados: ${inspeccion.inspeccionFisica.accesoriosFaltantes}`,
      origen: currentUser?.name || 'Inspector',
      registradoPor: currentUser?.name || 'Inspector'
    });
    setInspeccionState((prev) => (inspeccion ? getInspeccionPorId(inspeccion.id) || prev : prev));
    setSnack({ open: true, message: 'Hallazgo de accesorio faltante creado automáticamente', severity: 'success' });
  };

  // CASO DE USO 5: VERIFICAR ESPECIFICACIONES TÉCNICAS
  const setTechValue = (key: string, value: string) => {
    if (!inspeccion) return;
    const current = inspeccion.verificacionTecnica[key] || { valor: '', estado: 'pendiente' as const };
    current.valor = value;
    if (value && current.estado === 'pendiente') current.estado = 'verificado';
    const next = { ...inspeccion.verificacionTecnica, [key]: current };
    updateVerificacionTecnica(inspeccion.id, next);
    setInspeccionState((prev) => (prev ? { ...prev, verificacionTecnica: next } : null));
  };

  const setTechStatus = (key: string, estado: 'verificado' | 'pendiente' | 'no_aplica') => {
    if (!inspeccion) return;
    const current = inspeccion.verificacionTecnica[key] || { valor: '', estado: 'pendiente' as const };
    current.estado = estado;
    const next = { ...inspeccion.verificacionTecnica, [key]: current };
    updateVerificacionTecnica(inspeccion.id, next);
    setInspeccionState((prev) => (prev ? { ...prev, verificacionTecnica: next } : null));
  };

  const handleConfirmarRevisiónTecnica = () => {
    if (!inspeccion) return;
    updateVerificacionTecnica(inspeccion.id, inspeccion.verificacionTecnica, true);
    setInspeccionState((prev) => (prev ? { ...prev, verificacionTecnicaConfirmada: true } : null));
    setSnack({ open: true, message: 'Revisión de especificaciones técnicas confirmada', severity: 'success' });
  };

  // CASO DE USO 6: COMPARAR CONTRA REFERENCIA ESPERADA
  const getComparison = (spec: string) => {
    const expected = specsBase[spec] || '';
    const real = inspeccion?.verificacionTecnica[spec]?.valor || '';
    const status = inspeccion?.verificacionTecnica[spec]?.estado || 'pendiente';
    if (status === 'pendiente' || !real) return { label: 'Pendiente', color: 'warning' as const };
    if (status === 'no_aplica') return { label: 'No aplica', color: 'default' as const };
    return real.toLowerCase().includes(expected.toLowerCase()) || expected.toLowerCase().includes(real.toLowerCase())
      ? { label: 'Coincide', color: 'success' as const }
      : { label: 'Diferente', color: 'error' as const };
  };

  const calcResumenComparativo = () => {
    if (!inspeccion) return { coinciden: 0, diferentes: 0, pendientes: 0, total: 0, porcentaje: 0, esIncompleto: true };
    let coinciden = 0;
    let diferentes = 0;
    let pendientes = 0;

    specKeys.forEach((spec) => {
      const cmp = getComparison(spec);
      if (cmp.label === 'Coincide') coinciden++;
      else if (cmp.label === 'Diferente') diferentes++;
      else if (cmp.label === 'Pendiente') pendientes++;
    });

    const total = specKeys.length;
    const porcentaje = total > 0 ? Math.round((coinciden / total) * 100) : 0;
    const esIncompleto = pendientes > 0;

    return { coinciden, diferentes, pendientes, total, porcentaje, esIncompleto };
  };

  // CASO DE USO 7: REGISTRAR HALLAZGOS
  const onAddHallazgo = () => {
    if (!inspeccion || !nuevoHallazgo.descripcion) return;
    agregarHallazgo(inspeccion.id, {
      ...nuevoHallazgo,
      origen: currentUser?.name || 'Inspector',
      registradoPor: currentUser?.name || 'Inspector'
    });
    setInspeccionState((prev) => (getInspeccionPorId(inspeccion.id) || prev));
    setNuevoHallazgo({ tipo: 'fisico', severidad: 'media', pasoAsociado: 'inspeccion_fisica', descripcion: '' });
    setSnack({ open: true, message: 'Hallazgo registrado y vinculado al expediente', severity: 'success' });
  };

  const tieneHallazgosCriticos = inspeccion?.hallazgos.some((h) => h.severidad === 'critica' || h.severidad === 'alta');

  // CASO DE USO 8: ADJUNTAR EVIDENCIA
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Flujo alterno: Validar tamaño máximo (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSnack({
        open: true,
        message: 'Flujo Alterno: El archivo excede el tamaño máximo permitido de 5MB. Carga rechazada.',
        severity: 'error'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview({
        nombre: file.name,
        tipo: file.type || 'application/octet-stream',
        tamano: file.size,
        contenido: reader.result as string
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onSubirEvidencia = () => {
    if (!inspeccion || !filePreview) return;
    agregarEvidencia(inspeccion.id, {
      nombre: filePreview.nombre,
      tipo: filePreview.tipo,
      contenido: filePreview.contenido,
      tamano: filePreview.tamano,
      hallazgoId: nuevaEvidencia.hallazgoId || undefined,
      etapa: nuevaEvidencia.etapa,
      registradoPor: currentUser?.name || 'Inspector'
    });
    setInspeccionState((prev) => (getInspeccionPorId(inspeccion.id) || prev));
    setFilePreview(null);
    setNuevaEvidencia({ etapa: 'general', hallazgoId: '' });
    setSnack({ open: true, message: 'Evidencia adjuntada y vinculada correctamente', severity: 'success' });
  };

  // CASO DE USO 9: EMITIR RESULTADO DE INSPECCIÓN
  const [resultadoInput, setResultadoInput] = useState<string>('');
  const [comentarioFinalInput, setComentarioFinalInput] = useState<string>('');

  const validarEtapasObligatorias = () => {
    if (!inspeccion) return { listo: false, faltantes: [] };
    const faltantes: string[] = [];

    if (!inspeccion.documentacion.resultado) {
      faltantes.push('Validación Documental (Dictamen pendiente)');
    }
    if (!inspeccion.inspeccionFisica.condicionGeneral) {
      faltantes.push('Inspección Física (Condición general sin evaluar)');
    }
    if (inspeccion.inspeccionFisica.condicionGeneral === 'con_dano' && !inspeccion.inspeccionFisica.observaciones) {
      faltantes.push('Inspección Física con daño (Observación detallada obligatoria)');
    }
    if (!inspeccion.verificacionTecnicaConfirmada) {
      faltantes.push('Verificación Técnica (Confirmación de specs pendiente)');
    }

    return { listo: faltantes.length === 0, faltantes };
  };

  const sugerirResultadoAutomatico = () => {
    if (!inspeccion) return 'conforme';
    if (tieneHallazgosCriticos || inspeccion.inspeccionFisica.condicionGeneral === 'con_dano' || inspeccion.documentacion.resultado === 'con_discrepancias') {
      return 'no_conforme';
    }
    if (inspeccion.hallazgos.length > 0 || inspeccion.inspeccionFisica.condicionGeneral === 'con_observaciones' || inspeccion.documentacion.resultado === 'incompleta') {
      return 'conforme_observaciones';
    }
    return 'conforme';
  };

  const onEmitirResultado = () => {
    if (!inspeccion) return;
    const checkEtapas = validarEtapasObligatorias();

    // Flujo alterno: Faltan etapas obligatorias
    if (!checkEtapas.listo) {
      setSnack({
        open: true,
        message: `No se puede emitir el resultado. Etapas requeridas pendientes: ${checkEtapas.faltantes.join(', ')}`,
        severity: 'error'
      });
      return;
    }

    const dictamenAFirmar = (resultadoInput || inspeccion.resultado || sugerirResultadoAutomatico()) as Inspeccion['resultado'];
    emitirResultado(inspeccion.id, dictamenAFirmar, comentarioFinalInput || inspeccion.comentarioFinal);
    setInspeccionState((prev) => (getInspeccionPorId(inspeccion.id) || prev));
    setSnack({ open: true, message: 'Dictamen de resultado emitido y consolidado correctamente', severity: 'success' });
  };

  // CASO DE USO 10: GESTIONAR DISPOSICIÓN FINAL
  const [disposicionInput, setDisposicionInput] = useState<string>('');
  const [justificacionInput, setJustificacionInput] = useState<string>('');

  const sugerirDisposicionAutomatica = () => {
    const res = inspeccion?.resultado || resultadoInput;
    if (res === 'conforme') return 'liberacion';
    if (res === 'no_conforme') return 'retencion';
    return 'liberacion';
  };

  const onGestionarDisposicion = () => {
    if (!inspeccion) return;
    const dispAEjecutar = (disposicionInput || inspeccion.disposicion || sugerirDisposicionAutomatica()) as Inspeccion['disposicion'];
    if (!justificacionInput && !inspeccion.justificacionDisposicion) {
      setSnack({ open: true, message: 'Debe ingresar una justificación o motivo para la disposición final', severity: 'warning' });
      return;
    }
    gestionarDisposicion(inspeccion.id, dispAEjecutar, justificacionInput || inspeccion.justificacionDisposicion);
    setInspeccionState((prev) => (getInspeccionPorId(inspeccion.id) || prev));
    setSnack({ open: true, message: 'Disposición final aplicada y expediente cerrado con trazabilidad', severity: 'success' });
  };

  // Flujo alterno CU 10: Devolver expediente a inspección
  const onConfirmarDevolucion = () => {
    if (!inspeccion || !motivoDevolucion.trim()) return;
    const supervisor = currentUser?.name ? `${currentUser.name} (Supervisor)` : 'Supervisor Autorizado';
    devolverAInspeccion(inspeccion.id, motivoDevolucion, supervisor);
    setInspeccionState((prev) => (getInspeccionPorId(inspeccion.id) || prev));
    setOpenModalDevolucion(false);
    setMotivoDevolucion('');
    setSnack({
      open: true,
      message: 'Expediente devuelto a proceso de inspección para revisión adicional',
      severity: 'info'
    });
  };

  const comparativo = calcResumenComparativo();
  const etapasCheck = validarEtapasObligatorias();

  return (
    <Box sx={{ pb: 4 }}>
      {/* DIÁLOGO CASO DE USO 2: CREAR REGISTRO INICIAL DE INSPECCIÓN */}
      <Dialog
        open={openModalCreacion}
        onClose={() => {
          if (!inspeccionState) navigate('/inventario');
          else setOpenModalCreacion(false);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FolderSpecialIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Crear Registro Inicial de Inspección
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Apertura formal del expediente de inspección del equipo
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2" paragraph color="text.secondary">
            Se asociará formalmente un nuevo expediente de inspección al equipo recibido:
          </Typography>

          <Card variant="outlined" sx={{ bgcolor: '#f8fafc', mb: 3 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Ingreso (Folio):</Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">{ingreso.folio}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Proveedor / Remitente:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ingreso.proveedor}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Modelo de Equipo:</Typography>
                  <Typography variant="body2" fontWeight={600}>{getModeloName()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Número de Serie:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ingreso.numeroSerie || 'S/N'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Asignar Estado Inicial de Inspección:
          </Typography>

          <FormControl fullWidth sx={{ mt: 1 }}>
            <Select
              value={estadoInicialSeleccionado}
              onChange={(e) => setEstadoInicialSeleccionado(e.target.value as EstadoInspeccion)}
            >
              <MenuItem value="pendiente_revision">
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>Pendiente de revisión</Typography>
                  <Typography variant="caption" color="text.secondary">Ingresa directamente a cola de espera para revisión física y documental.</Typography>
                </Box>
              </MenuItem>
              <MenuItem value="cuarentena_tecnica">
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="warning.main">En cuarentena técnica</Typography>
                  <Typography variant="caption" color="text.secondary">Requiere retención precautoria antes de su revisión técnica detallada.</Typography>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={() => navigate('/inventario')}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssignmentIcon />}
            onClick={() => handleConfirmarCreacion(estadoInicialSeleccionado)}
            sx={{ fontWeight: 700 }}
          >
            Abrir Expediente de Inspección
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO CASO DE USO 10 (Flujo Alterno): DEVOLVER A INSPECCIÓN */}
      <Dialog open={openModalDevolucion} onClose={() => setOpenModalDevolucion(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReplayIcon color="warning" />
          <Typography variant="h6" fontWeight={700}>Devolver a Inspección</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" paragraph>
            El expediente retornará al estado <strong>"En proceso de inspección"</strong> para revisión o corrección adicional por el inspector técnico.
          </Typography>
          <TextField
            label="Motivo o Justificación del Retorno"
            fullWidth
            multiline
            rows={3}
            value={motivoDevolucion}
            onChange={(e) => setMotivoDevolucion(e.target.value)}
            placeholder="Especifique qué aspectos deben re-evaluarse..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button color="inherit" onClick={() => setOpenModalDevolucion(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!motivoDevolucion.trim()}
            onClick={onConfirmarDevolucion}
            sx={{ fontWeight: 700 }}
          >
            Confirmar Retorno
          </Button>
        </DialogActions>
      </Dialog>

      {/* PREVISUALIZACIÓN DE EVIDENCIA ADJUNTA */}
      <Dialog open={Boolean(previewEvidencia)} onClose={() => setPreviewEvidencia(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>{previewEvidencia?.nombre}</Typography>
          <IconButton onClick={() => setPreviewEvidencia(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: 'center' }}>
          {previewEvidencia?.tipo.startsWith('image/') ? (
            <img
              src={previewEvidencia.contenido}
              alt={previewEvidencia.nombre}
              style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px' }}
            />
          ) : (
            <Box sx={{ py: 6 }}>
              <AttachFileIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" fontWeight={600}>{previewEvidencia?.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">
                Tipo: {previewEvidencia?.tipo} | Tamaño: {((previewEvidencia?.tamano || 0) / 1024).toFixed(0)} KB
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setPreviewEvidencia(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* VISTA PRINCIPAL DEL EXPEDIENTE */}
      {inspeccion ? (
        <Box>
          {/* Encabezado del Expediente */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton onClick={() => navigate('/inventario')} color="primary">
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" fontWeight={700}>
                    Expediente {inspeccion.folio}
                  </Typography>
                  <Chip
                    label={`Estado: ${ESTADO_NOMBRES[inspeccion.estado] || inspeccion.estado}`}
                    color={ESTADO_COLOR[inspeccion.estado] || 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                  {inspeccion.resultado && (
                    <Chip
                      label={`Dictamen: ${inspeccion.resultado.toUpperCase().replace('_', ' ')}`}
                      color={inspeccion.resultado === 'conforme' ? 'success' : inspeccion.resultado === 'no_conforme' ? 'error' : 'warning'}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Ingreso: <strong>{ingreso.folio}</strong> | Equipo: <strong>{getModeloName()}</strong> | Serial: <strong>{ingreso.numeroSerie || 'S/N'}</strong>
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<PersonIcon />}
                label={`Inspector: ${currentUser?.name || 'Inspector'}`}
                variant="outlined"
                color="info"
              />
            </Stack>
          </Box>

          {/* Alertas context del Expediente */}
          {esNuevaCreacion && (
            <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="inherit" />} sx={{ mb: 2 }}>
              <strong>Expediente Abierto:</strong> Registro de inspección <strong>{inspeccion.folio}</strong> creado exitosamente en estado <em>"{ESTADO_NOMBRES[inspeccion.estado]}"</em>.
            </Alert>
          )}

          {tieneHallazgosCriticos && (
            <Alert severity="warning" icon={<ErrorOutlineIcon fontSize="inherit" />} sx={{ mb: 2 }}>
              <AlertTitle>¡Atención: Hallazgos de Alta Severidad / Críticos Detectados!</AlertTitle>
              Este equipo cuenta con hallazgos graves o críticos registrados. El sistema sugiere clasificar la inspección como <strong>"No Conforme"</strong> o enviarla a <strong>Retención Precautoria</strong>.
            </Alert>
          )}

          {inspeccion.historialDevoluciones && inspeccion.historialDevoluciones.length > 0 && (
            <Alert severity="info" icon={<ReplayIcon fontSize="inherit" />} sx={{ mb: 2 }}>
              <AlertTitle>Expediente Devuelto por Supervisor ({inspeccion.historialDevoluciones.length} re-inspección(es))</AlertTitle>
              Último motivo: <em>"{inspeccion.historialDevoluciones[inspeccion.historialDevoluciones.length - 1].motivo}"</em> por {inspeccion.historialDevoluciones[inspeccion.historialDevoluciones.length - 1].usuario}.
            </Alert>
          )}

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="1. Recepción" icon={<AssignmentIcon />} iconPosition="start" />
              <Tab label="2. Validar Documentación" icon={<FactCheckIcon />} iconPosition="start" />
              <Tab label="3. Inspección Física" icon={<RuleIcon />} iconPosition="start" />
              <Tab label="4. Especificaciones Técnicas" icon={<VerifiedUserIcon />} iconPosition="start" />
              <Tab label="5. Comparar Specs" icon={<CompareArrowsIcon />} iconPosition="start" />
              <Tab label={`6. Hallazgos (${inspeccion.hallazgos.length})`} icon={<WarningAmberIcon />} iconPosition="start" />
              <Tab label={`7. Evidencias (${inspeccion.evidencias.length})`} icon={<AttachFileIcon />} iconPosition="start" />
              <Tab label="8. Dictamen & Disposición" icon={<CheckCircleOutlineIcon />} iconPosition="start" />
            </Tabs>

            <Divider sx={{ my: 1 }} />

            {/* TAB 0: DATOS DE RECEPCIÓN / INGRESO */}
            <TabPanel value={tab} index={0}>
              <Typography variant="h6" fontWeight={700} gutterBottom color="primary">Datos de Recepción del Equipo</Typography>
              <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                {[
                  ['Folio de Ingreso', ingreso.folio],
                  ['Fecha de Recepción', new Date(ingreso.fecha).toLocaleDateString('es-ES')],
                  ['Origen / Procedencia', ingreso.origen.toUpperCase()],
                  ['Proveedor / Remitente', ingreso.proveedor],
                  ['Tipo de Equipo', ingreso.tipoEquipo.toUpperCase()],
                  ['Cantidad Recibida', String(ingreso.cantidad)],
                  ['Modelo Registrado', getModeloName()],
                  ['Número de Serie', ingreso.numeroSerie || 'S/N'],
                  ['Número de Parte', ingreso.numeroParte || 'N/A'],
                  ['Documento de Referencia', ingreso.documentoReferencia || 'Sin documento registrado'],
                  ['Estado Físico al Llegar', ingreso.estadoFisico],
                  ['Registrado Por', ingreso.registradoPor]
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={6} md={3} key={label}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body1" fontWeight={600}>{value}</Typography>
                  </Grid>
                ))}
                {ingreso.observaciones && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Observaciones al Momento del Ingreso</Typography>
                    <Typography variant="body2" sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                      {ingreso.observaciones}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </TabPanel>

            {/* TAB 1: CASO DE USO 3 - VALIDAR DOCUMENTACIÓN DEL EQUIPO */}
            <TabPanel value={tab} index={1}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                  Caso de Uso 3: Validar Documentación del Equipo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Verifique la documentación disponible, su coincidencia con los datos clave del equipo recibido y registre el resultado documental.
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
                      1. Documentos Disponibles / Adjuntos:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                      {([
                        ['fichaTecnica', 'Ficha Técnica oficial del fabricante / equipo'],
                        ['manuales', 'Manuales de operación / instalación / usuario'],
                        ['certificados', 'Certificados de garantía / calibración / calidad'],
                        ['etiquetas', 'Etiquetas documentadas o placas de serie legibles'],
                        ['documentoReferencia', `Documento de referencia (${ingreso.documentoReferencia || 'Factura / Guía / Orden'})`]
                      ] as const).map(([field, label]) => (
                        <FormControlLabel
                          key={field}
                          control={
                            <Checkbox
                              checked={Boolean(inspeccion.documentacion[field])}
                              onChange={() => handleDocCheckbox(field)}
                            />
                          }
                          label={<Typography variant="body2">{label}</Typography>}
                        />
                      ))}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
                      2. Validar Coincidencia de Datos Clave (Documento vs Recibido):
                    </Typography>
                    <Typography variant="caption" color="text.secondary" paragraph>
                      Verifique que la información en papel o digital coincida con el equipo físico:
                    </Typography>

                    <Grid container spacing={1}>
                      {[
                        ['marca', 'Marca coincide', `Esperado: ${modelo?.marca || 'N/A'}`],
                        ['modelo', 'Modelo coincide', `Esperado: ${ingreso.modelo}`],
                        ['numeroParte', 'Part Number coincide', `Esperado: ${ingreso.numeroParte || 'N/A'}`],
                        ['numeroSerie', 'Número de Serie coincide', `Esperado: ${ingreso.numeroSerie || 'N/A'}`]
                      ].map(([key, label, subtitle]) => {
                        const coinc = inspeccion.documentacion.coincidenciaDatosClave || {
                          marca: true, modelo: true, numeroParte: true, numeroSerie: true
                        };
                        const val = coinc[key as keyof typeof coinc];
                        return (
                          <Grid item xs={12} sm={6} key={key}>
                            <Paper variant="outlined" sx={{ p: 1, bgcolor: val ? '#f0fdf4' : '#fef2f2', borderColor: val ? '#bbf7d0' : '#fecaca' }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={val}
                                    onChange={() => handleCoincidenciaDato(key as any)}
                                    color={val ? 'success' : 'error'}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                                    <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                                  </Box>
                                }
                              />
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: 'primary.main' }}>
                      3. Registrar Dictamen Documental:
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
                      <InputLabel id="res-doc-select-label">Dictamen Documental</InputLabel>
                      <Select
                        labelId="res-doc-select-label"
                        label="Dictamen Documental"
                        value={inspeccion.documentacion.resultado}
                        onChange={(e) => handleDocSelect('resultado', e.target.value)}
                      >
                        <MenuItem value="completa">Documentación Completa (Sin objeciones)</MenuItem>
                        <MenuItem value="incompleta">Documentación Incompleta (Faltan manuales/certificados)</MenuItem>
                        <MenuItem value="con_discrepancias">Con Discrepancias (Datos clave no coinciden)</MenuItem>
                        <MenuItem value="no_proporcionada">Documentación No Proporcionada (Flujo alterno)</MenuItem>
                      </Select>
                    </FormControl>

                    {inspeccion.documentacion.resultado === 'no_proporcionada' && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <strong>Flujo Alterno:</strong> Se marcó "Documentación no proporcionada". La inspección puede continuar bajo reserva documental.
                      </Alert>
                    )}

                    {inspeccion.documentacion.resultado === 'con_discrepancias' && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <strong>Flujo Alterno:</strong> Se detectaron discrepancias documentales. Debe registrar el detalle en las observaciones para continuar bajo discrepancia.
                      </Alert>
                    )}

                    <TextField
                      label="Observaciones y Registro de Discrepancias Documentales"
                      fullWidth
                      multiline
                      rows={4}
                      value={inspeccion.documentacion.observaciones}
                      onChange={(e) => handleDocSelect('observaciones', e.target.value)}
                      placeholder="Detalle aquí cualquier discrepancia en seriales, modelos o falta de fichas técnicas..."
                    />
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* TAB 2: CASO DE USO 4 - EJECUTAR INSPECCIÓN FÍSICA */}
            <TabPanel value={tab} index={2}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                  Caso de Uso 4: Ejecutar Inspección Física
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Examine el estado físico visible del equipo y revise su checklist específico ({ingreso.tipoEquipo.toUpperCase()}).
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">
                      Lista de Verificación Física ({ingreso.tipoEquipo.toUpperCase()}):
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 1 }}>
                      {checklistFisico.map((item, i) => (
                        <FormControlLabel
                          key={i}
                          control={<Checkbox checked={Boolean(checksFisicos[i])} onChange={() => handleChecklist(i)} />}
                          label={<Typography variant="body2">{item}</Typography>}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">
                      Evaluación Física General & Accesorios:
                    </Typography>

                    <FormControl fullWidth sx={{ my: 1.5 }}>
                      <InputLabel id="cond-gen-label">Condición Física General</InputLabel>
                      <Select
                        labelId="cond-gen-label"
                        label="Condición Física General"
                        value={inspeccion.inspeccionFisica.condicionGeneral}
                        onChange={(e) => handleFisica('condicionGeneral', e.target.value)}
                      >
                        <MenuItem value="sin_dano">Sin daño (Excelente / Óptimo)</MenuItem>
                        <MenuItem value="con_observaciones">Con observaciones (Desgaste menor / estético)</MenuItem>
                        <MenuItem value="con_dano">Con daño visible (Golpes / Rayones graves / Ruptura)</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Flujo Alterno: Obligación de registrar observación y evidencia si hay daño visible */}
                    {inspeccion.inspeccionFisica.condicionGeneral === 'con_dano' && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <strong>Flujo Alterno Requerido:</strong> Al presentar daño visible, es <strong>OBLIGATORIO</strong> registrar el detalle del daño en observaciones y adjuntar evidencia fotográfica en la pestaña 7.
                      </Alert>
                    )}

                    <TextField
                      label="Seriales y Placa de Identificación Visibles"
                      fullWidth
                      size="small"
                      sx={{ mb: 2 }}
                      value={inspeccion.inspeccionFisica.serialesVisibles}
                      onChange={(e) => handleFisica('serialesVisibles', e.target.value)}
                      placeholder="Seriales legibles en chasis o etiquetas..."
                    />

                    {/* Flujo Alterno: Registro de Accesorios Faltantes */}
                    <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1, border: '1px dashed #cbd5e1', mb: 2 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">Accesorios Faltantes (Flujo Alterno):</Typography>
                      <TextField
                        placeholder="Ej: Falta cargador de 65W, cable HDMI..."
                        fullWidth
                        size="small"
                        sx={{ mt: 1, mb: 1 }}
                        value={inspeccion.inspeccionFisica.accesoriosFaltantes || ''}
                        onChange={(e) => handleFisica('accesoriosFaltantes', e.target.value)}
                      />
                      {inspeccion.inspeccionFisica.accesoriosFaltantes && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          onClick={handleCrearHallazgoAccesorioFaltante}
                          sx={{ textTransform: 'none' }}
                        >
                          Auto-crear Hallazgo por Faltante
                        </Button>
                      )}
                    </Box>

                    <TextField
                      label="Observaciones Físicas Específicas *"
                      fullWidth
                      multiline
                      rows={3}
                      value={inspeccion.inspeccionFisica.observaciones}
                      onChange={(e) => handleFisica('observaciones', e.target.value)}
                      error={inspeccion.inspeccionFisica.condicionGeneral === 'con_dano' && !inspeccion.inspeccionFisica.observaciones}
                      helperText={
                        inspeccion.inspeccionFisica.condicionGeneral === 'con_dano' && !inspeccion.inspeccionFisica.observaciones
                          ? 'Requerido por daño visible'
                          : ''
                      }
                    />
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* TAB 3: CASO DE USO 5 - VERIFICAR ESPECIFICACIONES TÉCNICAS */}
            <TabPanel value={tab} index={3}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    Caso de Uso 5: Verificar Especificaciones Técnicas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Compruebe los atributos reales detectados frente a la plantilla técnica requerida para <strong>{getModeloName()}</strong>.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color={inspeccion.verificacionTecnicaConfirmada ? 'success' : 'primary'}
                  startIcon={inspeccion.verificacionTecnicaConfirmada ? <CheckCircleOutlineIcon /> : <VerifiedUserIcon />}
                  onClick={handleConfirmarRevisiónTecnica}
                  sx={{ fontWeight: 700 }}
                >
                  {inspeccion.verificacionTecnicaConfirmada ? 'Revisión Técnica Confirmada' : 'Confirmar Revisión Técnica'}
                </Button>
              </Box>

              {!modelo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Flujo Alterno:</strong> El tipo de equipo no tiene plantilla específica de catálogo configurada. El sistema cargó automáticamente una <strong>Plantilla Genérica</strong> por tipo ({ingreso.tipoEquipo}).
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                      <TableCell width="25%"><strong>ATRIBUTO TÉCNICO</strong></TableCell>
                      <TableCell width="30%"><strong>ESPECIFICACIÓN REQUERIDA</strong></TableCell>
                      <TableCell width="30%"><strong>VALOR REAL VERIFICADO</strong></TableCell>
                      <TableCell width="15%"><strong>ESTADO</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {specKeys.map((spec) => {
                      const req = specsBase[spec];
                      const valState = inspeccion.verificacionTecnica[spec] || { valor: '', estado: 'pendiente' };
                      return (
                        <TableRow key={spec} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                              {spec.replace(/([A-Z])/g, ' $1')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{req}</Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              fullWidth
                              placeholder="Capturar valor verificado..."
                              value={valState.valor}
                              onChange={(e) => setTechValue(spec, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={valState.estado}
                                onChange={(e) => setTechStatus(spec, e.target.value as any)}
                              >
                                <MenuItem value="verificado">Verificado</MenuItem>
                                <MenuItem value="pendiente">Pendiente</MenuItem>
                                <MenuItem value="no_aplica">No aplica</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* TAB 4: CASO DE USO 6 - COMPARAR CONTRA REFERENCIA ESPERADA */}
            <TabPanel value={tab} index={4}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                  Caso de Uso 6: Comparar contra Referencia Esperada
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  El sistema analiza la diferencia entre las especificaciones requeridas, los datos documentales y la verificación real.
                </Typography>
              </Box>

              {/* Resumen de Conformidad */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h4" fontWeight={700} color="success.main">{comparativo.coinciden}</Typography>
                      <Typography variant="body2" color="success.dark" fontWeight={600}>Atributos Coincidentes</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h4" fontWeight={700} color="error.main">{comparativo.diferentes}</Typography>
                      <Typography variant="body2" color="error.dark" fontWeight={600}>Diferencias Detectadas</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: '#fffbeb', borderColor: '#fde68a' }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h4" fontWeight={700} color="warning.main">{comparativo.pendientes}</Typography>
                      <Typography variant="body2" color="warning.dark" fontWeight={600}>Campos Pendientes</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
                    <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="h4" fontWeight={700} color="primary.main">{comparativo.porcentaje}%</Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Índice Conformidad Technical</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {comparativo.esIncompleto && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Flujo Alterno:</strong> Se detectaron {comparativo.pendientes} campos pendientes de verificación. El dictamen comparativo actual se clasifica como <strong>"Incompleto (campos pendientes)"</strong>.
                </Alert>
              )}

              {!modelo && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Flujo Alterno:</strong> No existe especificación de catálogo esperada. Se realiza la comparación directa contra los datos del documento de recepción/ingreso.
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                      <TableCell><strong>ATRIBUTO / CRITERIO</strong></TableCell>
                      <TableCell><strong>REFERENCIA ESPERADA</strong></TableCell>
                      <TableCell><strong>VERIFICADO EN REVISIÓN</strong></TableCell>
                      <TableCell align="center"><strong>ESTADO DE CONFORMIDAD</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* Fila de Datos Clave Documentales */}
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell colSpan={4}>
                        <Typography variant="caption" fontWeight={700} color="primary.main">COMPARACIÓN DE DATOS CLAVE DOCUMENTALES:</Typography>
                      </TableCell>
                    </TableRow>
                    {[
                      ['Marca', modelo?.marca || 'Según Recepción', ingreso.modelo, inspeccion.documentacion.coincidenciaDatosClave?.marca ?? true],
                      ['Modelo', modelo?.nombre || ingreso.modelo, getModeloName(), inspeccion.documentacion.coincidenciaDatosClave?.modelo ?? true],
                      ['Número de Serie', ingreso.numeroSerie || 'Registrado', inspeccion.inspeccionFisica.serialesVisibles || ingreso.numeroSerie || 'S/N', inspeccion.documentacion.coincidenciaDatosClave?.numeroSerie ?? true]
                    ].map(([crit, esp, verif, coincide]) => (
                      <TableRow key={crit} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{crit}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{String(esp)}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{String(verif)}</Typography></TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={coincide ? 'Coincide' : 'Discrepancia'}
                            color={coincide ? 'success' : 'error'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Filas de Atributos Técnicos */}
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell colSpan={4}>
                        <Typography variant="caption" fontWeight={700} color="primary.main">COMPARACIÓN DE ATRIBUTOS TÉCNICOS:</Typography>
                      </TableCell>
                    </TableRow>
                    {specKeys.map((spec) => {
                      const expected = specsBase[spec];
                      const real = inspeccion.verificacionTecnica[spec]?.valor || '---';
                      const cmp = getComparison(spec);
                      return (
                        <TableRow key={spec} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                              {spec.replace(/([A-Z])/g, ' $1')}
                            </Typography>
                          </TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{expected}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{real}</Typography></TableCell>
                          <TableCell align="center">
                            <Chip size="small" label={cmp.label} color={cmp.color} sx={{ fontWeight: 700 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            {/* TAB 5: CASO DE USO 7 - REGISTRAR HALLAZGOS */}
            <TabPanel value={tab} index={5}>
              <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Caso de Uso 7: Registrar Hallazgos / No Conformidades
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Documente defectos, faltantes u observaciones detectadas durante la inspección.
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="tipo-hallazgo-label">Tipo de Hallazgo</InputLabel>
                      <Select
                        labelId="tipo-hallazgo-label"
                        label="Tipo de Hallazgo"
                        value={nuevoHallazgo.tipo}
                        onChange={(e) => setNuevoHallazgo((h) => ({ ...h, tipo: e.target.value as any }))}
                      >
                        <MenuItem value="documental">Documental (Discrepancia / Faltante)</MenuItem>
                        <MenuItem value="fisico">Físico (Daño / Golpe / Desgaste)</MenuItem>
                        <MenuItem value="tecnico">Técnico (Incompatibilidad / Falla)</MenuItem>
                        <MenuItem value="accesorio_faltante">Accesorio Faltante</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="severidad-label">Severidad del Hallazgo</InputLabel>
                      <Select
                        labelId="severidad-label"
                        label="Severidad del Hallazgo"
                        value={nuevoHallazgo.severidad}
                        onChange={(e) => setNuevoHallazgo((h) => ({ ...h, severidad: e.target.value as any }))}
                      >
                        <MenuItem value="baja">Baja (Observación leve)</MenuItem>
                        <MenuItem value="media">Media (Moderada)</MenuItem>
                        <MenuItem value="alta">Alta (Grave / Retención)</MenuItem>
                        <MenuItem value="critica">Crítica (Rechazo Inmediato)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="paso-label">Vincular con Etapa</InputLabel>
                      <Select
                        labelId="paso-label"
                        label="Vincular con Etapa"
                        value={nuevoHallazgo.pasoAsociado}
                        onChange={(e) => setNuevoHallazgo((h) => ({ ...h, pasoAsociado: e.target.value }))}
                      >
                        <MenuItem value="documentacion">Validación Documental</MenuItem>
                        <MenuItem value="inspeccion_fisica">Inspección Física</MenuItem>
                        <MenuItem value="verificacion_tecnica">Verificación Técnica</MenuItem>
                        <MenuItem value="general">Expediente General</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Descripción Detallada del Hallazgo *"
                      fullWidth
                      multiline
                      rows={2}
                      value={nuevoHallazgo.descripcion}
                      onChange={(e) => setNuevoHallazgo((h) => ({ ...h, descripcion: e.target.value }))}
                      placeholder="Describa claramente la no conformidad encontrada..."
                    />
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={onAddHallazgo}
                      disabled={!nuevoHallazgo.descripcion.trim()}
                      sx={{ fontWeight: 700 }}
                    >
                      Guardar Hallazgo en Expediente
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Hallazgos Registrados ({inspeccion.hallazgos.length}):
              </Typography>
              {inspeccion.hallazgos.length > 0 ? (
                <List>
                  {inspeccion.hallazgos.map((h) => (
                    <ListItem
                      key={h.id}
                      sx={{
                        border: '1px solid #cbd5e1',
                        borderRadius: 2,
                        mb: 1.5,
                        bgcolor: h.severidad === 'critica' || h.severidad === 'alta' ? '#fff5f5' : '#ffffff'
                      }}
                      secondaryAction={
                        <IconButton color="error" onClick={() => eliminarHallazgo(inspeccion.id, h.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Chip
                          size="small"
                          label={h.severidad.toUpperCase()}
                          color={h.severidad === 'critica' ? 'error' : h.severidad === 'alta' ? 'warning' : 'info'}
                          sx={{ fontWeight: 700 }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight={700}>
                            [{h.tipo.toUpperCase()}] Vinculado a: {h.pasoAsociado}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
                            {h.descripcion}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  <strong>Flujo Alterno:</strong> No se han registrado no conformidades. El expediente continúa libre de hallazgos.
                </Alert>
              )}
            </TabPanel>

            {/* TAB 6: CASO DE USO 8 - ADJUNTAR EVIDENCIA */}
            <TabPanel value={tab} index={6}>
              <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Caso de Uso 8: Adjuntar Evidencia Documental o Visual
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Respalde las observaciones o no conformidades adjuntando fotografías, capturas o archivos de soporte.
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="etapa-ev-label">Asociar a Etapa</InputLabel>
                      <Select
                        labelId="etapa-ev-label"
                        label="Asociar a Etapa"
                        value={nuevaEvidencia.etapa}
                        onChange={(e) => setNuevaEvidencia((ev) => ({ ...ev, etapa: e.target.value }))}
                      >
                        <MenuItem value="documentacion">Validación Documental</MenuItem>
                        <MenuItem value="inspeccion_fisica">Inspección Física</MenuItem>
                        <MenuItem value="verificacion_tecnica">Verificación Técnica</MenuItem>
                        <MenuItem value="general">Expediente General</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel id="hallazgo-ev-label">Asociar a Hallazgo Específico (Opcional)</InputLabel>
                      <Select
                        labelId="hallazgo-ev-label"
                        label="Asociar a Hallazgo Específico (Opcional)"
                        value={nuevaEvidencia.hallazgoId}
                        onChange={(e) => setNuevaEvidencia((ev) => ({ ...ev, hallazgoId: e.target.value }))}
                      >
                        <MenuItem value="">Ninguno (Evidencia General)</MenuItem>
                        {inspeccion.hallazgos.map((h) => (
                          <MenuItem key={h.id} value={h.id}>
                            [{h.severidad.toUpperCase()}] {h.tipo}: {h.descripcion.slice(0, 35)}...
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <input
                      type="file"
                      id="fileInput"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={onFileSelected}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="fileInput">
                      <Button component="span" variant="outlined" startIcon={<AttachFileIcon />} color="primary">
                        Seleccionar Archivo de Soporte
                      </Button>
                    </label>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      Permitido: PNG, JPG, PDF, DOCX (Tamaño Máximo: 5 MB)
                    </Typography>
                  </Grid>

                  {filePreview && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f1f5f9' }}>
                        <AttachFileIcon color="primary" />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{filePreview.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(filePreview.tamano / 1024).toFixed(0)} KB | {filePreview.tipo}
                          </Typography>
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                        <IconButton color="error" onClick={() => setFilePreview(null)} size="small"><CloseIcon /></IconButton>
                        <Button variant="contained" size="small" onClick={onSubirEvidencia} sx={{ fontWeight: 700 }}>
                          Subir Evidencia
                        </Button>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Evidencias Adjuntas en Expediente ({inspeccion.evidencias.length}):
              </Typography>

              {inspeccion.evidencias.length > 0 ? (
                <Grid container spacing={2}>
                  {inspeccion.evidencias.map((ev) => (
                    <Grid item xs={12} sm={6} md={4} key={ev.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>{ev.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Etapa: <strong>{ev.etapa}</strong> | Tamaño: {(ev.tamano / 1024).toFixed(0)} KB
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                            Cargado por: {ev.registradoPor}
                          </Typography>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => setPreviewEvidencia(ev)}
                            >
                              Ver Archivo
                            </Button>
                            <IconButton color="error" size="small" onClick={() => eliminarEvidencia(inspeccion.id, ev.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">No se han adjuntado evidencias fotográficas o documentales todavía.</Alert>
              )}
            </TabPanel>

            {/* TAB 7: CASOS DE USO 9 & 10 - DICTAMEN DE RESULTADO Y DISPOSICIÓN FINAL */}
            <TabPanel value={tab} index={7}>
              <Grid container spacing={3}>
                {/* CASO DE USO 9: EMITIR RESULTADO DE INSPECCIÓN */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                      Caso de Uso 9: Emitir Resultado de Inspección
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Consolide la evaluación técnica general y emita el dictamen formal.
                    </Typography>

                    {/* Resumen Consolidado */}
                    <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 1.5, border: '1px solid #e2e8f0', mb: 2 }}>
                      <Typography variant="caption" fontWeight={700} color="primary.main" display="block" gutterBottom>
                        RESUMEN DE ETAPAS DE INSPECCIÓN:
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Documental:</Typography>
                          <Typography variant="body2" fontWeight={600}>{inspeccion.documentacion.resultado || 'Pendiente'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Inspección Física:</Typography>
                          <Typography variant="body2" fontWeight={600}>{inspeccion.inspeccionFisica.condicionGeneral || 'Pendiente'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Specs Coincidencia:</Typography>
                          <Typography variant="body2" fontWeight={600}>{comparativo.porcentaje}% ({comparativo.coinciden}/{comparativo.total})</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Hallazgos / Evidencias:</Typography>
                          <Typography variant="body2" fontWeight={600}>{inspeccion.hallazgos.length} / {inspeccion.evidencias.length}</Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Validación Etapas Obligatorias */}
                    {!etapasCheck.listo && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTitle>Bloqueo de Emisión (Flujo Alterno)</AlertTitle>
                        No se puede emitir resultado final sin completar las etapas obligatorias:
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                          {etapasCheck.faltantes.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                      </Alert>
                    )}

                    {/* Sugerencia Automática */}
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Sugerencia Automática del Sistema: <strong>{sugerirResultadoAutomatico().toUpperCase().replace('_', ' ')}</strong>
                    </Alert>

                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Dictamen Final de Evaluación:
                    </Typography>

                    <RadioGroup
                      value={resultadoInput || inspeccion.resultado || sugerirResultadoAutomatico()}
                      onChange={(e) => setResultadoInput(e.target.value)}
                    >
                      <FormControlLabel value="conforme" control={<Radio color="success" />} label={<Typography variant="body2" fontWeight={600} color="success.main">Conforme (Aprobado sin objeciones)</Typography>} />
                      <FormControlLabel value="conforme_observaciones" control={<Radio color="warning" />} label={<Typography variant="body2" fontWeight={600} color="warning.dark">Conforme con Observaciones (Aprobado bajo condición)</Typography>} />
                      <FormControlLabel value="no_conforme" control={<Radio color="error" />} label={<Typography variant="body2" fontWeight={600} color="error.main">No Conforme (Rechazado por defectos / discrepancias)</Typography>} />
                    </RadioGroup>

                    <TextField
                      label="Comentario Final del Evaluador"
                      fullWidth
                      multiline
                      rows={3}
                      sx={{ my: 2 }}
                      value={comentarioFinalInput || inspeccion.comentarioFinal}
                      onChange={(e) => setComentarioFinalInput(e.target.value)}
                    />

                    <Button
                      variant="contained"
                      color="primary"
                      onClick={onEmitirResultado}
                      disabled={!etapasCheck.listo}
                      fullWidth
                      sx={{ fontWeight: 700 }}
                    >
                      {inspeccion.resultado ? 'Actualizar Dictamen de Resultado' : 'Emitir Resultado de Inspección'}
                    </Button>
                  </Paper>
                </Grid>

                {/* CASO DE USO 10: GESTIONAR DISPOSICIÓN FINAL */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2.5, opacity: inspeccion.resultado ? 1 : 0.6 }}>
                    <Typography variant="h6" fontWeight={700} color="primary" gutterBottom>
                      Caso de Uso 10: Gestionar Disposición Final
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Defina el destino interno del equipo (Supervisor o Responsable Autorizado).
                    </Typography>

                    {!inspeccion.resultado ? (
                      <Alert severity="warning">
                        Precondición requerida: Debe emitir un resultado formal en el Caso de Uso 9 antes de aplicar la disposición final.
                      </Alert>
                    ) : (
                      <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Sugerencia de Disposición: <strong>{sugerirDisposicionAutomatica().toUpperCase()}</strong>
                        </Alert>

                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          Seleccionar Disposición Final:
                        </Typography>

                        <RadioGroup
                          value={disposicionInput || inspeccion.disposicion || sugerirDisposicionAutomatica()}
                          onChange={(e) => setDisposicionInput(e.target.value)}
                        >
                          <FormControlLabel
                            value="liberacion"
                            control={<Radio color="success" />}
                            label={<Typography variant="body2" fontWeight={600}>Liberación Interna (Disponible para asignación)</Typography>}
                          />
                          <FormControlLabel
                            value="retencion"
                            control={<Radio color="warning" />}
                            label={<Typography variant="body2" fontWeight={600}>Retención Precautoria (Cuarentena / Reparación)</Typography>}
                          />
                          <FormControlLabel
                            value="rechazo"
                            control={<Radio color="error" />}
                            label={<Typography variant="body2" fontWeight={600}>Rechazo y Devolución (Retorno a proveedor / baja)</Typography>}
                          />
                        </RadioGroup>

                        <TextField
                          label="Justificación de la Disposición Final *"
                          fullWidth
                          multiline
                          rows={3}
                          sx={{ my: 2 }}
                          value={justificacionInput || inspeccion.justificacionDisposicion}
                          onChange={(e) => setJustificacionInput(e.target.value)}
                        />

                        <Stack direction="column" spacing={1.5}>
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={onGestionarDisposicion}
                            fullWidth
                            sx={{ fontWeight: 700 }}
                          >
                            {inspeccion.disposicion ? 'Actualizar Disposición y Cerrar' : 'Aplicar Disposición Final'}
                          </Button>

                          {/* Flujo alterno: Devolver expediente a revisión */}
                          <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<ReplayIcon />}
                            onClick={() => setOpenModalDevolucion(true)}
                            fullWidth
                            sx={{ fontWeight: 700 }}
                          >
                            Devolver Expediente a Inspección (Re-evaluación)
                          </Button>
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Cargando expediente de inspección...</Typography>
        </Paper>
      )}

      {/* SNACKBAR NOTIFICACIONES */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
