import { useState } from 'react';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { getEmpleados } from './service-empleados';
import { getAll, getByEmpleado, getBalance, solicitar as solicitarSolicitud, aprobar as aprobarSolicitud, rechazar as rechazarSolicitud } from './service-vacaciones';
import { registrar as registrarAuditoria } from './service-auditoria';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

export default function Vacaciones() {
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [formData, setFormData] = useState({ tipo: 'anual', fechaInicio: '', fechaFin: '', motivo: '' });

  const empleados = getEmpleados();
  const vacaciones = empleadoSeleccionado ? getByEmpleado(empleadoSeleccionado) : getAll();
  const balance = empleadoSeleccionado ? getBalance(empleadoSeleccionado, new Date().getFullYear()) : null;

  const getEmpName = (id: string) => getEmpleados().find((e) => e.id === id)?.nombre || id;

  const handleSolicitar = () => {
    const user = currentUser?.name || 'Sistema';
    const emp = getEmpleados().find((e) => e.id === empleadoSeleccionado);
    const dias = Math.ceil((new Date(formData.fechaFin).getTime() - new Date(formData.fechaInicio).getTime()) / 86400000) + 1;
    if (dias <= 0 || !empleadoSeleccionado) { setSnack('Fechas invalidas'); return; }
    solicitarSolicitud({
      empleadoId: empleadoSeleccionado, tipo: formData.tipo as 'anual' | 'personal' | 'medica',
      fechaInicio: formData.fechaInicio, fechaFin: formData.fechaFin,
      diasSolicitados: dias, motivo: formData.motivo,
      observaciones: '', registradoPor: user
    });
    registrarAuditoria({
      usuario: user, accion: 'crear', modulo: 'vacaciones',
      registroAfectado: 'nueva', descripcion: `Solicitud vacaciones de ${emp?.nombre} (${dias} dias)`,
      datosAnteriores: null, datosNuevos: JSON.stringify(formData)
    });
    setSnack('Solicitud enviada');
    setFormData({ tipo: 'anual', fechaInicio: '', fechaFin: '', motivo: '' });
  };

  const handleAprobar = (id: string) => {
    const user = currentUser?.name || 'Sistema';
    aprobarSolicitud(id, user);
    setSnack('Vacaciones aprobadas');
  };

  const handleRechazar = (id: string) => {
    const user = currentUser?.name || 'Sistema';
    rechazarSolicitud(id, user, 'Rechazado por administrador');
    setSnack('Solicitud rechazada');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Gestion de Vacaciones</Typography>

      <FormControl sx={{ mb: 2, minWidth: 320 }}>
        <InputLabel>Empleado</InputLabel>
        <Select label="Empleado" value={empleadoSeleccionado} onChange={(e) => setEmpleadoSeleccionado(e.target.value)}>
          {empleados.map((e) => (
            <MenuItem key={e.id} value={e.id}>{e.nombre} ({e.numeroEmpleado})</MenuItem>
          ))}
        </Select>
      </FormControl>

      {balance && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: 'Dias Totales', value: balance.diasTotales },
            { label: 'Usados', value: balance.diasUsados },
            { label: 'Pendientes', value: balance.diasPendientes }
          ].map((b) => (
            <Grid item xs={4} key={b.label}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4">{b.value}</Typography>
                <Typography color="text.secondary">{b.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {empleadoSeleccionado && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Solicitar Vacaciones</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={formData.tipo} onChange={(e) => setFormData((f) => ({ ...f, tipo: e.target.value }))}>
                  <MenuItem value="anual">Anual</MenuItem>
                  <MenuItem value="personal">Personal</MenuItem>
                  <MenuItem value="medica">Medica</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }}
                value={formData.fechaInicio} onChange={(e) => setFormData((f) => ({ ...f, fechaInicio: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha Fin" type="date" fullWidth InputLabelProps={{ shrink: true }}
                value={formData.fechaFin} onChange={(e) => setFormData((f) => ({ ...f, fechaFin: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Motivo" fullWidth multiline rows={2}
                value={formData.motivo} onChange={(e) => setFormData((f) => ({ ...f, motivo: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSolicitar} disabled={!formData.fechaInicio || !formData.fechaFin}>
                Enviar Solicitud
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {vacaciones.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Solicitudes</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Empleado</TableCell><TableCell>Tipo</TableCell><TableCell>Fechas</TableCell>
                  <TableCell>Dias</TableCell><TableCell>Estado</TableCell><TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vacaciones.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{getEmpName(v.empleadoId)}</TableCell>
                    <TableCell>{v.tipo}</TableCell>
                    <TableCell>{v.fechaInicio} - {v.fechaFin}</TableCell>
                    <TableCell>{v.diasSolicitados}</TableCell>
                    <TableCell><Chip size="small" label={v.estado} /></TableCell>
                    <TableCell>
                      {v.estado === 'pendiente' && (
                        <>
                        <IconButton color="success" onClick={() => handleAprobar(v.id)}><CheckIcon /></IconButton>
                        <IconButton color="error" onClick={() => handleRechazar(v.id)}><CloseIcon /></IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
