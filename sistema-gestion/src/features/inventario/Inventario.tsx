import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert, Card, CardContent, Grid,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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
  const pendientesDoc = ingresos.filter((i) => i.estadoDocumental === 'pendiente_validacion').length;

  const handleDelete = (id: string) => {
    eliminarIngreso(id);
    setSnack('Ingreso eliminado');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Gestión de Inventario</Typography>
          <Typography variant="body2" color="text.secondary">
            Registro de ingresos y ciclo de inspección de equipos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/inventario/ingreso')}
          sx={{ fontWeight: 600 }}
        >
          Registrar Ingreso
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Ingresos', value: ingresos.length, color: '#1E40AF' },
          { label: 'Pendiente Doc.', value: pendientesDoc, color: '#D97706' },
          { label: 'Sin Inspección', value: sinInspeccion, color: '#DC2626' },
          { label: 'Completadas', value: completadas, color: '#166534' }
        ].map((s) => (
          <Grid item xs={12} sm={6} md={3} key={s.label}>
            <Card sx={{ borderLeft: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                <Typography color="text.secondary" variant="body2">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {ingresos.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Folio (ID)</strong></TableCell>
                  <TableCell><strong>Fecha</strong></TableCell>
                  <TableCell><strong>Proveedor / Modelo</strong></TableCell>
                  <TableCell><strong>No. Serie</strong></TableCell>
                  <TableCell><strong>Estado Documental</strong></TableCell>
                  <TableCell><strong>Estado Inspección</strong></TableCell>
                  <TableCell><strong>Resultado</strong></TableCell>
                  <TableCell align="right"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingresos.map((i) => {
                  const ins = getInspeccion(i.id);
                  const sinDoc = i.estadoDocumental === 'pendiente_validacion' || !i.documentoReferencia;

                  return (
                    <TableRow key={i.id} hover>
                      <TableCell>
                        <Chip label={i.folio} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>{new Date(i.fecha).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{getModeloName(i.modelo)}</Typography>
                        <Typography variant="caption" color="text.secondary">{i.proveedor}</Typography>
                      </TableCell>
                      <TableCell>{i.numeroSerie || 'S/N'}</TableCell>
                      <TableCell>
                        {sinDoc ? (
                          <Tooltip title="Sin documento de referencia registrado. Pendiente de validación documental.">
                            <Chip
                              size="small"
                              icon={<WarningAmberIcon />}
                              label="Pendiente Doc."
                              color="warning"
                              variant="filled"
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title={`Documento: ${i.documentoReferencia}`}>
                            <Chip
                              size="small"
                              icon={<CheckCircleOutlineIcon />}
                              label="Documentado"
                              color="success"
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {ins ? (
                          <Chip size="small" label={ESTADO_LABELS[ins.estado] || ins.estado} color="info" />
                        ) : (
                          <Chip size="small" label="Disponible p/ Inspección" color="secondary" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        {ins?.resultado ? (
                          <Chip size="small" label={RESULTADO_LABELS[ins.resultado]} color="primary" variant="outlined" />
                        ) : (
                          <Typography variant="body2" color="text.disabled">---</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={ins ? 'Ver expediente' : 'Iniciar Apertura de Inspección'}>
                          <IconButton
                            color="primary"
                            onClick={() => navigate(`/inventario/inspeccion/${i.id}`)}
                          >
                            {ins ? <VisibilityIcon /> : <AssignmentIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar ingreso">
                          <IconButton color="error" onClick={() => handleDelete(i.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>No hay ingresos registrados en el sistema</Typography>
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
