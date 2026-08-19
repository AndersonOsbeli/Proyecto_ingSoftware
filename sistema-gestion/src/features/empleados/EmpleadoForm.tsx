import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, IconButton, Snackbar, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../lib/auth';
import { getById, registrar, update, generarNumeroEmpleado } from './service-empleados';
import { getAllHorarios } from './service-horarios';
import { registrar as registrarAuditoria } from './service-auditoria';
import { DEPARTAMENTOS, SUCURSALES, CARGOS, Empleado } from './types';
import { today } from '../../lib/store';
import { API_BASE_URL } from '../../lib/apiConfig';

export default function EmpleadoForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const esEdicion = !!id;
  const [numeroEmpleado, setNumeroEmpleado] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [genero, setGenero] = useState<'masculino' | 'femenino' | 'otro'>('masculino');
  const [departamento, setDepartamento] = useState('');
  const [cargo, setCargo] = useState('');
  const [sucursal, setSucursal] = useState('Sede Central');
  const [horarioLaboralId, setHorarioLaboralId] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(today());
  const [fotoBase64, setFotoBase64] = useState('');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [snack, setSnack] = useState('');
  const [guardando, setGuardando] = useState(false);

  const horarios = getAllHorarios();

  useEffect(() => {
    const cargarEmpleado = async () => {
      if (esEdicion && id) {
        const emp = getById(id);
        const empApi = await fetch(`${API_BASE_URL}/empleados/${id}`).then(async (response) => {
          if (!response.ok) return null;
          return response.json();
        }).catch(() => null);
        const datos = empApi || emp;
        if (datos) {
          setNumeroEmpleado(datos.numeroEmpleado);
          setNombre(datos.nombre);
          setCorreo(datos.correo);
          setGenero(datos.genero);
          setDepartamento(datos.departamento);
          setCargo(datos.cargo);
          setSucursal(datos.sucursal);
          setHorarioLaboralId(datos.horarioLaboralId || '');
          setFechaIngreso(datos.fechaIngreso);
          setFotoBase64(datos.fotoBase64);
        }
      } else {
        setNumeroEmpleado(generarNumeroEmpleado());
      }
    };
    void cargarEmpleado();
    return () => detenerCamara();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      setCamaraActiva(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setSnack('No se pudo acceder a la camara');
    }
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    setFotoBase64(canvas.toDataURL('image/jpeg', 0.8));
    detenerCamara();
  };

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraActiva(false);
  };

  const guardar = async () => {
    if (!nombre || !correo || !departamento || !cargo) {
      setSnack('Complete los campos obligatorios');
      return;
    }
    const user = currentUser?.name || 'Sistema';
    setGuardando(true);

    try {
      if (esEdicion && id) {
        const response = await fetch(`${API_BASE_URL}/empleados/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numeroEmpleado, nombre, correo, genero, departamento, cargo, sucursal, fechaIngreso, fotoBase64 })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el empleado');
        update(id, { nombre, correo, genero, departamento, cargo, sucursal, horarioLaboralId: horarioLaboralId || null, fechaIngreso, fotoBase64 });
        registrarAuditoria({
          usuario: user, accion: 'editar', modulo: 'empleados',
          registroAfectado: id, descripcion: `Empleado ${nombre} actualizado`,
          datosAnteriores: null, datosNuevos: JSON.stringify({ nombre })
        });
        setSnack('Empleado actualizado');
      } else {
        const response = await fetch(`${API_BASE_URL}/empleados`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numeroEmpleado, nombre, correo, genero, departamento, cargo,
            sucursal, fechaIngreso, fotoBase64
          })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || 'No se pudo registrar el empleado en la base de datos');
        }

        const nuevo = registrar({
          numeroEmpleado: result.codigoEmpleado || numeroEmpleado,
          nombre, correo, genero, departamento, cargo,
          sucursal, horarioLaboralId: horarioLaboralId || null,
          supervisorId: null, fechaIngreso, fotoBase64, registradoPor: user
        });
        registrarAuditoria({
          usuario: user, accion: 'crear', modulo: 'empleados',
          registroAfectado: String(result.empleadoId || nuevo.id),
          descripcion: `Empleado ${nuevo.nombre} registrado`,
          datosAnteriores: null, datosNuevos: JSON.stringify(result)
        });
        setSnack(result.correoEnviado
          ? 'Empleado registrado y QR enviado por correo'
          : 'Empleado registrado; no se pudo enviar el correo QR');
      }
      setTimeout(() => navigate('/empleados'), 700);
    } catch (error) {
      setSnack(error instanceof Error ? error.message : 'Error al guardar el empleado');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/empleados')}><ArrowBackIcon /></IconButton>
        <Typography variant="h5">{esEdicion ? 'Editar Empleado' : 'Registrar Empleado'}</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Foto / Biometria</Typography>
            <Box sx={{ textAlign: 'center', mb: 2, minHeight: 220, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {camaraActiva ? (
                <video ref={videoRef} autoPlay style={{ width: '100%', maxHeight: 220 }} />
              ) : fotoBase64 ? (
                <img src={fotoBase64} alt="foto" style={{ maxWidth: '100%', maxHeight: 220 }} />
              ) : (
                <Typography color="text.secondary">Sin foto</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {!camaraActiva ? (
                <Button variant="contained" onClick={iniciarCamara}>Iniciar Camara</Button>
              ) : (
                <>
                  <Button variant="contained" color="secondary" onClick={capturarFoto}>Capturar</Button>
                  <Button variant="outlined" onClick={detenerCamara}>Cancelar</Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Datos del Empleado</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="No. Empleado" fullWidth value={numeroEmpleado} InputProps={{ readOnly: true }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Nombre completo" required fullWidth value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Correo corporativo" type="email" required fullWidth value={correo} onChange={(e) => setCorreo(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Genero</InputLabel>
                  <Select label="Genero" value={genero} onChange={(e) => setGenero(e.target.value as Empleado['genero'])}>
                    <MenuItem value="masculino">Masculino</MenuItem>
                    <MenuItem value="femenino">Femenino</MenuItem>
                    <MenuItem value="otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Departamento</InputLabel>
                  <Select label="Departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
                    {DEPARTAMENTOS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Cargo</InputLabel>
                  <Select label="Cargo" value={cargo} onChange={(e) => setCargo(e.target.value)}>
                    {CARGOS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Sucursal</InputLabel>
                  <Select label="Sucursal" value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
                    {SUCURSALES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Horario laboral</InputLabel>
                  <Select label="Horario laboral" value={horarioLaboralId} onChange={(e) => setHorarioLaboralId(e.target.value)}>
                    <MenuItem value="">Sin horario</MenuItem>
                    {horarios.map((h) => (
                      <MenuItem key={h.id} value={h.id}>{h.nombre} ({h.horaEntrada}-{h.horaSalida})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Fecha de ingreso" type="date" fullWidth InputLabelProps={{ shrink: true }}
                  value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={guardar}
                  disabled={guardando || !nombre || !correo || !departamento || !cargo}>
                  {guardando ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Registrar')}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
