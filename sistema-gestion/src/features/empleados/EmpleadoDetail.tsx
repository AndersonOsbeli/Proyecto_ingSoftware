import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, IconButton, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tab, Tabs, Grid, Snackbar, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getById as getEmpleado } from './service-empleados';
import { getHorario } from './service-horarios';
import { getByEmpleado as getMarcajes } from './service-marcaje';
import { getByEmpleado as getVacaciones } from './service-vacaciones';
import { getByEmpleado as getPermisos } from './service-permisos';
import { getByEmpleado as getAusencias } from './service-ausencias';

const ESTADO_COLOR: Record<string, 'success' | 'error' | 'info' | 'warning' | 'default'> = {
  activo: 'success', inactivo: 'error', vacaciones: 'info', permiso: 'warning', suspendido: 'default'
};

export default function EmpleadoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState('');

  const empleado = id ? getEmpleado(id) : undefined;
  if (!empleado) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/empleados')}>Volver</Button>
        <Typography sx={{ mt: 2 }}>Cargando...</Typography>
      </Box>
    );
  }

  const marcajes = getMarcajes(empleado.id);
  const vacaciones = getVacaciones(empleado.id);
  const permisos = getPermisos(empleado.id);
  const ausencias = getAusencias(empleado.id);
  const horarioNombre = empleado.horarioLaboralId ? getHorario(empleado.horarioLaboralId)?.nombre || 'Desconocido' : 'Sin horario';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <IconButton onClick={() => navigate('/empleados')}><ArrowBackIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">{empleado.nombre}</Typography>
          <Typography variant="body2" color="text.secondary">
            {empleado.numeroEmpleado} | {empleado.departamento} | {empleado.cargo}
          </Typography>
        </Box>
        <Chip label={empleado.estado} color={ESTADO_COLOR[empleado.estado] || 'default'} />
        <Button variant="outlined" onClick={() => navigate(`/empleados/${empleado.id}/editar`)}>Editar</Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Informacion" />
          <Tab label={`Marcajes (${marcajes.length})`} />
          <Tab label={`Vacaciones (${vacaciones.length})`} />
          <Tab label={`Permisos (${permisos.length})`} />
          <Tab label={`Ausencias (${ausencias.length})`} />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {empleado.fotoBase64
                ? <img src={empleado.fotoBase64} alt="foto" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover' }} />
                : <Chip label="account_circle" variant="outlined" />}
              {empleado.biometricTemplate && (
                <Chip size="small" color="secondary" variant="outlined" label={empleado.biometricTemplate} />
              )}
            </Box>
            <Grid container spacing={2}>
              {[
                ['Correo', empleado.correo], ['Genero', empleado.genero],
                ['Sucursal', empleado.sucursal], ['Fecha Ingreso', empleado.fechaIngreso],
                ['Horario', horarioNombre], ['Registrado por', empleado.registradoPor]
              ].map(([label, value]) => (
                <Grid item xs={12} md={4} key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body1">{value}</Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ py: 2 }}>
            {marcajes.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell><TableCell>Hora</TableCell><TableCell>Tipo</TableCell>
                      <TableCell>Resultado</TableCell><TableCell>Ubicacion</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {marcajes.slice(0, 20).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.fecha}</TableCell><TableCell>{m.hora}</TableCell>
                        <TableCell><Chip size="small" label={m.tipo} color={m.tipo === 'entrada' ? 'success' : 'error'} /></TableCell>
                        <TableCell><Chip size="small" label={m.resultado} variant="outlined" /></TableCell>
                        <TableCell>{m.ubicacion}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No hay marcajes registrados.</Typography>
            )}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ py: 2 }}>
            {vacaciones.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {vacaciones.map((v) => (
                  <Paper key={v.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1">{v.tipo} — {v.fechaInicio} a {v.fechaFin}</Typography>
                      <Chip size="small" label={v.estado} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{v.diasSolicitados} dias | {v.motivo}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No hay vacaciones registradas.</Typography>
            )}
          </Box>
        )}

        {tab === 3 && (
          <Box sx={{ py: 2 }}>
            {permisos.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {permisos.map((p) => (
                  <Paper key={p.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1">{p.tipo} — {p.fechaInicio} {p.horas}h</Typography>
                      <Chip size="small" label={p.estado} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{p.motivo}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No hay permisos registrados.</Typography>
            )}
          </Box>
        )}

        {tab === 4 && (
          <Box sx={{ py: 2 }}>
            {ausencias.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ausencias.map((a) => (
                  <Paper key={a.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1">{a.tipo} — {a.fecha}</Typography>
                      <Chip size="small" label={a.estado} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">{a.motivo}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No hay ausencias registradas.</Typography>
            )}
          </Box>
        )}
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
