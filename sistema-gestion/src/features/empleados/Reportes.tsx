import { useState } from 'react';
import {
  Box, Paper, Button, Typography, Grid, FormControl, InputLabel, Select,
  MenuItem, TextField, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { getEmpleados } from './service-empleados';
import { DEPARTAMENTOS } from './types';
import { exportarAsistencia, exportarHorarios, exportarVacacionesPermisos, exportarAuditoria } from './service-reportes';
import { registrar as registrarAuditoria } from './service-auditoria';
import { ReporteFiltros } from './types';

interface ReporteDef {
  key: string;
  titulo: string;
  descripcion: string;
  icon: string;
  filtros: ReporteFiltros;
}

const REPORTES: ReporteDef[] = [
  { key: 'asistencia', titulo: 'Reporte de Asistencia', descripcion: 'Entradas, salidas, horas laboradas y tardanzas', icon: 'schedule', filtros: { empleadoId: '', departamento: '', fechaInicio: '', fechaFin: '', estado: '' } },
  { key: 'horarios', titulo: 'Reporte de Horarios', descripcion: 'Horarios asignados y cambios realizados', icon: 'access_time', filtros: { empleadoId: '', departamento: '', fechaInicio: '', fechaFin: '', estado: '' } },
  { key: 'vacaciones', titulo: 'Vacaciones y Permisos', descripcion: 'Solicitudes, estados y periodos autorizados', icon: 'beach_access', filtros: { empleadoId: '', departamento: '', fechaInicio: '', fechaFin: '', estado: '' } },
  { key: 'auditoria', titulo: 'Reporte de Auditoria', descripcion: 'Acciones administrativas, usuarios y fechas', icon: 'security', filtros: { empleadoId: '', departamento: '', fechaInicio: '', fechaFin: '', estado: '' } }
];

export default function Reportes() {
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const [reportes, setReportes] = useState(REPORTES);
  const empleados = getEmpleados();
  const departamentos = DEPARTAMENTOS;

  const setFiltro = (key: string, campo: keyof ReporteFiltros, valor: string) => {
    setReportes((rs) => rs.map((r) => (r.key === key ? { ...r, filtros: { ...r.filtros, [campo]: valor } } : r)));
  };

  const exportar = (key: string) => {
    const reporte = reportes.find((r) => r.key === key);
    if (!reporte) return;
    const filtros = reporte.filtros;
    switch (key) {
      case 'asistencia': exportarAsistencia(filtros); break;
      case 'horarios': exportarHorarios(filtros); break;
      case 'vacaciones': exportarVacacionesPermisos(filtros); break;
      case 'auditoria': exportarAuditoria(filtros); break;
    }
    registrarAuditoria({
      usuario: currentUser?.name || 'Sistema', accion: 'exportar', modulo: 'reportes',
      registroAfectado: key, descripcion: `Reporte ${reporte.titulo} exportado`,
      datosAnteriores: null, datosNuevos: JSON.stringify(filtros)
    });
    setSnack('Reporte descargado');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Exportar Reportes</Typography>

      <Grid container spacing={2}>
        {reportes.map((r) => (
          <Grid item xs={12} md={6} key={r.key}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">{r.titulo}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>{r.descripcion}</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Empleado (opcional)</InputLabel>
                    <Select label="Empleado (opcional)" value={r.filtros.empleadoId}
                      onChange={(e) => setFiltro(r.key, 'empleadoId', e.target.value)}>
                      <MenuItem value="">Todos</MenuItem>
                      {empleados.map((e) => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Departamento</InputLabel>
                    <Select label="Departamento" value={r.filtros.departamento}
                      onChange={(e) => setFiltro(r.key, 'departamento', e.target.value)}>
                      <MenuItem value="">Todos</MenuItem>
                      {departamentos.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Fecha Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }}
                    value={r.filtros.fechaInicio} onChange={(e) => setFiltro(r.key, 'fechaInicio', e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Fecha Fin" type="date" fullWidth InputLabelProps={{ shrink: true }}
                    value={r.filtros.fechaFin} onChange={(e) => setFiltro(r.key, 'fechaFin', e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Button variant="contained" onClick={() => exportar(r.key)}>Exportar Excel</Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
