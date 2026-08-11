import { useState } from 'react';
import {
  Box, Paper, Typography, Button, TextField, IconButton, Snackbar, Alert, Chip
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../lib/auth';
import { nowTime } from '../../lib/store';
import { getByFecha, getFechasConActividades, registrar, eliminar } from './service';
import { DiaCalendario } from './types';

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
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(formatDate(hoy));
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [snack, setSnack] = useState('');

  const actividades = getByFecha(fechaSeleccionada);
  const fechasConActividades = getFechasConActividades(mes, anio);
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

  const guardar = () => {
    if (!titulo.trim() || !descripcion.trim()) {
      setSnack('Complete titulo y descripcion');
      return;
    }
    registrar({
      fecha: fechaSeleccionada,
      horaRegistro: nowTime(),
      usuario: currentUser?.name || 'Sin usuario',
      usuarioId: currentUser?.id || '',
      titulo: titulo.trim(),
      descripcion: descripcion.trim()
    });
    setSnack('Actividad registrada exitosamente');
    setTitulo('');
    setDescripcion('');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Bitacora de Actividades</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Registro y consulta diaria de actividades
      </Typography>

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
                  bgcolor: dia.esHoy ? 'primary.light' : dia.tieneActividades ? '#f3e5f5' : 'transparent',
                  fontWeight: dia.esHoy ? 700 : 400,
                  color: dia.fecha === fechaSeleccionada ? '#fff' : 'inherit',
                  '&:hover': dia.esMesActual ? { bgcolor: 'action.hover' } : {}
                }}
              >
                {dia.dia}
                {dia.cantidadActividades > 0 && (
                  <Chip
                    size="small" label={dia.cantidadActividades}
                    sx={{
                      position: 'absolute', top: 1, right: 4, height: 16, minWidth: 16, fontSize: '0.6rem',
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
            <Typography variant="body2" color="text.secondary" gutterBottom>Fecha: {fechaSeleccionada}</Typography>
            <TextField
              label="Titulo de la Actividad" fullWidth inputProps={{ maxLength: 100 }}
              placeholder="Ej: Atencion al cliente" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              sx={{ mb: 2 }}
              helperText={`${titulo.length}/100`}
            />
            <TextField
              label="Descripcion de la Actividad" fullWidth multiline rows={4} inputProps={{ maxLength: 1000 }}
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
            <Typography variant="h6" gutterBottom>Actividades del {fechaSeleccionada}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {actividades.length} actividad(es) registrada(s)
            </Typography>
            {actividades.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {actividades.map((act) => (
                  <Paper key={act.id} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1"><strong>{act.titulo}</strong></Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label={act.horaRegistro} color="secondary" variant="outlined" />
                        <IconButton size="small" color="error" onClick={() => { eliminar(act.id); setSnack('Actividad eliminada'); }}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 0.5 }}>
                      {act.descripcion}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">{act.usuario}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No existen actividades registradas para la fecha seleccionada.</Typography>
            )}
          </Paper>
        </Box>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
