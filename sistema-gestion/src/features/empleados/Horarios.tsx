import { useState } from 'react';
import {
  Box, Paper, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, TextField, Select, MenuItem, InputLabel,
  FormControl, Checkbox, FormControlLabel, Snackbar, Alert
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { getAllHorarios, crear, updateHorario, eliminarHorario } from './service-horarios';
import { registrar as registrarAuditoria } from './service-auditoria';
import { DIAS_SEMANA, SUCURSALES, DiaSemana } from './types';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface FormData {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  dias: string[];
  toleranciaMinutos: number;
  sucursal: string;
}

const FORM_INIT: FormData = { nombre: '', horaEntrada: '08:00', horaSalida: '17:00', dias: [], toleranciaMinutos: 10, sucursal: 'Sede Central' };

export default function Horarios() {
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [editandoId, setEditandoId] = useState('');
  const [formData, setFormData] = useState<FormData>(FORM_INIT);
  const horarios = getAllHorarios();

  const set = (field: keyof FormData, value: string | number | string[]) =>
    setFormData((f) => ({ ...f, [field]: value }));

  const toggleDia = (dia: string) => {
    const idx = formData.dias.indexOf(dia);
    set('dias', idx >= 0 ? formData.dias.filter((d) => d !== dia) : [...formData.dias, dia]);
  };

  const guardar = () => {
    const user = currentUser?.name || 'Sistema';
    if (editandoId) {
      updateHorario(editandoId, { ...formData, dias: formData.dias as DiaSemana[] } as any);
      setSnack('Horario actualizado');
    } else {
      crear({ ...formData, creadoPor: user, dias: formData.dias as DiaSemana[] } as any);
      setSnack('Horario creado');
    }
    registrarAuditoria({
      usuario: user, accion: editandoId ? 'editar' : 'crear', modulo: 'horarios',
      registroAfectado: editandoId || 'nuevo', descripcion: `Horario ${formData.nombre} ${editandoId ? 'editado' : 'creado'}`,
      datosAnteriores: null, datosNuevos: JSON.stringify(formData)
    });
    setEditandoId('');
    setFormData(FORM_INIT);
    setMostrar(false);
  };

  const editar = (h: { id: string; nombre: string; horaEntrada: string; horaSalida: string; dias: string[]; toleranciaMinutos: number; sucursal: string }) => {
    setEditandoId(h.id);
    setFormData({ nombre: h.nombre, horaEntrada: h.horaEntrada, horaSalida: h.horaSalida, dias: [...h.dias], toleranciaMinutos: h.toleranciaMinutos, sucursal: h.sucursal });
    setMostrar(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestion de Horarios Laborales</Typography>
        <Button variant="contained" onClick={() => { setMostrar(!mostrar); setEditandoId(''); }}>
          {mostrar ? 'Cancelar' : 'Nuevo Horario'}
        </Button>
      </Box>

      {mostrar && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>{editandoId ? 'Editar' : 'Nuevo'} Horario</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField label="Nombre" value={formData.nombre} onChange={(e) => set('nombre', e.target.value)} />
            <FormControl>
              <InputLabel>Sucursal</InputLabel>
              <Select label="Sucursal" value={formData.sucursal} onChange={(e) => set('sucursal', e.target.value)}>
                {SUCURSALES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Hora entrada" type="time" InputLabelProps={{ shrink: true }}
              value={formData.horaEntrada} onChange={(e) => set('horaEntrada', e.target.value)} />
            <TextField label="Hora salida" type="time" InputLabelProps={{ shrink: true }}
              value={formData.horaSalida} onChange={(e) => set('horaSalida', e.target.value)} />
            <TextField label="Tolerancia (min)" type="number"
              value={formData.toleranciaMinutos} onChange={(e) => set('toleranciaMinutos', Number(e.target.value))} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {DIAS_SEMANA.map((d) => (
                <FormControlLabel key={d}
                  control={<Checkbox checked={formData.dias.includes(d)} onChange={() => toggleDia(d)} />}
                  label={d} />
              ))}
            </Box>
            <Box>
              <Button variant="contained" onClick={guardar} disabled={!formData.nombre}>Guardar</Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        {horarios.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell><TableCell>Horario</TableCell><TableCell>Dias</TableCell>
                  <TableCell>Tolerancia</TableCell><TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {horarios.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.nombre}</TableCell>
                    <TableCell>{h.horaEntrada} - {h.horaSalida}</TableCell>
                    <TableCell>{h.dias.join(', ')}</TableCell>
                    <TableCell>{h.toleranciaMinutos} min</TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => editar(h)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => { eliminarHorario(h.id); setSnack('Horario eliminado'); }}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">No hay horarios registrados</Typography>
        )}
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
