import { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { getByFiltros } from './service-auditoria';
import { TipoAccionAuditoria } from './types';

const ACCIONES: TipoAccionAuditoria[] = ['crear', 'editar', 'eliminar', 'activar', 'desactivar', 'aprobar', 'rechazar', 'marcaje', 'exportar'];

export default function Auditoria() {
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFin, setFiltroFin] = useState('');

  const registros = useMemo(() => getByFiltros({
    usuario: filtroUsuario || undefined,
    accion: (filtroAccion as TipoAccionAuditoria) || undefined,
    modulo: filtroModulo || undefined,
    fechaInicio: filtroInicio || undefined,
    fechaFin: filtroFin || undefined
  }), [filtroUsuario, filtroAccion, filtroModulo, filtroInicio, filtroFin]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Bitacora de Auditoria</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4} lg={2.4}>
            <TextField label="Usuario" fullWidth value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={4} lg={2.4}>
            <FormControl fullWidth>
              <InputLabel>Accion</InputLabel>
              <Select label="Accion" value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {ACCIONES.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4} lg={2.4}>
            <TextField label="Modulo" fullWidth value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6} lg={2.4}>
            <TextField label="Fecha Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6} lg={2.4}>
            <TextField label="Fecha Fin" type="date" fullWidth InputLabelProps={{ shrink: true }}
              value={filtroFin} onChange={(e) => setFiltroFin(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      {registros.length > 0 ? (
        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell><TableCell>Fecha/Hora</TableCell><TableCell>Accion</TableCell>
                  <TableCell>Modulo</TableCell><TableCell>Descripcion</TableCell><TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.usuario}</TableCell>
                    <TableCell>{new Date(r.fechaHora).toLocaleString()}</TableCell>
                    <TableCell><Chip size="small" label={r.accion} /></TableCell>
                    <TableCell>{r.modulo}</TableCell>
                    <TableCell>{r.descripcion}</TableCell>
                    <TableCell>{r.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Typography color="text.secondary">No hay registros de auditoria</Typography>
      )}
    </Box>
  );
}
