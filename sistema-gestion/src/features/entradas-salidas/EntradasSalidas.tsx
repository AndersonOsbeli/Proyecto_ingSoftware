import { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, TextField, Button, Grid, Select, MenuItem, InputLabel,
  FormControl, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert,
  Card, CardContent, Avatar, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Tabs, Tab, Checkbox, FormControlLabel
} from '@mui/material';

import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FaceIcon from '@mui/icons-material/Face';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeIcon from '@mui/icons-material/QrCode';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

import { useAuth } from '../../lib/auth';
import { today, nowTime } from '../../lib/store';
import { getAll, add, eliminar, update } from './service';
import { RegistroEntradaSalida } from './types';
import { reproducirSaludo, reproducirRechazo } from './voiceService';

// Integración con Empleados y Marcajes Biométricos
import { getEmpleadosParaReconocimiento, getById as getEmpleadoById } from '../empleados/service-empleados';
import { registrarMarcaje, getByEmpleado as getMarcajesByEmpleado } from '../empleados/service-marcaje';
import { getHorarioActual } from '../empleados/service-horarios';
import { Html5Qrcode } from 'html5-qrcode';

const AREAS = [
  'Tecnologia', 'Soporte', 'Redes', 'Sistemas',
  'Mantenimiento', 'Recursos Humanos', 'Administracion', 'Recepcion'
];

export default function EntradasSalidas() {
  const { currentUser } = useAuth();
  const [registros, setRegistros] = useState<RegistroEntradaSalida[]>(getAll());
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Empleados registrados en sistema para selección rápida
  const [empleados] = useState(getEmpleadosParaReconocimiento());
  const [busquedaEmp, setBusquedaEmp] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<typeof empleados[0] | null>(null);

  // Estado del Formulario Principal (Combina Cámara + Manual + Empleados)
  const [form, setForm] = useState({
    nombre: '',
    area: 'Tecnologia',
    tipo: 'entrada' as 'entrada' | 'salida',
    fecha: today(),
    hora: nowTime(),
    motivo: 'Control de asistencia diario',
    observaciones: '',
    fotoCapturada: '',
    empleadoId: ''
  });

  // Cámara HTML5
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camaraActiva, setCamaraActiva] = useState(false);

  // Control de fecha y hora manual/tiempo real y autorización
  const [fechaManual, setFechaManual] = useState(false);
  const [horaManual, setHoraManual] = useState(false);
  const [autorizacionEspecial, setAutorizacionEspecial] = useState(false);
  const [autorizacionEspecialQr, setAutorizacionEspecialQr] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setForm((prev) => ({
        ...prev,
        fecha: fechaManual ? prev.fecha : today(),
        hora: horaManual ? prev.hora : nowTime()
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, [fechaManual, horaManual]);

  // Diálogo para Ver Foto Ampliada
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  // Diálogo para Modificar/Editar Registro
  const [editRegistro, setEditRegistro] = useState<RegistroEntradaSalida | null>(null);
  const [editForm, setEditForm] = useState<Partial<RegistroEntradaSalida>>({});

  // Estados del Lector de Códigos QR
  const [tabRegistro, setTabRegistro] = useState(0); // 0 = Manual/Cámara, 1 = Lector QR
  const [qrScannerActivo, setQrScannerActivo] = useState(false);
  const [tipoRegistroQr, setTipoRegistroQr] = useState<'entrada' | 'salida' | 'auto'>('auto');
  const [ultimoEscaneado, setUltimoEscaneado] = useState<{
    empleado: any;
    tipo: 'entrada' | 'salida';
    hora: string;
    exitoso: boolean;
    mensaje: string;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      detenerQrScanner();
    };
  }, [tabRegistro]);

  const HOLIDAYS = [
    '01-01', // Año Nuevo
    '05-01', // Día del Trabajo
    '09-15', // Día de la Independencia
    '10-20', // Día de la Revolución
    '11-01', // Día de Todos los Santos
    '12-24', // Nochebuena
    '12-25', // Navidad
  ];

  const verificarAccesoLocal = (empId: string, fecha: string, hora: string): { permitido: boolean; razon: string } => {
    const emp = getEmpleadoById(empId);
    if (!emp) return { permitido: false, razon: 'Empleado no encontrado' };
    
    if (emp.estado === 'inactivo' || emp.estado === 'suspendido') {
      return { permitido: false, razon: 'Empleado inactivo o suspendido' };
    }

    // 1. Validar si es día festivo/feriado
    const mesDia = fecha.substring(5, 10); // MM-DD
    if (HOLIDAYS.includes(mesDia)) {
      return { permitido: false, razon: 'Día festivo/feriado oficial' };
    }

    // 2. Validar si es fin de semana (Sábado o Domingo)
    const dateObj = new Date(fecha + 'T12:00:00');
    const dayIndex = dateObj.getDay();
    const esFinDeSemana = dayIndex === 0 || dayIndex === 6;

    // 3. Obtener el horario del empleado
    const horario = getHorarioActual(empId);
    if (!horario) {
      if (esFinDeSemana) {
        return { permitido: false, razon: 'Fin de semana y sin horario asignado' };
      }
      return { permitido: false, razon: 'Sin horario asignado' };
    }

    // 4. Validar si el día de hoy está en los días laborales del horario
    const diasSemanaMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaNombre = diasSemanaMap[dayIndex];
    if (!horario.dias.includes(diaNombre as any)) {
      return { permitido: false, razon: `Hoy (${diaNombre}) no es día laboral según su horario` };
    }

    // 5. Validar si está dentro del horario laboral (con margen de 120 min de anticipación/retraso)
    const [eH, eM] = horario.horaEntrada.split(':').map(Number);
    const [sH, sM] = horario.horaSalida.split(':').map(Number);
    const [hH, hM] = hora.split(':').map(Number);

    const minutosEntrada = eH * 60 + eM;
    const minutosSalida = sH * 60 + sM;
    const minutosActual = hH * 60 + hM;

    const inicioPermitido = minutosEntrada - 120;
    const finPermitido = minutosSalida + 120;

    if (minutosActual < inicioPermitido || minutosActual > finPermitido) {
      return { permitido: false, razon: `Fuera de horario laboral permitido (${horario.horaEntrada} - ${horario.horaSalida})` };
    }

    return { permitido: true, razon: 'OK' };
  };

  // Control de ciclo de vida del Escáner QR
  useEffect(() => {
    let isMounted = true;
    const startScanner = async () => {
      if (!qrScannerActivo) return;
      
      // Esperar un momento corto para asegurar que el DOM se ha actualizado y #qr-reader existe
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!isMounted) return;

      const container = document.getElementById('qr-reader');
      if (!container) {
        console.error('El contenedor qr-reader no está en el DOM.');
        return;
      }

      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'user' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            handleQrDetectado(decodedText);
          },
          () => {
            // Ignorar errores menores
          }
        );
      } catch (err: any) {
        console.error('Error al iniciar el escáner QR:', err);
        setScanError('No se pudo acceder a la cámara. Verifique los permisos.');
        setQrScannerActivo(false);
      }
    };

    if (qrScannerActivo) {
      startScanner();
    } else {
      const stopScanner = async () => {
        if (qrScannerRef.current) {
          if (qrScannerRef.current.isScanning) {
            try {
              await qrScannerRef.current.stop();
            } catch (err) {
              console.error('Error al detener el escáner QR:', err);
            }
          }
          qrScannerRef.current = null;
        }
      };
      stopScanner();
    }

    return () => {
      isMounted = false;
    };
  }, [qrScannerActivo]);

  const iniciarQrScanner = () => {
    setScanError(null);
    setUltimoEscaneado(null);
    setQrScannerActivo(true);
  };

  const detenerQrScanner = async () => {
    setQrScannerActivo(false);
  };

  const handleQrDetectado = async (empleadoId: string) => {
    if (isProcessingQr) return;
    setIsProcessingQr(true);

    const emp = getEmpleadoById(empleadoId) || empleados.find((item) => item.numeroEmpleado === empleadoId);
    if (!emp) {
      setSnack({ open: true, message: 'Código QR no reconocido en el sistema.', severity: 'error' });
      setIsProcessingQr(false);
      return;
    }

    if (emp.estado === 'inactivo' || emp.estado === 'suspendido') {
      setSnack({ open: true, message: `Empleado ${emp.nombre} está inactivo o suspendido.`, severity: 'error' });
      setIsProcessingQr(false);
      return;
    }

    let tipoFinal: 'entrada' | 'salida' = 'entrada';
    if (tipoRegistroQr === 'auto') {
      const marcajes = getMarcajesByEmpleado(emp.id);
      if (marcajes.length > 0) {
        const ultimoMarcaje = [...marcajes].sort((a, b) => {
          const fA = `${a.fecha}T${a.hora}`;
          const fB = `${b.fecha}T${b.hora}`;
          return fB.localeCompare(fA);
        })[0];
        tipoFinal = ultimoMarcaje.tipo === 'entrada' ? 'salida' : 'entrada';
      } else {
        tipoFinal = 'entrada';
      }
    } else {
      tipoFinal = tipoRegistroQr;
    }

    // Validar acceso con reglas de feriados, fines de semana y horario laboral
    const validacionLocal = verificarAccesoLocal(emp.id, today(), nowTime());
    const aplicarRestricciones = autorizacionEspecialQr;
    const exitoso = !aplicarRestricciones || validacionLocal.permitido;

    let marcaje;
    if (exitoso) {
      marcaje = registrarMarcaje(
        emp.id, tipoFinal, emp.fotoBase64 || '', 'Lector QR', true,
        { permitido: true, razon: validacionLocal.permitido ? validacionLocal.razon : 'Registro sin restricciones' },
        emp
      );
      if (!validacionLocal.permitido) {
        marcaje.observaciones = `Registro sin restricciones: ${validacionLocal.razon}`;
      }
    } else {
      // Registrar marcaje fallido
      marcaje = registrarMarcaje(
        emp.id, tipoFinal, emp.fotoBase64 || '', 'Lector QR', false,
        { permitido: false, razon: validacionLocal.razon },
        emp
      );
      marcaje.observaciones = validacionLocal.razon;
      marcaje.resultado = 'sin_horario';
    }

    setUltimoEscaneado({
      empleado: emp,
      tipo: tipoFinal,
      hora: marcaje.hora,
      exitoso: exitoso,
      mensaje: exitoso ? `¡Acceso de ${tipoFinal.toUpperCase()} registrado!` : `Rechazado: ${marcaje.observaciones}`
    });

    if (exitoso) {
      reproducirSaludo(emp.nombre, tipoFinal);
    } else {
      reproducirRechazo(emp.nombre, marcaje.observaciones);
    }

    recargarRegistros();
    await detenerQrScanner();

    setTimeout(() => {
      setUltimoEscaneado(null);
      setIsProcessingQr(false);
      // Auto reactivar escáner si seguimos en la pestaña QR
      const isQrTab = document.getElementById('qr-tab-indicator');
      if (isQrTab) {
        iniciarQrScanner();
      }
    }, 900);
  };

  const recargarRegistros = () => {
    setRegistros(getAll());
  };

  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // Iniciar Cámara Web
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      setCamaraActiva(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setSnack({
        open: true,
        message: 'No se pudo acceder a la cámara. Verifique permisos del navegador.',
        severity: 'error'
      });
    }
  };

  // Detener Cámara Web
  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCamaraActiva(false);
  };

  // Capturar Foto desde la Cámara y asignarla al formulario
  const capturarFoto = () => {
    if (!videoRef.current || !camaraActiva) {
      setSnack({ open: true, message: 'Primero active la cámara para tomar la fotografía.', severity: 'info' });
      return;
    }
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setForm((prev) => ({ ...prev, fotoCapturada: fotoBase64 }));
        setSnack({ open: true, message: '¡Fotografía capturada correctamente!', severity: 'success' });
      }
    } catch (err) {
      console.error('Error al capturar foto:', err);
    }
  };

  // Al seleccionar un empleado de la lista rápida
  const seleccionarEmpleado = (emp: typeof empleados[0]) => {
    setEmpleadoSeleccionado(emp);

    let tipoAuto: 'entrada' | 'salida' = 'entrada';
    const marcajes = getMarcajesByEmpleado(emp.id);
    if (marcajes.length > 0) {
      const ultimoMarcaje = [...marcajes].sort((a, b) => {
        const fA = `${a.fecha}T${a.hora}`;
        const fB = `${b.fecha}T${b.hora}`;
        return fB.localeCompare(fA);
      })[0];
      tipoAuto = ultimoMarcaje.tipo === 'entrada' ? 'salida' : 'entrada';
    }

    setForm((prev) => ({
      ...prev,
      nombre: emp.nombre,
      area: emp.departamento || 'Tecnologia',
      empleadoId: emp.id,
      tipo: tipoAuto,
      fotoCapturada: emp.fotoBase64 || prev.fotoCapturada
    }));
  };

  // Guardar Nuevo Registro de Entrada / Salida
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      setSnack({ open: true, message: 'El nombre del personal o visitante es obligatorio.', severity: 'error' });
      return;
    }

    // Validar si es empleado y aplicar reglas de horario/descanso
    if (form.empleadoId) {
      const validacionLocal = verificarAccesoLocal(form.empleadoId, form.fecha, form.hora);
      if (autorizacionEspecial && !validacionLocal.permitido) {
        setSnack({
          open: true,
          message: `Acceso denegado: ${validacionLocal.razon}. Desactive la restricción de feriado/descanso para registrar manualmente.`,
          severity: 'error'
        });
        reproducirRechazo(form.nombre, validacionLocal.razon);
        return;
      }
    }

    const fotoFinal = form.fotoCapturada || (camaraActiva ? capturarFoto() as any : '');

    const observacionConAutorizacion = autorizacionEspecial
      ? form.observaciones
      : `${form.observaciones} [Sin restricción de feriado/descanso]`.trim();

    const nuevoRegistro: Omit<RegistroEntradaSalida, 'id'> = {
      nombre: form.nombre,
      area: form.area,
      tipo: form.tipo,
      fecha: form.fecha,
      hora: form.hora,
      motivo: form.motivo,
      observaciones: observacionConAutorizacion,
      registradoPor: currentUser?.name || 'Estación Recepción/RRHH',
      fotoCapturada: form.fotoCapturada || fotoFinal,
      empleadoId: form.empleadoId || undefined
    };

    add(nuevoRegistro);

    // Si es un empleado registrado, guardar marcaje biométrico sin duplicar la sincronización
    if (form.empleadoId) {
      try {
        const marcaje = registrarMarcaje(form.empleadoId, form.tipo, form.fotoCapturada, 'Sede Central', false);
        if (autorizacionEspecial) {
          marcaje.observaciones = `${marcaje.observaciones} (Autorizado Manualmente)`.trim();
        }
      } catch (err) {
        console.warn('Registro secundario omitido:', err);
      }
    }

    // Reproducir saludo por voz en altavoces
    reproducirSaludo(form.nombre, form.tipo);

    recargarRegistros();

    setSnack({
      open: true,
      message: `¡${form.tipo.toUpperCase()} registrada con éxito para ${form.nombre}!`,
      severity: 'success'
    });

    // Limpiar campos
    setEmpleadoSeleccionado(null);
    setAutorizacionEspecial(false);
    setFechaManual(false);
    setHoraManual(false);
    setForm({
      nombre: '',
      area: 'Tecnologia',
      tipo: 'entrada',
      fecha: today(),
      hora: nowTime(),
      motivo: 'Control de asistencia diario',
      observaciones: '',
      fotoCapturada: '',
      empleadoId: ''
    });
  };

  // Abrir diálogo de Edición
  const handleOpenEdit = (registro: RegistroEntradaSalida) => {
    setEditRegistro(registro);
    setEditForm({ ...registro });
  };

  // Guardar Cambios Editados
  const handleSaveEdit = () => {
    if (!editRegistro) return;
    update(editRegistro.id, editForm);
    recargarRegistros();
    setEditRegistro(null);
    setSnack({ open: true, message: 'Registro actualizado correctamente.', severity: 'success' });
  };

  // Eliminar Registro
  const handleDelete = (id: string) => {
    eliminar(id);
    recargarRegistros();
    setSnack({ open: true, message: 'Registro eliminado del historial.', severity: 'info' });
  };

  const empleadosFiltrados = empleados.filter((e) =>
    e.nombre.toLowerCase().includes(busquedaEmp.toLowerCase()) ||
    e.numeroEmpleado.toLowerCase().includes(busquedaEmp.toLowerCase()) ||
    (e.departamento && e.departamento.toLowerCase().includes(busquedaEmp.toLowerCase()))
  );

  return (
    <Box>
      {/* Encabezado Principal */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FaceIcon color="primary" fontSize="large" /> Registro de Entradas y Salidas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Control de asistencia con cámara fotográfica, reconocimiento rápido, códigos QR y saludo por voz
          </Typography>
        </Box>
        <Chip
          icon={<HistoryIcon />}
          label={`Total Registros: ${registros.length}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Selector de Modo de Registro */}
      <Tabs
        value={tabRegistro}
        onChange={(_, val) => {
          setTabRegistro(val);
          if (val === 0) {
            detenerQrScanner();
          } else {
            detenerCamara();
          }
        }}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<CameraAltIcon />} label="Registro Manual / Cámara" iconPosition="start" />
        <Tab icon={<QrCodeIcon />} label="Escáner QR Automático" iconPosition="start" />
      </Tabs>

      {tabRegistro === 0 ? (
        /* BLOQUE PRINCIPAL DE REGISTRO CON CÁMARA E INTEGRACIÓN MANUAL */
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraAltIcon color="primary" /> Nuevo Registro de Entrada / Salida
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Puede activar la cámara para tomar foto del rostro y seleccionar a un empleado o ingresar datos manualmente.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Columna Izquierda: Visor de Cámara y Foto Capturada */}
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <VideocamIcon fontSize="small" /> Visor de Cámara
                  </Typography>

                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: 240,
                      bgcolor: '#0f172a',
                      borderRadius: 2,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                      border: '2px dashed',
                      borderColor: camaraActiva ? 'primary.main' : 'divider'
                    }}
                  >
                    {camaraActiva ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : form.fotoCapturada ? (
                      <img
                        src={form.fotoCapturada}
                        alt="Foto Capturada"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ p: 2, color: 'text.secondary' }}>
                        <VideocamOffIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                        <Typography variant="caption" display="block">
                          Cámara desactivada
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Acciones de Cámara */}
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!camaraActiva ? (
                      <Button variant="contained" size="small" startIcon={<VideocamIcon />} onClick={iniciarCamara}>
                        Activar Cámara
                      </Button>
                    ) : (
                      <>
                        <Button variant="contained" color="success" size="small" startIcon={<CameraAltIcon />} onClick={capturarFoto}>
                          Tomar Foto
                        </Button>
                        <Button variant="outlined" color="error" size="small" startIcon={<VideocamOffIcon />} onClick={detenerCamara}>
                          Apagar
                        </Button>
                      </>
                    )}
                  </Box>

                  {form.fotoCapturada && (
                    <Chip
                      avatar={<Avatar src={form.fotoCapturada} />}
                      label="Foto lista para guardar"
                      color="success"
                      size="small"
                      sx={{ mt: 1.5 }}
                      onDelete={() => setForm((f) => ({ ...f, fotoCapturada: '' }))}
                    />
                  )}
                </Paper>
              </Grid>

              {/* Columna Derecha: Formulario de Datos y Selección Rápida */}
              <Grid item xs={12} md={7}>
                {/* Selección Rápida de Empleados */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Selección Rápida de Empleado (Opcional)
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar empleado por nombre..."
                    value={busquedaEmp}
                    onChange={(e) => setBusquedaEmp(e.target.value)}
                    sx={{ mb: 1 }}
                    InputProps={{
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  {busquedaEmp && (
                    <Box sx={{ maxHeight: 120, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      {empleadosFiltrados.map((emp) => (
                        <Chip
                          key={emp.id}
                          avatar={<Avatar src={emp.fotoBase64}>{emp.nombre.charAt(0)}</Avatar>}
                          label={`${emp.nombre} (${emp.departamento})`}
                          onClick={() => seleccionarEmpleado(emp)}
                          color={empleadoSeleccionado?.id === emp.id ? 'primary' : 'default'}
                          sx={{ m: 0.5, cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Campos del Formulario */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nombre del Personal / Visitante"
                      required
                      fullWidth
                      size="small"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value, empleadoId: '' })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required size="small">
                      <InputLabel>Área / Departamento</InputLabel>
                      <Select
                        label="Área / Departamento"
                        value={form.area}
                        onChange={(e) => setForm({ ...form, area: e.target.value })}
                      >
                        {AREAS.map((a) => (
                          <MenuItem key={a} value={a}>
                            {a}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tipo de Registro</InputLabel>
                      <Select
                        label="Tipo de Registro"
                        value={form.tipo}
                        onChange={(e) => setForm({ ...form, tipo: e.target.value as 'entrada' | 'salida' })}
                      >
                        <MenuItem value="entrada">ENTRADA (Ingreso)</MenuItem>
                        <MenuItem value="salida">SALIDA (Egreso)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Fecha"
                      type="date"
                      required
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={form.fecha}
                      onChange={(e) => {
                        setForm({ ...form, fecha: e.target.value });
                        setFechaManual(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Hora"
                      type="time"
                      required
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      value={form.hora}
                      onChange={(e) => {
                        setForm({ ...form, hora: e.target.value });
                        setHoraManual(true);
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Motivo"
                      required
                      fullWidth
                      size="small"
                      value={form.motivo}
                      onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Observaciones adicionales"
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      value={form.observaciones}
                      onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    />
                  </Grid>

                  {/* Campo de Autorización Especial */}
                  {form.empleadoId && (
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={autorizacionEspecial}
                            onChange={(e) => setAutorizacionEspecial(e.target.checked)}
                            color="warning"
                          />
                        }
                        label="Autorizar acceso especial (Día festivo / Fuera de horario / Fin de semana)"
                      />
                    </Grid>
                  )}

                  {/* Botón de Envio Principal con Saludo por Voz */}
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      color={form.tipo === 'entrada' ? 'success' : 'warning'}
                      startIcon={<CheckCircleIcon />}
                      endIcon={<VolumeUpIcon />}
                      sx={{ py: 1.2, fontWeight: 700, fontSize: '1rem' }}
                    >
                      Registrar {form.tipo.toUpperCase()} + Saludo por Voz
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      ) : (
        /* BLOQUE DEL ESCÁNER QR */
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2, position: 'relative' }}>
          {/* Indicador invisible para chequear montura de pestaña QR */}
          <div id="qr-tab-indicator" style={{ display: 'none' }} />
          
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeIcon color="primary" /> Escáner de Código QR Automático
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Coloque la credencial QR del empleado frente a la cámara para registrar su asistencia automáticamente.
          </Typography>

          <Grid container spacing={3}>
            {/* Columna Izquierda: Configuración del Lector */}
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: 'background.default' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Configuración de Registro QR
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Seleccione cómo procesar los marcajes leídos por el escáner.
                  </Typography>

                  <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                    <InputLabel>Modo de Registro</InputLabel>
                    <Select
                      value={tipoRegistroQr}
                      label="Modo de Registro"
                      onChange={(e) => setTipoRegistroQr(e.target.value as any)}
                    >
                      <MenuItem value="auto">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutorenewIcon fontSize="small" color="primary" />
                          <span>Auto-detectar (Alternar)</span>
                        </Box>
                      </MenuItem>
                      <MenuItem value="entrada">Registrar solo ENTRADAS</MenuItem>
                      <MenuItem value="salida">Registrar solo SALIDAS</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="primary" display="block" gutterBottom>
                      Modo Auto-detectar:
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      El sistema busca el último marcaje del empleado el día de hoy. Si el último fue Entrada, registrará Salida automáticamente; de lo contrario, registrará Entrada.
                    </Typography>
                  </Box>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={autorizacionEspecialQr}
                        onChange={(e) => setAutorizacionEspecialQr(e.target.checked)}
                        color="warning"
                      />
                    }
                    label="Aplicar restricción de feriado/descanso y horario"
                    sx={{ mt: 1, display: 'block' }}
                  />
                </Box>

                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  {!qrScannerActivo ? (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      fullWidth
                      startIcon={<QrCodeIcon />}
                      onClick={iniciarQrScanner}
                      sx={{ py: 1.5, fontWeight: 700 }}
                    >
                      Iniciar Lector QR
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="error"
                      size="large"
                      fullWidth
                      onClick={detenerQrScanner}
                      sx={{ py: 1.5, fontWeight: 700 }}
                    >
                      Apagar Lector QR
                    </Button>
                  )}
                  {scanError && (
                    <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                      {scanError}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Columna Derecha: Lector QR / Animación de Éxito */}
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 320 }}>
                {ultimoEscaneado ? (
                  /* Tarjeta de éxito premium */
                  <Card sx={{
                    width: '100%',
                    maxWidth: 400,
                    border: '3px solid',
                    borderColor: ultimoEscaneado.exitoso
                      ? (ultimoEscaneado.tipo === 'entrada' ? 'success.main' : 'warning.main')
                      : 'error.main',
                    boxShadow: 8,
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.02)' },
                      '100%': { transform: 'scale(1)' }
                    }
                  }}>
                    <Box sx={{
                      background: ultimoEscaneado.exitoso
                        ? (ultimoEscaneado.tipo === 'entrada'
                          ? 'linear-gradient(135deg, #10b981, #047857)'
                          : 'linear-gradient(135deg, #f59e0b, #b45309)'
                        )
                        : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      color: 'white',
                      py: 2.5,
                      textAlign: 'center'
                    }}>
                      {ultimoEscaneado.exitoso ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 48, mb: 0.5 }} />
                      ) : (
                        <ErrorOutlineIcon sx={{ fontSize: 48, mb: 0.5 }} />
                      )}
                      <Typography variant="h6" fontWeight={700}>
                        {ultimoEscaneado.exitoso ? 'REGISTRO EXITOSO' : 'REGISTRO RECHAZADO'}
                      </Typography>
                    </Box>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 3 }}>
                      {ultimoEscaneado.empleado.fotoBase64 ? (
                        <Avatar
                          src={ultimoEscaneado.empleado.fotoBase64}
                          sx={{ width: 90, height: 90, mb: 2, border: '3px solid #cbd5e1' }}
                        />
                      ) : (
                        <Avatar sx={{ width: 90, height: 90, mb: 2, bgcolor: 'primary.light', fontSize: '2rem' }}>
                          {ultimoEscaneado.empleado.nombre.charAt(0)}
                        </Avatar>
                      )}
                      <Typography variant="h6" fontWeight={700} align="center">
                        {ultimoEscaneado.empleado.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        No. Empleado: {ultimoEscaneado.empleado.numeroEmpleado}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        {ultimoEscaneado.empleado.departamento} | {ultimoEscaneado.empleado.cargo}
                      </Typography>

                      <Chip
                        label={ultimoEscaneado.exitoso 
                          ? (ultimoEscaneado.tipo === 'entrada' ? 'ENTRADA REGISTRADA' : 'SALIDA REGISTRADA')
                          : `RECHAZADO: ${ultimoEscaneado.mensaje.replace('Rechazado: ', '')}`}
                        color={ultimoEscaneado.exitoso 
                          ? (ultimoEscaneado.tipo === 'entrada' ? 'success' : 'warning') 
                          : 'error'}
                        sx={{ fontWeight: 700, px: 2, py: 1.5, fontSize: '0.85rem' }}
                      />

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                        Hora de Registro: <strong>{ultimoEscaneado.hora}</strong>
                      </Typography>
                    </CardContent>
                  </Card>
                ) : qrScannerActivo ? (
                  /* Lector QR Activo */
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <Box
                      id="qr-reader"
                      sx={{
                        width: '100%',
                        maxWidth: 320,
                        margin: '0 auto',
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '3px solid',
                        borderColor: 'primary.main',
                        boxShadow: 4,
                        bgcolor: '#0f172a'
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                      <Box sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        animation: 'blink 1s infinite',
                        '@keyframes blink': {
                          '0%': { opacity: 0.2 },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0.2 }
                        }
                      }} />
                      <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                        Escáner encendido. Presente el código QR...
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  /* Lector Apagado */
                  <Paper
                    variant="outlined"
                    onClick={iniciarQrScanner}
                    sx={{
                      width: '100%',
                      maxWidth: 320,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 3,
                      border: '2px dashed',
                      borderColor: 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <QrCodeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 1.5, opacity: 0.7 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Lector QR Apagado
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      Haga clic aquí o en el botón "Iniciar Lector QR" para encender la cámara de escaneo.
                    </Typography>
                    <Button variant="outlined" size="small">
                      Encender Cámara
                    </Button>
                  </Paper>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* TABLA DE HISTORIAL DE REGISTROS CON ACCIÓN DE EDITAR Y ELIMINAR */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" /> Historial de Entradas y Salidas ({registros.length})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Registro completo de accesos. Puede modificar o eliminar cualquier registro utilizando las acciones.
        </Typography>

        {registros.length > 0 ? (
          <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell><strong>Foto / Rótulo</strong></TableCell>
                  <TableCell><strong>Fecha / Hora</strong></TableCell>
                  <TableCell><strong>Nombre</strong></TableCell>
                  <TableCell><strong>Área</strong></TableCell>
                  <TableCell><strong>Tipo</strong></TableCell>
                  <TableCell><strong>Motivo / Observaciones</strong></TableCell>
                  <TableCell><strong>Registrado Por</strong></TableCell>
                  <TableCell align="center"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      {r.fotoCapturada ? (
                        <Avatar
                          src={r.fotoCapturada}
                          sx={{ width: 42, height: 42, cursor: 'pointer', border: '1px solid #cbd5e1' }}
                          onClick={() => setFotoModal(r.fotoCapturada || null)}
                        />
                      ) : (
                        <Avatar sx={{ width: 42, height: 42, bgcolor: 'primary.light', fontSize: '0.9rem' }}>
                          {r.nombre ? r.nombre.charAt(0) : '?'}
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.fecha}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.hora}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.nombre}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.area}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                        color={r.tipo === 'entrada' ? 'success' : 'warning'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.motivo}</Typography>
                      {r.observaciones && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {r.observaciones}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={r.registradoPor} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      {/* BOTÓN EDITAR / MODIFICAR */}
                      <Tooltip title="Modificar Registro">
                        <IconButton color="primary" size="small" onClick={() => handleOpenEdit(r)} sx={{ mr: 0.5 }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {/* BOTÓN ELIMINAR */}
                      <Tooltip title="Eliminar Registro">
                        <IconButton color="error" size="small" onClick={() => handleDelete(r.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No hay registros de entradas ni salidas aún.
          </Typography>
        )}
      </Paper>

      {/* DIÁLOGO MODAL PARA EDITAR / MODIFICAR UN REGISTRO */}
      <Dialog open={!!editRegistro} onClose={() => setEditRegistro(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" /> Modificar Registro de Acceso
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {editRegistro && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nombre del Personal"
                  fullWidth
                  size="small"
                  value={editForm.nombre || ''}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Área / Departamento</InputLabel>
                  <Select
                    label="Área / Departamento"
                    value={editForm.area || 'Tecnologia'}
                    onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                  >
                    {AREAS.map((a) => (
                      <MenuItem key={a} value={a}>
                        {a}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    label="Tipo"
                    value={editForm.tipo || 'entrada'}
                    onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value as 'entrada' | 'salida' })}
                  >
                    <MenuItem value="entrada">ENTRADA</MenuItem>
                    <MenuItem value="salida">SALIDA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Fecha"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={editForm.fecha || ''}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Hora"
                  type="time"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={editForm.hora || ''}
                  onChange={(e) => setEditForm({ ...editForm, hora: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Motivo"
                  fullWidth
                  size="small"
                  value={editForm.motivo || ''}
                  onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Observaciones"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={editForm.observaciones || ''}
                  onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditRegistro(null)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary" startIcon={<CheckCircleIcon />}>
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO MODAL PARA VISTA PREVIA DE FOTO */}
      <Dialog open={!!fotoModal} onClose={() => setFotoModal(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Fotografía Capturada</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          {fotoModal && (
            <img
              src={fotoModal}
              alt="Captura Biométrica"
              style={{ width: '100%', maxHeight: 420, borderRadius: 8, objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFotoModal(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR NOTIFICACIONES */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
