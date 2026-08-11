import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { getEmpleados } from './service-empleados';
import { getByEmpleadoYRango, getByRangoFechas, getAll } from './service-marcaje';
import { Marcaje } from './types';

export default function HistorialAsistencia() {
  const hoy = new Date().toISOString().split('T')[0];
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroInicio, setFiltroInicio] = useState(hoy);
  const [filtroFin, setFiltroFin] = useState(hoy);
  const empleados = getEmpleados();

  const marcajes: Marcaje[] = useMemo(() => {
    if (filtroEmpleado) return getByEmpleadoYRango(filtroEmpleado, filtroInicio, filtroFin);
    if (filtroInicio && filtroFin) return getByRangoFechas(filtroInicio, filtroFin);
    return getAll();
  }, [filtroEmpleado, filtroInicio, filtroFin]);

  const resumen = useMemo(() => ({
    entradas: marcajes.filter((m) => m.tipo === 'entrada' && m.resultado === 'exitoso').length,
    salidas: marcajes.filter((m) => m.tipo === 'salida' && m.resultado === 'exitoso').length,
    pendientes: marcajes.filter((m) => m.resultado !== 'exitoso').length
  }), [marcajes]);

  const getEmpName = (id: string) => getEmpleados().find((e) => e.id === id)?.nombre || id;

  const mini = (label: string, value: number) => (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h4">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Historial de Asistencia</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Empleado</InputLabel>
              <Select label="Empleado" value={filtroEmpleado} onChange={(e) => setFiltroEmpleado(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {empleados.map((e) => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Fecha Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Fecha Fin" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={filtroFin} onChange={(e) => setFiltroFin(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>{mini('Entradas', resumen.entradas)}</Grid>
        <Grid item xs={4}>{mini('Salidas', resumen.salidas)}</Grid>
        <Grid item xs={4}>{mini('Pendientes', resumen.pendientes)}</Grid>
      </Grid>

      {marcajes.length > 0 ? (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Empleado</TableCell><TableCell>Fecha</TableCell><TableCell>Hora</TableCell>
                  <TableCell>Tipo</TableCell><TableCell>Resultado</TableCell><TableCell>Ubicacion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {marcajes.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{getEmpName(m.empleadoId)}</TableCell>
                    <TableCell>{m.fecha}</TableCell>
                    <TableCell>{m.hora}</TableCell>
                    <TableCell><Chip size="small" label={m.tipo} /></TableCell>
                    <TableCell><Chip size="small" label={m.resultado} /></TableCell>
                    <TableCell>{m.ubicacion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Typography color="text.secondary">No hay registros de asistencia</Typography>
      )}
    </Box>
  );
}
