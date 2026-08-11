import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, Snackbar, Alert, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../lib/auth';
import { today } from '../../lib/store';
import { getModelos, registrarIngreso } from './service';
import { IngresoEquipo } from './types';

export default function Ingreso() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const modelos = getModelos();

  const [form, setForm] = useState({
    fecha: today(),
    origen: 'proveedor',
    proveedor: '',
    tipoEquipo: 'laptop',
    cantidad: 1,
    documentoReferencia: '',
    modelo: '',
    numeroParte: '',
    numeroSerie: '',
    estadoFisico: 'Nuevo',
    observaciones: ''
  });

  const set = (field: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.modelo || !form.numeroSerie || !form.proveedor) {
      setSnack('Complete los campos obligatorios');
      return;
    }
    const data: Omit<IngresoEquipo, 'id' | 'folio'> = {
      ...form,
      cantidad: Number(form.cantidad),
      origen: form.origen as IngresoEquipo['origen'],
      estadoFisico: form.estadoFisico as IngresoEquipo['estadoFisico'],
      registradoPor: currentUser?.name || 'Sin usuario'
    };
    registrarIngreso(data);
    setSnack('Ingreso registrado correctamente');
    setTimeout(() => navigate('/inventario'), 600);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate('/inventario')}><ArrowBackIcon /></IconButton>
        <Box>
          <Typography variant="h5">Registrar Ingreso de Equipo</Typography>
          <Typography variant="body2" color="text.secondary">
            Captura los datos del equipo que ingresa al area de inspeccion
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>Datos del Ingreso</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <TextField label="Fecha de Ingreso" type="date" required fullWidth InputLabelProps={{ shrink: true }}
                value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Origen del Equipo</InputLabel>
                <Select label="Origen del Equipo" value={form.origen} onChange={(e) => set('origen', e.target.value)}>
                  <MenuItem value="proveedor">Proveedor</MenuItem>
                  <MenuItem value="interno">Transferencia interna</MenuItem>
                  <MenuItem value="donacion">Donacion</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Cantidad" type="number" fullWidth inputProps={{ min: 1 }}
                value={form.cantidad} onChange={(e) => set('cantidad', Number(e.target.value))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Proveedor / Remitente" required fullWidth
                value={form.proveedor} onChange={(e) => set('proveedor', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Documento de Referencia" fullWidth
                placeholder="Folio, orden de compra, etc. (opcional)"
                value={form.documentoReferencia} onChange={(e) => set('documentoReferencia', e.target.value)} />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>Identificacion del Equipo</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Equipo</InputLabel>
                <Select label="Tipo de Equipo" value={form.tipoEquipo} onChange={(e) => set('tipoEquipo', e.target.value)}>
                  <MenuItem value="laptop">Laptop</MenuItem>
                  <MenuItem value="desktop">Desktop</MenuItem>
                  <MenuItem value="monitor">Monitor</MenuItem>
                  <MenuItem value="impresora">Impresora</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth required>
                <InputLabel>Modelo</InputLabel>
                <Select label="Modelo" value={form.modelo} onChange={(e) => set('modelo', e.target.value)}>
                  {modelos.map((m) => (
                    <MenuItem key={m.modeloId} value={m.modeloId}>{m.marca} - {m.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado Fisico</InputLabel>
                <Select label="Estado Fisico" value={form.estadoFisico} onChange={(e) => set('estadoFisico', e.target.value)}>
                  <MenuItem value="Nuevo">Nuevo</MenuItem>
                  <MenuItem value="Usado - Bueno">Usado - Bueno</MenuItem>
                  <MenuItem value="Usado - Danado">Usado - Danado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Numero de Serie" required fullWidth placeholder="SN-123456"
                value={form.numeroSerie} onChange={(e) => set('numeroSerie', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Numero de Parte" fullWidth placeholder="Part number (opcional)"
                value={form.numeroParte} onChange={(e) => set('numeroParte', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Observaciones" fullWidth multiline rows={3}
                placeholder="Notas adicionales sobre el estado o condicion del equipo"
                value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
            </Grid>
          </Grid>

          <Button type="submit" variant="contained" sx={{ mr: 1 }}>Registrar Ingreso</Button>
          <Button variant="outlined" onClick={() => navigate('/inventario')}>Cancelar</Button>
        </Box>
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
