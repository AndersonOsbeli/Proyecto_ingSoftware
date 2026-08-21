import { useState } from 'react';
import {
  Box, Paper, TextField, Button, Grid, Select, MenuItem, InputLabel,
  FormControl, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert, Menu, MenuItem as MuiMenuItem
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '../../lib/auth';
import { today, nowTime } from '../../lib/store';
import { getAll, add, updateEstado, eliminar } from './service';
import { BitacoraEntry, ESTADO_LABELS } from './types';

const AREAS = ['Tecnologia', 'Soporte', 'Redes', 'Sistemas', 'Mantenimiento', 'Administracion'];

const ESTADO_COLOR: Record<string, 'warning' | 'info' | 'success'> = {
  pendiente: 'warning',
  en_proceso: 'info',
  completado: 'success'
};

const MEDIO_LABEL: Record<string, string> = {
  telefono: 'Telefono',
  correo: 'Correo',
  presencial: 'Presencial'
};

export default function Bitacora() {
  const { currentUser } = useAuth();
  const registros = getAll();
  const [snack, setSnack] = useState('');
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fecha: today(),
    hora: nowTime(),
    solicitante: '',
    area: '',
    medioSolicitud: 'telefono',
    descripcion: '',
    accionRealizada: ''
  });

  const set = (field: keyof typeof form, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: Omit<BitacoraEntry, 'id'> = {
      ...form,
      medioSolicitud: form.medioSolicitud as BitacoraEntry['medioSolicitud'],
      estado: 'pendiente',
      registradoPor: currentUser?.name || 'Sin usuario'
    };
    add(nuevo);
    setSnack('Registro agregado a la bitacora');
    setForm({ fecha: today(), hora: nowTime(), solicitante: '', area: '', medioSolicitud: 'telefono', descripcion: '', accionRealizada: '' });
  };

  const cambiarEstado = (id: string, estado: BitacoraEntry['estado']) => {
    updateEstado(id, estado);
    setSnack('Estado actualizado');
  };

  const handleDelete = (id: string) => {
    eliminar(id);
    setSnack('Registro eliminado');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Bitacora de Procedimientos</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Registra procedimientos solicitados por via telefonica, correo o de forma personal (sin ticket)
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Nuevo Registro en Bitacora</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha" type="date" required fullWidth InputLabelProps={{ shrink: true }}
                value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Hora" type="time" required fullWidth InputLabelProps={{ shrink: true }}
                value={form.hora} onChange={(e) => set('hora', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Medio de Solicitud</InputLabel>
                <Select label="Medio de Solicitud" value={form.medioSolicitud}
                  onChange={(e) => set('medioSolicitud', e.target.value)}>
                  <MenuItem value="telefono">Telefono</MenuItem>
                  <MenuItem value="correo">Correo</MenuItem>
                  <MenuItem value="presencial">Presencial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Solicitante" required fullWidth
                value={form.solicitante} onChange={(e) => set('solicitante', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Area</InputLabel>
                <Select label="Area" value={form.area} onChange={(e) => set('area', e.target.value)}>
                  {AREAS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripcion del Procedimiento" required fullWidth multiline rows={3}
                value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Accion Realizada" required fullWidth multiline rows={2}
                value={form.accionRealizada} onChange={(e) => set('accionRealizada', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" sx={{ mr: 1 }}>Registrar en Bitacora</Button>
              <Button variant="outlined" onClick={() => setForm({ fecha: today(), hora: nowTime(), solicitante: '', area: '', medioSolicitud: 'telefono', descripcion: '', accionRealizada: '' })}>Limpiar</Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Historial de Bitacora ({registros.length})</Typography>
        {registros.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Solicitante</TableCell>
                  <TableCell>Medio</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.fecha} {r.hora}</TableCell>
                    <TableCell>{r.solicitante}</TableCell>
                    <TableCell>{MEDIO_LABEL[r.medioSolicitud]}</TableCell>
                    <TableCell>{r.descripcion}</TableCell>
                    <TableCell>
                      <Chip size="small" label={ESTADO_LABELS[r.estado]} color={ESTADO_COLOR[r.estado]} />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => { setAnchor(e.currentTarget); setSelectedId(r.id); }}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">No hay registros en la bitacora</Typography>
        )}
      </Paper>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MuiMenuItem onClick={() => { if (selectedId) cambiarEstado(selectedId, 'completado'); setAnchor(null); }}>Completado</MuiMenuItem>
        <MuiMenuItem onClick={() => { if (selectedId) cambiarEstado(selectedId, 'en_proceso'); setAnchor(null); }}>En Proceso</MuiMenuItem>
        <MuiMenuItem onClick={() => { if (selectedId) cambiarEstado(selectedId, 'pendiente'); setAnchor(null); }}>Pendiente</MuiMenuItem>
        <MuiMenuItem onClick={() => { if (selectedId) handleDelete(selectedId); setAnchor(null); }} sx={{ color: 'error.main' }}>Eliminar</MuiMenuItem>
      </Menu>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
