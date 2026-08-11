import { useState } from 'react';
import {
  Box, Paper, Typography, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { getAll as getAllVacaciones } from './service-vacaciones';
import { getAll as getAllPermisos } from './service-permisos';
import { getEmpleados } from './service-empleados';

export default function HistorialSolicitudes() {
  const [tab, setTab] = useState(0);
  const vacaciones = getAllVacaciones();
  const permisos = getAllPermisos();

  const getEmpName = (id: string) => getEmpleados().find((e) => e.id === id)?.nombre || id;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Historial de Solicitudes</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Vacaciones (${vacaciones.length})`} />
        <Tab label={`Permisos (${permisos.length})`} />
      </Tabs>

      {tab === 0 && (
        vacaciones.length > 0 ? (
          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado</TableCell><TableCell>Tipo</TableCell><TableCell>Fechas</TableCell>
                    <TableCell>Dias</TableCell><TableCell>Estado</TableCell><TableCell>Aprobado por</TableCell>
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
                      <TableCell>{v.aprobadoPor || '---'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Typography color="text.secondary">No hay solicitudes de vacaciones.</Typography>
        )
      )}

      {tab === 1 && (
        permisos.length > 0 ? (
          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado</TableCell><TableCell>Tipo</TableCell><TableCell>Fecha</TableCell>
                    <TableCell>Estado</TableCell><TableCell>Aprobado por</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permisos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{getEmpName(p.empleadoId)}</TableCell>
                      <TableCell>{p.tipo}</TableCell>
                      <TableCell>{p.fechaInicio} | {p.horas}h</TableCell>
                      <TableCell><Chip size="small" label={p.estado} /></TableCell>
                      <TableCell>{p.aprobadoPor || '---'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Typography color="text.secondary">No hay solicitudes de permisos.</Typography>
        )
      )}
    </Box>
  );
}
