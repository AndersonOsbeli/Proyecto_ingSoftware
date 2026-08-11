import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, TextField, Select, MenuItem,
  InputLabel, FormControl, Grid, Card, CardContent, Snackbar, Alert
} from '@mui/material';
import { getEmpleados, activar, desactivar } from './service-empleados';
import { registrar as registrarAuditoria } from './service-auditoria';
import { useAuth } from '../../lib/auth';
import { DEPARTAMENTOS, Empleado } from './types';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';

const ESTADO_COLOR: Record<string, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  activo: 'success',
  inactivo: 'error',
  vacaciones: 'info',
  permiso: 'warning',
  suspendido: 'default'
};

export default function EmpleadosList() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const [termino, setTermino] = useState('');
  const [filtroDepto, setFiltroDepto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const empleados = getEmpleados();
  const empleadosFiltrados = empleados.filter((e) => {
    if (termino) {
      const t = termino.toLowerCase();
      if (!e.nombre.toLowerCase().includes(t) && !e.numeroEmpleado.toLowerCase().includes(t) && !e.correo.toLowerCase().includes(t)) return false;
    }
    if (filtroDepto && e.departamento !== filtroDepto) return false;
    if (filtroEstado && e.estado !== filtroEstado) return false;
    return true;
  });

  const activos = empleados.filter((e) => e.estado === 'activo').length;
  const inactivos = empleados.filter((e) => e.estado === 'inactivo').length;

  const toggleEstado = (emp: Empleado) => {
    const usuario = currentUser?.name || 'Sistema';
    if (emp.estado === 'activo') {
      desactivar(emp.id);
      registrarAuditoria({
        usuario, accion: 'desactivar', modulo: 'empleados',
        registroAfectado: emp.id, descripcion: `Empleado ${emp.nombre} desactivado`,
        datosAnteriores: JSON.stringify({ estado: 'activo' }), datosNuevos: JSON.stringify({ estado: 'inactivo' })
      });
      setSnack('Empleado desactivado');
    } else {
      activar(emp.id);
      registrarAuditoria({
        usuario, accion: 'activar', modulo: 'empleados',
        registroAfectado: emp.id, descripcion: `Empleado ${emp.nombre} activado`,
        datosAnteriores: JSON.stringify({ estado: 'inactivo' }), datosNuevos: JSON.stringify({ estado: 'activo' })
      });
      setSnack('Empleado activado');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5">Gestion de Empleados</Typography>
          <Typography variant="body2" color="text.secondary">Administrar empleados, horarios y estados</Typography>
        </Box>
        <Button variant="contained" onClick={() => navigate('/empleados/nuevo')}>Nuevo Empleado</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Total', value: empleados.length },
          { label: 'Activos', value: activos },
          { label: 'Inactivos', value: inactivos },
          { label: 'Filtrados', value: empleadosFiltrados.length }
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card><CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{s.value}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField label="Buscar empleado" fullWidth size="small" value={termino}
              onChange={(e) => setTermino(e.target.value)} placeholder="Nombre, numero o correo" />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Departamento</InputLabel>
              <Select label="Departamento" value={filtroDepto} onChange={(e) => setFiltroDepto(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {DEPARTAMENTOS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {empleadosFiltrados.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>No. Empleado</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Depto.</TableCell>
                  <TableCell>Cargo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {empleadosFiltrados.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      {e.fotoBase64
                        ? <img src={e.fotoBase64} alt="foto" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        : <Chip label="person" size="small" />}
                    </TableCell>
                    <TableCell>{e.numeroEmpleado}</TableCell>
                    <TableCell>{e.nombre}</TableCell>
                    <TableCell>{e.departamento}</TableCell>
                    <TableCell>{e.cargo}</TableCell>
                    <TableCell><Chip size="small" label={e.estado} color={ESTADO_COLOR[e.estado] || 'default'} /></TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => navigate(`/empleados/${e.id}`)} title="Ver detalle"><VisibilityIcon /></IconButton>
                      <IconButton color={e.estado === 'activo' ? 'error' : 'success'}
                        onClick={() => toggleEstado(e)}
                        title={e.estado === 'activo' ? 'Desactivar' : 'Activar'}>
                        {e.estado === 'activo' ? <PersonOffIcon /> : <PersonIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>No hay empleados registrados</Typography>
            <Button variant="contained" onClick={() => navigate('/empleados/nuevo')}>Registrar Primer Empleado</Button>
          </Box>
        )}
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
