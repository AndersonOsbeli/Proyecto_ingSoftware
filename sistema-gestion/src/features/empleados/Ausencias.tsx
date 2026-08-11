import { useState } from 'react';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { getEmpleados } from './service-empleados';
import { registrar, getAll as getAllAusencias, aprobar, rechazar } from './service-ausencias';
import { registrar as registrarAuditoria } from './service-auditoria';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const FORM_INIT = { empleadoId: '', fecha: '', tipo: 'injustificada', motivo: '' };

export default function Ausencias() {
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const [formData, setFormData] = useState(FORM_INIT);
  const empleados = getEmpleados();
  const ausencias = getAllAusencias();

  const getEmpName = (id: string) => getEmpleados().find((e) => e.id === id)?.nombre || id;

  const handleRegistrar = () => {
    const user = currentUser?.name || 'Sistema';
    registrar({
      ...formData, tipo: formData.tipo as any,
      documentoAdjunto: '', observacionesAprobacion: '', registradoPor: user
    });
    registrarAuditoria({
      usuario: user, accion: 'crear', modulo: 'ausencias',
      registroAfectado: 'nueva', descripcion: 'Ausencia registrada',
      datosAnteriores: null, datosNuevos: JSON.stringify(formData)
    });
    setSnack('Ausencia registrada');
    setFormData(FORM_INIT);
  };

  const handleAprobar = (id: string) => {
    aprobar(id, currentUser?.name || 'Sistema', 'Aprobada');
    setSnack('Ausencia aprobada');
  };

  const handleRechazar = (id: string) => {
    rechazar(id, currentUser?.name || 'Sistema', 'Rechazada');
    setSnack('Ausencia rechazada');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Justificacion de Ausencias</Typography>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Registrar Ausencia</Typography>
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
            <TextField label="Fecha" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={formData.fecha} onChange={(e) => setFormData((f) => ({ ...f, fecha: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select label="Tipo" value={formData.tipo}
                onChange={(e) => setFormData((f) => ({ ...f, tipo: e.target.value }))}>
                <MenuItem value="injustificada">Injustificada</MenuItem>
                <MenuItem value="justificada_medica">Justificada Medica</MenuItem>
                <MenuItem value="justificada_personal">Justificada Personal</MenuItem>
                <MenuItem value="otro">Otro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Motivo" fullWidth multiline rows={2}
              value={formData.motivo} onChange={(e) => setFormData((f) => ({ ...f, motivo: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleRegistrar} disabled={!formData.empleadoId || !formData.fecha}>
              Registrar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {ausencias.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Ausencias Registradas</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Empleado</TableCell><TableCell>Fecha</TableCell><TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell><TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ausencias.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{getEmpName(a.empleadoId)}</TableCell>
                    <TableCell>{a.fecha}</TableCell>
                    <TableCell>{a.tipo}</TableCell>
                    <TableCell><Chip size="small" label={a.estado} /></TableCell>
                    <TableCell>
                      {a.estado === 'pendiente' && (
                        <>
                          <IconButton color="success" onClick={() => handleAprobar(a.id)}><CheckIcon /></IconButton>
                          <IconButton color="error" onClick={() => handleRechazar(a.id)}><CloseIcon /></IconButton>
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
