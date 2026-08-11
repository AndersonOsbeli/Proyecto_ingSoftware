import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert, Card, CardContent, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteIcon from '@mui/icons-material/Delete';
import { getIngresos, getInspecciones, getModeloPorId, eliminarIngreso } from './service';
import { ESTADO_LABELS, RESULTADO_LABELS } from './types';

export default function Inventario() {
  const navigate = useNavigate();
  const [snack, setSnack] = useState('');
  const ingresos = getIngresos();
  const inspecciones = getInspecciones();

  const getInspeccion = (ingresoId: string) => inspecciones.find((i) => i.ingresoId === ingresoId);

  const getModeloName = (modeloId: string) => {
    const m = getModeloPorId(modeloId);
    return m ? `${m.marca} ${m.nombre}` : modeloId;
  };

  const sinInspeccion = ingresos.filter((i) => !getInspeccion(i.id)).length;
  const enProceso = inspecciones.filter((i) => i.estado !== 'completada').length;
  const completadas = inspecciones.filter((i) => i.estado === 'completada').length;

  const handleDelete = (id: string) => {
    eliminarIngreso(id);
    setSnack('Ingreso eliminado');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5">Gestion de Inventario</Typography>
          <Typography variant="body2" color="text.secondary">
            Registro de ingresos y ciclo de inspeccion de equipos
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/inventario/ingreso')}>
          Nuevo Ingreso
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Ingresos', value: ingresos.length },
          { label: 'Sin Inspeccion', value: sinInspeccion },
          { label: 'En Proceso', value: enProceso },
          { label: 'Completadas', value: completadas }
        ].map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">{s.value}</Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2 }}>
        {ingresos.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Folio</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Modelo</TableCell>
                  <TableCell>No. Serie</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado Inspeccion</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingresos.map((i) => {
                  const ins = getInspeccion(i.id);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{i.folio}</TableCell>
                      <TableCell>{new Date(i.fecha).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell>{getModeloName(i.modelo)}</TableCell>
                      <TableCell>{i.numeroSerie}</TableCell>
                      <TableCell>{i.tipoEquipo}</TableCell>
                      <TableCell>
                        {ins ? (
                          <Chip size="small" label={ESTADO_LABELS[ins.estado]} />
                        ) : (
                          <Chip size="small" label="Sin inspeccion" color="warning" />
                        )}
                      </TableCell>
                      <TableCell>
                        {ins?.resultado ? (
                          <Chip size="small" label={RESULTADO_LABELS[ins.resultado]} color="primary" variant="outlined" />
                        ) : (
                          <Typography variant="body2" color="text.disabled">---</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton color="primary" onClick={() => navigate(`/inventario/inspeccion/${i.id}`)}
                          title={ins ? 'Ver expediente' : 'Crear inspeccion'}>
                          {ins ? <VisibilityIcon /> : <AssignmentIcon />}
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDelete(i.id)} title="Eliminar"><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>No hay ingresos registrados</Typography>
            <Button variant="contained" onClick={() => navigate('/inventario/ingreso')}>
              Registrar Primer Ingreso
            </Button>
          </Box>
        )}
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
