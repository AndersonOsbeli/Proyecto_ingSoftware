import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert, Card, CardContent, Grid,
  Tooltip, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getIngresos, getInspecciones,
  cargarIngresosDesdeAPI, cargarInspeccionesDesdeAPI, toggleActivoIngreso
} from './service';
import { IngresoEquipo, Inspeccion } from './types';
import Barcode from 'react-barcode';

export default function Inventario() {
  const navigate = useNavigate();
  const [snack, setSnack] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ingresos, setIngresos] = useState<IngresoEquipo[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);

  // Cargar datos desde la API al montar el componente
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      await Promise.all([cargarIngresosDesdeAPI(), cargarInspeccionesDesdeAPI()]);
      setIngresos(getIngresos());
      setInspecciones(getInspecciones());
      setCargando(false);
    };
    cargar();
  }, []);

  const handleToggleActivo = (id: string, activoActual: boolean) => {
    try {
      toggleActivoIngreso(id);
      setIngresos(getIngresos());
      setSnack(`Producto ${activoActual ? 'desactivado' : 'activado'} correctamente`);
    } catch {
      setSnack('Error al cambiar el estado. Intenta de nuevo.');
    }
  };

  if (cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }} color="text.secondary">Cargando inventario desde la base de datos...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Gestión de Inventario (Nuevo Módulo)</Typography>
          <Typography variant="body2" color="text.secondary">
            Registro de productos y especificaciones
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/inventario/ingreso')}
          sx={{ fontWeight: 600 }}
        >
          Registrar Producto
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Productos', value: ingresos.length, color: '#1E40AF' },
          { label: 'Tipos Únicos', value: new Set(ingresos.map(i => i.tipoProducto || i.tipoEquipo)).size, color: '#D97706' },
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
                  <TableCell><strong>Código de Barras</strong></TableCell>
                  <TableCell><strong>Fecha Ingreso</strong></TableCell>
                  <TableCell><strong>Tipo Producto</strong></TableCell>
                  <TableCell><strong>Ubicación</strong></TableCell>
                  <TableCell><strong>Proveedor</strong></TableCell>
                  <TableCell><strong>Cantidad</strong></TableCell>
                  <TableCell><strong>Especificaciones</strong></TableCell>
                  <TableCell align="right"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingresos.map((i) => {
                  const numSpecs = i.especificaciones?.filter(e => e.aplica).length || 0;
                  // Soporte para los datos viejos si aún existen (legacy)
                  const codigo = i.codigoBarras || i.folio || i.id;
                  const fecha = i.fechaIngreso || i.fechaRegistro || (i as any).fecha;
                  const tipo = i.tipoProducto || i.tipoEquipo || 'N/A';

                  return (
                    <TableRow 
                      key={i.id} 
                      hover 
                      sx={{ 
                        opacity: i.activo !== false ? 1 : 0.4,
                        bgcolor: i.activo !== false ? 'inherit' : 'rgba(0,0,0,0.04)',
                        transition: 'opacity 0.3s ease'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ maxWidth: '200px', overflow: 'hidden' }}>
                          <Barcode value={codigo || 'N/A'} height={30} width={1.2} fontSize={12} displayValue={true} background="transparent" />
                        </Box>
                      </TableCell>
                      <TableCell>{fecha ? new Date(fecha).toLocaleDateString('es-ES') : 'N/A'}</TableCell>
                      <TableCell>{tipo}</TableCell>
                      <TableCell>{i.ubicacion || 'Sin asignar'}</TableCell>
                      <TableCell>{i.proveedor}</TableCell>
                      <TableCell>{i.cantidad}</TableCell>
                      <TableCell>
                        <Chip size="small" label={`${numSpecs} config.`} color="info" />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar producto">
                          <IconButton color="primary" onClick={() => setSnack('Función de edición en construcción')}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={i.activo !== false ? 'Desactivar producto' : 'Activar producto'}>
                          <IconButton 
                            color={i.activo !== false ? "error" : "success"} 
                            onClick={() => handleToggleActivo(i.id, i.activo !== false)}
                          >
                            {i.activo !== false ? <BlockIcon /> : <CheckCircleIcon />}
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
            <Typography color="text.secondary" gutterBottom>No hay productos registrados</Typography>
            <Button variant="contained" onClick={() => navigate('/inventario/ingreso')}>
              Registrar Primer Producto
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
