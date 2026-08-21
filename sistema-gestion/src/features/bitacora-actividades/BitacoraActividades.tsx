import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import {
  Box, Paper, Typography, Button, TextField, IconButton, Snackbar, Alert, Chip,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Divider
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';

import { useAuth } from '../../lib/auth';
import { nowTime } from '../../lib/store';
import { getByFecha, getFechasConActividades, registrar, eliminar, getByFiltros, enviarReportePorCorreo } from './service';
import { DiaCalendario, ActividadDiaria } from './types';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

function formatDate(fecha: Date): string {
  return `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')}`;
}

function generarCalendario(mes: number, anio: number, fechasConActividades: Map<string, number>): DiaCalendario[] {
  const hoyStr = formatDate(new Date());
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  let diaInicioSemana = primerDia.getDay();
  diaInicioSemana = diaInicioSemana === 0 ? 6 : diaInicioSemana - 1;

  const dias: DiaCalendario[] = [];
  const diasMesAnterior = new Date(anio, mes, 0).getDate();
  for (let i = diaInicioSemana - 1; i >= 0; i--) {
    const dia = diasMesAnterior - i;
    const fecha = formatDate(new Date(anio, mes - 1, dia));
    dias.push({ fecha, dia, esHoy: false, esMesActual: false, tieneActividades: false, cantidadActividades: 0 });
  }
  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const fecha = formatDate(new Date(anio, mes, dia));
    const cant = fechasConActividades.get(fecha) || 0;
    dias.push({ fecha, dia, esHoy: fecha === hoyStr, esMesActual: true, tieneActividades: cant > 0, cantidadActividades: cant });
  }
  const resto = 42 - dias.length;
  for (let dia = 1; dia <= resto; dia++) {
    const fecha = formatDate(new Date(anio, mes + 1, dia));
    dias.push({ fecha, dia, esHoy: false, esMesActual: false, tieneActividades: false, cantidadActividades: 0 });
  }
  return dias;
}

export default function BitacoraActividades() {
  const { currentUser } = useAuth();
  const hoy = new Date();
  
  const [tabActual, setTabActual] = useState(0);

  // Estados CU-01, CU-02, CU-03
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(formatDate(hoy));
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [snack, setSnack] = useState({ open: false, mensaje: '', severidad: 'success' as 'success' | 'error' });
  
  // Datos asíncronos
  const [actividades, setActividades] = useState<ActividadDiaria[]>([]);
  const [fechasConActividades, setFechasConActividades] = useState<Map<string, number>>(new Map());
  const [cargando, setCargando] = useState(false);

  // Estados CU-04 (Reportes)
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [reportes, setReportes] = useState<ActividadDiaria[]>([]);
  const [reporteGenerado, setReporteGenerado] = useState(false);

  // Estados Flujo de Dos Modales y Archivo Adjunto
  const [modalIngresoCorreo, setModalIngresoCorreo] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [correoDestino, setCorreoDestino] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState<{ nombre: string; base64: string } | null>(null);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const esAdmin = currentUser?.role === 'admin' || currentUser?.role === 'administrador';
  const userId = currentUser?.id || 1;

  const mostrarAlerta = (mensaje: string, severidad: 'success' | 'error' = 'success') => {
    setSnack({ open: true, mensaje, severidad });
  };

  const cargarCalendario = useCallback(async () => {
    if (!userId) return;
    const mapa = await getFechasConActividades(mes, anio, userId);
    setFechasConActividades(mapa);
  }, [mes, anio, userId]);

  const cargarActividadesFecha = useCallback(async () => {
    if (!userId || !fechaSeleccionada) return;
    setCargando(true);
    try {
      const data = await getByFecha(fechaSeleccionada, userId);
      setActividades(Array.isArray(data) ? data : []);
    } catch {
      setActividades([]);
    } finally {
      setCargando(false);
    }
  }, [fechaSeleccionada, userId]);

  useEffect(() => {
    cargarCalendario();
  }, [cargarCalendario]);

  useEffect(() => {
    cargarActividadesFecha();
  }, [cargarActividadesFecha]);

  const diasCalendario = generarCalendario(mes, anio, fechasConActividades);

  const mesAnterior = () => {
    let m = mes - 1;
    let a = anio;
    if (m < 0) { m = 11; a--; }
    setMes(m); setAnio(a);
  };

  const mesSiguiente = () => {
    let m = mes + 1;
    let a = anio;
    if (m > 11) { m = 0; a++; }
    setMes(m); setAnio(a);
  };

  const guardar = async () => {
    if (!titulo.trim() || !descripcion.trim()) {
      mostrarAlerta('Complete título y descripción', 'error');
      return;
    }
    try {
      await registrar({
        fecha: fechaSeleccionada,
        horaRegistro: nowTime(),
        usuario: currentUser?.name || 'Operador',
        usuarioId: String(userId),
        titulo: titulo.trim(),
        descripcion: descripcion.trim()
      });
      mostrarAlerta('Actividad registrada exitosamente');
      setTitulo('');
      setDescripcion('');
      await cargarActividadesFecha();
      await cargarCalendario();
    } catch {
      mostrarAlerta('Error al registrar la actividad', 'error');
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      await eliminar(id);
      mostrarAlerta('Actividad eliminada');
      await cargarActividadesFecha();
      await cargarCalendario();
    } catch {
      mostrarAlerta('Error al eliminar', 'error');
    }
  };

  const ejecutarReporte = async () => {
    setCargando(true);
    try {
      const data = await getByFiltros({
        fechaInicio: filtroFechaInicio || undefined,
        fechaFin: filtroFechaFin || undefined,
        usuarioId: filtroUsuario || undefined
      });
      setReportes(data);
      setReporteGenerado(true);
    } finally {
      setCargando(false);
    }
  };

  const limpiarFiltrosReporte = () => {
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setFiltroUsuario('');
    setReportes([]);
    setReporteGenerado(false);
  };

  const exportarCSV = () => {
    if (reportes.length === 0) return;
    const encabezados = ['ID,Fecha,Hora,Usuario,Titulo,Descripcion\n'];
    const filas = reportes.map(r => 
      `"${r.id}","${r.fecha}","${r.horaRegistro}","${r.usuario}","${r.titulo.replace(/"/g, '""')}","${r.descripcion.replace(/"/g, '""')}"`
    );
    const blob = new Blob([encabezados.concat(filas).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_actividades_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarAlerta('Reporte exportado exitosamente');
  };

  // Manejador para cargar archivo local desde el navegador
  const handleSeleccionarArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setArchivoAdjunto({
        nombre: file.name,
        base64: base64
      });
      mostrarAlerta(`Archivo "${file.name}" cargado para adjuntar`);
    };
    reader.readAsDataURL(file);
  };

  // Paso 1 -> Validar correo y avanzar a Modal 2
  const handleAvanzarAConfirmacion = () => {
    if (!correoDestino || !correoDestino.includes('@') || !correoDestino.includes('.')) {
      mostrarAlerta('Por favor ingrese un correo electrónico válido', 'error');
      return;
    }
    setModalIngresoCorreo(false);
    setModalConfirmacion(true);
  };

  // Regresar de Modal 2 a Modal 1
  const handleVolverAIngreso = () => {
    setModalConfirmacion(false);
    setModalIngresoCorreo(true);
  };

  // Enviar el correo definitivo
  const handleDespachoFinal = async () => {
    setEnviandoCorreo(true);
    try {
      const actividadesAEnviar = tabActual === 1 ? reportes : actividades;
      const rango = tabActual === 1 
        ? `${filtroFechaInicio || 'Inicio'} hasta ${filtroFechaFin || 'Fin'}` 
        : `Fecha única: ${fechaSeleccionada}`;

      const res = await enviarReportePorCorreo({
        destinatario: correoDestino.trim(),
        actividades: actividadesAEnviar,
        remitenteNombre: currentUser?.name || 'Administrador',
        rangoFechas: rango,
        archivoAdjunto: archivoAdjunto
      });

      mostrarAlerta(res.message);
      setModalConfirmacion(false);
      setModalIngresoCorreo(false);
      setCorreoDestino('');
      setArchivoAdjunto(null);
    } catch (err: any) {
      mostrarAlerta(err.message || 'Error al despachar el correo', 'error');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Bitácora de Actividades</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Registro diario, consulta cronológica y reportes de gestión operativa
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabActual} 
          onChange={(_, val) => setTabActual(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Mi Bitácora Diaria" />
          {esAdmin && (
            <Tab icon={<AssessmentIcon />} iconPosition="start" label="Módulo de Reportes (Admin)" />
          )}
        </Tabs>
      </Paper>

      {/* PESTAÑA 0: CALENDARIO Y REGISTRO */}
      {tabActual === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <IconButton onClick={mesAnterior}><ChevronLeftIcon /></IconButton>
              <Typography variant="subtitle1"><strong>{MESES[mes]}</strong> {anio}</Typography>
              <IconButton onClick={mesSiguiente}><ChevronRightIcon /></IconButton>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
              {DIAS_SEMANA.map((d) => (
                <Typography key={d} variant="caption" sx={{ textAlign: 'center', fontWeight: 600, color: 'grey.500' }}>
                  {d}
                </Typography>
              ))}
              {diasCalendario.map((dia) => (
                <Box
                  key={dia.fecha}
                  onClick={() => dia.esMesActual && setFechaSeleccionada(dia.fecha)}
                  sx={{
                    position: 'relative', textAlign: 'center', py: 1, borderRadius: 1, cursor: dia.esMesActual ? 'pointer' : 'default',
                    opacity: dia.esMesActual ? 1 : 0.3,
                    bgcolor: dia.fecha === fechaSeleccionada ? 'primary.main' : dia.esHoy ? 'primary.light' : dia.tieneActividades ? '#f3e5f5' : 'transparent',
                    fontWeight: dia.esHoy ? 700 : 400,
                    color: dia.fecha === fechaSeleccionada ? '#fff' : 'inherit',
                    '&:hover': dia.esMesActual ? { bgcolor: dia.fecha === fechaSeleccionada ? 'primary.dark' : 'action.hover' } : {}
                  }}
                >
                  {dia.dia}
                  {dia.cantidadActividades > 0 && (
                    <Chip
                      size="small" label={dia.cantidadActividades}
                      sx={{
                        position: 'absolute', top: 1, right: 2, height: 16, minWidth: 16, fontSize: '0.6rem',
                        bgcolor: dia.fecha === fechaSeleccionada ? '#fff' : '#7e57c2',
                        color: dia.fecha === fechaSeleccionada ? '#1a1a2e' : '#fff'
                      }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Registrar Actividad</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>Fecha activa: <strong>{fechaSeleccionada}</strong></Typography>
              <TextField
                label="Título de la Actividad" fullWidth inputProps={{ maxLength: 100 }}
                placeholder="Ej: Mantenimiento correctivo de estaciones" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                sx={{ mb: 2 }}
                helperText={`${titulo.length}/100`}
              />
              <TextField
                label="Descripción de la Actividad" fullWidth multiline rows={3} inputProps={{ maxLength: 1000 }}
                placeholder="Describa detalladamente la actividad realizada..." value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)} sx={{ mb: 1 }}
                helperText={`${descripcion.length}/1000`}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={() => { setTitulo(''); setDescripcion(''); }}>Limpiar</Button>
                <Button variant="contained" onClick={guardar} disabled={!titulo.trim() || !descripcion.trim()}>
                  Guardar Actividad
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Actividades del {fechaSeleccionada}</Typography>
                {actividades.length > 0 && (
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="secondary" 
                    startIcon={<EmailIcon />}
                    onClick={() => {
                      setArchivoAdjunto(null);
                      setModalIngresoCorreo(true);
                    }}
                  >
                    Enviar por Correo
                  </Button>
                )}
              </Box>
              {cargando ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
              ) : actividades.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {actividades.map((act) => (
                    <Paper key={act.id} variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1"><strong>{act.titulo}</strong></Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip size="small" label={act.horaRegistro} color="primary" variant="outlined" />
                          <IconButton size="small" color="error" onClick={() => handleEliminar(act.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', my: 0.5 }}>
                        {act.descripcion}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">Registrado por: {act.usuario}</Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">No existen actividades registradas para la fecha seleccionada.</Typography>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      {/* PESTAÑA 1: VISTA DE REPORTES (CU-04 ADMIN) */}
      {tabActual === 1 && esAdmin && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Generación y Exportación de Reportes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Filtre por rango de fechas o usuario para auditar actividades.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField
                label="Fecha Inicio"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filtroFechaInicio}
                onChange={(e) => setFiltroFechaInicio(e.target.value)}
                fullWidth
              />
              <TextField
                label="Fecha Fin"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filtroFechaFin}
                onChange={(e) => setFiltroFechaFin(e.target.value)}
                fullWidth
              />
              <TextField
                label="Filtrar por Usuario / ID"
                placeholder="Ej: 1 (opcional)"
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={ejecutarReporte} disabled={cargando}>
                  Generar Reporte
                </Button>
                <Button variant="outlined" onClick={limpiarFiltrosReporte}>
                  Limpiar Filtros
                </Button>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<EmailIcon />}
                  disabled={reportes.length === 0}
                  onClick={() => {
                    setArchivoAdjunto(null);
                    setModalIngresoCorreo(true);
                  }}
                >
                  Enviar por Correo
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<TableViewIcon />}
                  disabled={reportes.length === 0}
                  onClick={exportarCSV}
                >
                  Exportar CSV
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<PictureAsPdfIcon />}
                  disabled={reportes.length === 0}
                  onClick={() => window.print()}
                >
                  Imprimir PDF
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Resultados: {reportes.length} actividad(es) encontrada(s)
            </Typography>

            {cargando ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
            ) : reportes.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.100' }}>
                    <TableRow>
                      <TableCell><strong>Fecha</strong></TableCell>
                      <TableCell><strong>Hora</strong></TableCell>
                      <TableCell><strong>Usuario</strong></TableCell>
                      <TableCell><strong>Título</strong></TableCell>
                      <TableCell><strong>Descripción</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportes.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.fecha}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip size="small" label={r.horaRegistro} variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.usuario}</TableCell>
                        <TableCell><strong>{r.titulo}</strong></TableCell>
                        <TableCell>{r.descripcion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                {reporteGenerado
                  ? 'No existen actividades que coincidan con los filtros seleccionados.'
                  : 'Configure los filtros superiores y presione "Generar Reporte".'}
              </Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INGRESO DE CORREO DESTINO Y ADJUNCIÓN DE ARCHIVOS                */}
      {/* ========================================================================= */}
      <Dialog 
        open={modalIngresoCorreo} 
        onClose={() => setModalIngresoCorreo(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" /> Despacho de Reporte Corporativo
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: '0.9rem' }}>
            Indique la dirección de correo a donde remitirá el informe. Opcionalmente puede adjuntar el documento de soporte (Excel, PDF o reporte exportado).
          </DialogContentText>

          <TextField
            autoFocus
            label="Correo Electrónico Destino"
            type="email"
            fullWidth
            placeholder="ejemplo@empresa.com"
            value={correoDestino}
            onChange={(e) => setCorreoDestino(e.target.value)}
            sx={{ mb: 2 }}
            helperText="Formato requerido: usuario@dominio.com"
          />

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AttachFileIcon fontSize="small" /> Archivo Adjunto de Soporte (Opcional):
          </Typography>

          {archivoAdjunto ? (
            <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f0fdf4', borderColor: '#86efac' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InsertDriveFileIcon color="success" />
                <Typography variant="body2" fontWeight="600" color="success.dark">
                  {archivoAdjunto.nombre}
                </Typography>
              </Box>
              <IconButton size="small" color="error" onClick={() => setArchivoAdjunto(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                size="small"
              >
                Cargar Archivo Local (PDF / Excel / CSV)
                <input
                  type="file"
                  hidden
                  accept=".csv, .xlsx, .xls, .pdf, .docx"
                  onChange={handleSeleccionarArchivo}
                />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalIngresoCorreo(false)} variant="outlined">
            Cancelar
          </Button>
          <Button 
            onClick={handleAvanzarAConfirmacion} 
            color="primary" 
            variant="contained"
            disabled={!correoDestino.trim()}
          >
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRMACIÓN DE SEGURIDAD Y RESUMEN DE DATOS                     */}
      {/* ========================================================================= */}
      <Dialog 
        open={modalConfirmacion} 
        onClose={() => !enviandoCorreo && setModalConfirmacion(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1e40af' }}>
          <MarkEmailReadIcon /> ¿Desea proceder con el envío?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Verifique la información antes de generar el despacho oficial. El sistema enviará la tabla de actividades y el adjunto seleccionado:
          </DialogContentText>
          
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', mb: 2, borderRadius: 2 }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">DESTINATARIO CONFIRMADO:</Typography>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                {correoDestino}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">TOTAL DE ACTIVIDADES:</Typography>
                <Typography variant="body2" fontWeight="600">
                  {tabActual === 1 ? reportes.length : actividades.length} registro(s)
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">PERIODO / ALCANCE:</Typography>
                <Typography variant="body2" fontWeight="600">
                  {tabActual === 1 
                    ? `${filtroFechaInicio || 'Inicio'} al ${filtroFechaFin || 'Fin'}` 
                    : fechaSeleccionada}
                </Typography>
              </Box>
            </Box>
            {archivoAdjunto && (
              <Box sx={{ mt: 1, p: 1, bgcolor: '#eff6ff', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">ADJUNTO INCLUIDO:</Typography>
                <Typography variant="body2" fontWeight="bold" color="#1e40af">
                  📎 {archivoAdjunto.nombre}
                </Typography>
              </Box>
            )}
          </Paper>

          <Typography variant="caption" color="text.secondary">
            * Si desea cambiar el correo o el archivo, presione <strong>Modificar Datos</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleVolverAIngreso} 
            disabled={enviandoCorreo}
            variant="outlined"
            color="inherit"
            startIcon={<EditIcon />}
          >
            Modificar Datos
          </Button>

          <Button 
            onClick={handleDespachoFinal} 
            color="primary" 
            variant="contained"
            disabled={enviandoCorreo}
            startIcon={enviandoCorreo ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          >
            {enviandoCorreo ? 'Enviando Reporte...' : 'Confirmar y Enviar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={3500} 
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert 
          severity={snack.severidad} 
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.mensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
}