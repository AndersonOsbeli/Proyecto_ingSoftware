import { useState } from 'react';
import {
  Box, Paper, TextField, Button, Grid, Select, MenuItem, InputLabel,
  FormControl, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { today, nowTime } from '../../lib/store';
import { getAll, add, eliminar } from './service';
import { RegistroEntradaSalida } from './types';
import DeleteIcon from '@mui/icons-material/Delete';

const AREAS = ['Tecnologia', 'Soporte', 'Redes', 'Sistemas', 'Mantenimiento'];

export default function EntradasSalidas() {
  const { currentUser } = useAuth();
  const registros = getAll();
  const [snack, setSnack] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    area: '',
    tipo: 'entrada' as 'entrada' | 'salida',
    fecha: today(),
    hora: nowTime(),
    motivo: '',
    observaciones: ''
  });

  const set = (field: keyof typeof form, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: Omit<RegistroEntradaSalida, 'id'> = {
      ...form,
      registradoPor: currentUser?.name || 'Sin usuario'
    };
    add(nuevo);
    setSnack('Registro guardado correctamente');
    setForm({ nombre: '', area: '', tipo: 'entrada', fecha: today(), hora: nowTime(), motivo: '', observaciones: '' });
  };

  const handleDelete = (id: string) => {
    eliminar(id);
    setSnack('Registro eliminado');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Registro de Entradas y Salidas</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Control de acceso del personal del area tecnica
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Nuevo Registro</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nombre del Personal" required fullWidth
                value={form.nombre} onChange={(e) => set('nombre', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Area</InputLabel>
                <Select label="Area" value={form.area} onChange={(e) => set('area', e.target.value)}>
                  {AREAS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select label="Tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                  <MenuItem value="entrada">Entrada</MenuItem>
                  <MenuItem value="salida">Salida</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha" type="date" required fullWidth InputLabelProps={{ shrink: true }}
                value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Hora" type="time" required fullWidth InputLabelProps={{ shrink: true }}
                value={form.hora} onChange={(e) => set('hora', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Motivo" required fullWidth multiline rows={2}
                value={form.motivo} onChange={(e) => set('motivo', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Observaciones" fullWidth multiline rows={2}
                value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" sx={{ mr: 1 }}>Registrar</Button>
              <Button variant="outlined" onClick={() => setForm({ nombre: '', area: '', tipo: 'entrada', fecha: today(), hora: nowTime(), motivo: '', observaciones: '' })}>Limpiar</Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Historial de Registros ({registros.length})</Typography>
        {registros.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Area</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.fecha} {r.hora}</TableCell>
                    <TableCell>{r.nombre}</TableCell>
                    <TableCell>{r.area}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'}
                        color={r.tipo === 'entrada' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{r.motivo}</TableCell>
                    <TableCell>
                      <IconButton color="error" onClick={() => handleDelete(r.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">No hay registros aun</Typography>
        )}
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
