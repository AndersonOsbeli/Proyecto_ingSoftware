import { useState } from 'react';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { getEmpleados } from './service-empleados';
import { getAll as getAllPermisos, solicitar, aprobar, rechazar } from './service-permisos';
import { registrar as registrarAuditoria } from './service-auditoria';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const FORM_INIT = { empleadoId: '', tipo: 'personal', fechaInicio: '', fechaFin: '', horas: 4, motivo: '' };

export default function Permisos() {
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const [formData, setFormData] = useState(FORM_INIT);
  const empleados = getEmpleados();
  const permisos = getAllPermisos();

  const getEmpName = (id: string) => getEmpleados().find((e) => e.id === id)?.nombre || id;

  const handleSolicitar = () => {
    const user = currentUser?.name || 'Sistema';
    solicitar({
      ...formData, tipo: formData.tipo as any,
      fechaFin: formData.fechaFin || formData.fechaInicio,
      documentoAdjunto: '', observaciones: '', registradoPor: user
    });
    registrarAuditoria({
      usuario: user, accion: 'crear', modulo: 'permisos',
      registroAfectado: 'nuevo', descripcion: 'Permiso solicitado',
      datosAnteriores: null, datosNuevos: JSON.stringify(formData)
    });
    setSnack('Permiso solicitado');
    setFormData(FORM_INIT);
  };

  const handleAprobar = (id: string) => {
    aprobar(id, currentUser?.name || 'Sistema');
    setSnack('Permiso aprobado');
  };

  const handleRechazar = (id: string) => {
    rechazar(id, currentUser?.name || 'Sistema', 'Rechazado');
    setSnack('Permiso rechazado');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Gestion de Permisos</Typography>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Solicitar Permiso</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Empleado</InputLabel>
              <Select label="Empleado" value={formData.empleadoId}
                onChange={(e) => setFormData((f) => ({ ...f, empleadoId: e.target.value }))}>
                {empleados.map((e) => <MenuItem key={e.id} value={e.id}>{e.nombre}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={formData.tipo}
                onChange={(e) => setFormData((f) => ({ ...f, tipo: e.target.value }))}>
                <MenuItem value="medico">Medico</MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
                <MenuItem value="familiar">Familiar</MenuItem>
                <MenuItem value="educativo">Educativo</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Horas" type="number" fullWidth
              value={formData.horas} onChange={(e) => setFormData((f) => ({ ...f, horas: Number(e.target.value) }))} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Fecha Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={formData.fechaInicio} onChange={(e) => setFormData((f) => ({ ...f, fechaInicio: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Fecha Fin" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={formData.fechaFin} onChange={(e) => setFormData((f) => ({ ...f, fechaFin: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Motivo" fullWidth multiline rows={2}
              value={formData.motivo} onChange={(e) => setFormData((f) => ({ ...f, motivo: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleSolicitar} disabled={!formData.empleadoId || !formData.fechaInicio}>
              Enviar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {permisos.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Permisos Registrados</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Empleado</TableCell><TableCell>Tipo</TableCell><TableCell>Fechas/Hours</TableCell>
                  <TableCell>Estado</TableCell><TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permisos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{getEmpName(p.empleadoId)}</TableCell>
                    <TableCell>{p.tipo}</TableCell>
                    <TableCell>{p.fechaInicio} | {p.horas}h</TableCell>
                    <TableCell><Chip size="small" label={p.estado} /></TableCell>
                    <TableCell>
                      {p.estado === 'pendiente' && (
                        <>
                          <IconButton color="success" onClick={() => handleAprobar(p.id)}><CheckIcon /></IconButton>
                          <IconButton color="error" onClick={() => handleRechazar(p.id)}><CloseIcon /></IconButton>
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
