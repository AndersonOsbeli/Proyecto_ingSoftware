import { useEffect, useRef, useState } from 'react';
import {
  Box, Paper, Button, Typography, Snackbar, Alert, Card, CardContent, Grid, Chip
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { getEmpleadosParaReconocimiento } from './service-empleados';
import { registrarMarcaje } from './service-marcaje';
import { registrar as registrarAuditoria } from './service-auditoria';

export default function Marcaje() {
  const { currentUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [empleados, setEmpleados] = useState(getEmpleadosParaReconocimiento());
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<typeof empleados[0] | null>(null);
  const [tipoMarcaje, setTipoMarcaje] = useState<'entrada' | 'salida'>('entrada');
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<{ exitoso: boolean; mensaje: string } | null>(null);
  const [snack, setSnack] = useState('');

  useEffect(() => () => detenerCamara(), []);

  const seleccionarEmpleado = (emp: typeof empleados[0]) => {
    setEmpleadoSeleccionado(emp);
    setUltimoResultado(null);
  };

  const cancelar = () => {
    detenerCamara();
    setEmpleadoSeleccionado(null);
    setTipoMarcaje('entrada');
  };

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

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamaraActiva(false);
  };

  const handleRegistrar = () => {
    if (!empleadoSeleccionado) return;
    let fotoCapturada = '';
    if (camaraActiva && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      fotoCapturada = canvas.toDataURL('image/jpeg', 0.8);
      detenerCamara();
    }

    const marcaje = registrarMarcaje(empleadoSeleccionado.id, tipoMarcaje, fotoCapturada);
    const exitoso = marcaje.resultado === 'exitoso';
    setUltimoResultado({ exitoso, mensaje: `${tipoMarcaje.toUpperCase()}: ${marcaje.observaciones} (${marcaje.hora})` });

    registrarAuditoria({
      usuario: currentUser?.name || 'Sistema',
      accion: 'marcaje', modulo: 'marcaje',
      registroAfectado: marcaje.id,
      descripcion: `Marcaje ${tipoMarcaje} de ${empleadoSeleccionado.nombre} - ${marcaje.resultado}`,
      datosAnteriores: null, datosNuevos: JSON.stringify(marcaje)
    });

    setSnack(ultimoResultado?.mensaje || `${tipoMarcaje} registrado`);
    setTimeout(() => { setEmpleadoSeleccionado(null); setUltimoResultado(null); }, 3000);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Marcaje Biométrico</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Seleccione un empleado para registrar entrada o salida
      </Typography>

      {!empleadoSeleccionado ? (
        <Grid container spacing={2}>
          {empleados.map((emp) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
              <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }} onClick={() => seleccionarEmpleado(emp)}>
                <Box sx={{ textAlign: 'center', pt: 2 }}>
                  {emp.fotoBase64
                    ? <img src={emp.fotoBase64} alt={emp.nombre} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                    : <Chip label="account_circle" variant="outlined" />}
                </Box>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1"><strong>{emp.nombre}</strong></Typography>
                  <Typography variant="caption" color="text.secondary" display="block">{emp.numeroEmpleado}</Typography>
                  <Typography variant="caption" color="text.secondary">{emp.departamento}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 3, maxWidth: 560 }}>
          <Typography variant="h6" gutterBottom>Confirmar Marcaje</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {empleadoSeleccionado.fotoBase64
              ? <img src={empleadoSeleccionado.fotoBase64} alt={empleadoSeleccionado.nombre} style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' }} />
              : <Chip label="account_circle" variant="outlined" />}
            <Box>
              <Typography variant="h6">{empleadoSeleccionado.nombre}</Typography>
              <Typography variant="body2" color="text.secondary">
                {empleadoSeleccionado.numeroEmpleado} | {empleadoSeleccionado.departamento}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button variant="contained" color={tipoMarcaje === 'entrada' ? 'primary' : 'inherit'}
              onClick={() => setTipoMarcaje('entrada')}>Entrada</Button>
            <Button variant="contained" color={tipoMarcaje === 'salida' ? 'secondary' : 'inherit'}
              onClick={() => setTipoMarcaje('salida')}>Salida</Button>
          </Box>

          <Box sx={{ textAlign: 'center', mb: 2, minHeight: 160, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {camaraActiva ? (
              <video ref={videoRef} autoPlay style={{ width: '100%', maxHeight: 200 }} />
            ) : (
              <Button variant="outlined" onClick={iniciarCamara}>Activar Camara</Button>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={cancelar}>Cancelar</Button>
            <Button variant="contained" onClick={handleRegistrar}>Registrar {tipoMarcaje}</Button>
          </Box>
        </Paper>
      )}

      {ultimoResultado && (
        <Paper sx={{ mt: 2, p: 2, bgcolor: ultimoResultado.exitoso ? 'success.light' : 'error.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <strong>{ultimoResultado.exitoso ? 'Marcaje registrado' : 'Marcaje rechazado'}</strong>
          </Box>
          <Typography variant="body2">{ultimoResultado.mensaje}</Typography>
        </Paper>
      )}

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="error" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
