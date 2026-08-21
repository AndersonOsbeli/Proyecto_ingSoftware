import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Grid, TextField, Snackbar, Alert, IconButton,
  Divider, Autocomplete, Stepper, Step, StepLabel, Switch, FormControlLabel,
  Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeIcon from '@mui/icons-material/QrCode';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAuth } from '../../lib/auth';
import { today } from '../../lib/store';
import { registrarIngresoAPI, actualizarIngresoAPI, getIngresoPorId } from './service';
import { IngresoEquipo, Especificacion } from './types';

export default function Ingreso() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const itemState = (location.state as any)?.item as IngresoEquipo | undefined;
  const targetId = id || itemState?.id;
  const isEditing = Boolean(targetId);

  const { currentUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  const [openModalExito, setOpenModalExito] = useState(false);
  const [ingresoCreado, setIngresoCreado] = useState<IngresoEquipo | null>(null);

  // Default product types
  const [tiposProducto, setTiposProducto] = useState(['Monitor', 'Laptop', 'Computadora de Escritorio', 'Impresora', 'Servidor', 'Otro tipo']);

  const [ubicaciones, setUbicaciones] = useState([
    'Oficina 1', 'Oficina 2', 'Oficina 3', 'Recepción', 'Sala de Juntas', 
    'Almacén Principal', 'Área de TI', 'Recursos Humanos', 'Contabilidad', 
    'Dirección General', 'Laboratorio', 'Bodega Secundaria'
  ]);

  // Phase 1 form state
  const [form, setForm] = useState({
    tipoProducto: '',
    proveedor: '',
    marca: '',
    modelo: '',
    fechaIngreso: today(),
    cantidad: 1,
    codigoBarras: '',
    ubicacion: ''
  });

  // Phase 2 form state
  const [especificaciones, setEspecificaciones] = useState<Especificacion[]>([
    { id: crypto.randomUUID(), nombre: 'Número de Serie', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. 5CD1234567' },
    { id: crypto.randomUUID(), nombre: 'Procesador', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. Intel Core i7-12700H, Ryzen 5' },
    { id: crypto.randomUUID(), nombre: 'Memoria RAM', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. 16GB DDR4' },
    { id: crypto.randomUUID(), nombre: 'Almacenamiento (Disco/SSD)', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. 512GB SSD NVMe' },
    { id: crypto.randomUUID(), nombre: 'Tarjeta Gráfica / GPU', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. NVIDIA RTX 3060' },
    { id: crypto.randomUUID(), nombre: 'Tarjeta Madre', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. ASUS ROG B550-F' },
    { id: crypto.randomUUID(), nombre: 'Fuente de Poder', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. 650W 80+ Gold' },
    { id: crypto.randomUUID(), nombre: 'Pantalla', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. 15.6" FHD IPS' },
    { id: crypto.randomUUID(), nombre: 'Sistema Operativo', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. Windows 11 Pro' },
    { id: crypto.randomUUID(), nombre: 'Dirección MAC', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. 00:1A:2B:3C:4D:5E' },
    { id: crypto.randomUUID(), nombre: 'Color', valor: '', aplica: true, esPredeterminada: true, ejemplo: 'Ej. Plata, Negro' },
  ]);

  const steps = ['Datos Generales', 'Especificaciones'];

  // Cargar datos en el formulario si se está editando
  useEffect(() => {
    if (targetId) {
      const item = itemState || getIngresoPorId(targetId);
      if (item) {
        setForm({
          tipoProducto: item.tipoProducto || item.tipoEquipo || '',
          proveedor: item.proveedor || '',
          marca: item.marca || '',
          modelo: item.modelo || '',
          fechaIngreso: item.fechaIngreso ? item.fechaIngreso.slice(0, 10) : today(),
          cantidad: item.cantidad || 1,
          codigoBarras: item.codigoBarras || item.folio || '',
          ubicacion: item.ubicacion || ''
        });
        if (Array.isArray(item.especificaciones) && item.especificaciones.length > 0) {
          setEspecificaciones(item.especificaciones);
        }
      }
    }
  }, [targetId]);

  useEffect(() => {
    const tipo = form.tipoProducto.toLowerCase();
    
    // Default: Todo aplica
    let aplicaMap: Record<string, boolean> = {
      'Número de Serie': true,
      'Procesador': true,
      'Memoria RAM': true,
      'Almacenamiento (Disco/SSD)': true,
      'Tarjeta Gráfica / GPU': true,
      'Tarjeta Madre': true,
      'Fuente de Poder': true,
      'Pantalla': true,
      'Sistema Operativo': true,
      'Dirección MAC': true,
      'Color': true,
    };

    if (tipo.includes('monitor')) {
      aplicaMap = { ...aplicaMap, 'Procesador': false, 'Memoria RAM': false, 'Almacenamiento (Disco/SSD)': false, 'Tarjeta Gráfica / GPU': false, 'Tarjeta Madre': false, 'Fuente de Poder': false, 'Sistema Operativo': false, 'Dirección MAC': false };
    } else if (tipo.includes('impresora')) {
      aplicaMap = { ...aplicaMap, 'Procesador': false, 'Memoria RAM': false, 'Almacenamiento (Disco/SSD)': false, 'Tarjeta Gráfica / GPU': false, 'Tarjeta Madre': false, 'Fuente de Poder': false, 'Pantalla': false, 'Sistema Operativo': false };
    } else if (tipo.includes('laptop')) {
      aplicaMap = { ...aplicaMap, 'Tarjeta Madre': false, 'Fuente de Poder': false };
    } else if (tipo.includes('escritorio') || tipo.includes('desktop')) {
      aplicaMap = { ...aplicaMap, 'Pantalla': false };
    } else if (tipo.includes('servidor')) {
      aplicaMap = { ...aplicaMap, 'Pantalla': false, 'Tarjeta Gráfica / GPU': false };
    }

    setEspecificaciones(prev => prev.map(spec => {
      if (spec.esPredeterminada) {
        const applies = aplicaMap[spec.nombre] ?? true;
        if (!applies) {
           return { ...spec, aplica: false, valor: 'No aplica' };
        } else {
           return { ...spec, aplica: true, valor: spec.valor === 'No aplica' ? '' : spec.valor };
        }
      }
      return spec;
    }));
  }, [form.tipoProducto]);

  const setField = (field: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleGenerateBarcode = () => {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setField('codigoBarras', `PRD-${timestamp}-${random}`);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!form.tipoProducto || !form.proveedor || !form.marca || !form.modelo || !form.fechaIngreso || !form.cantidad || !form.codigoBarras || !form.ubicacion) {
        setSnack({ open: true, message: 'Todos los campos de la primera fase son obligatorios', severity: 'error' });
        return;
      }
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAddEspecificacion = () => {
    setEspecificaciones([...especificaciones, { id: crypto.randomUUID(), nombre: '', valor: '', aplica: true }]);
  };

  const handleRemoveEspecificacion = (id: string) => {
    setEspecificaciones(especificaciones.filter(e => e.id !== id));
  };

  const handleChangeEspecificacion = (id: string, field: keyof Especificacion, value: any) => {
    setEspecificaciones(especificaciones.map(e => {
      if (e.id === id) {
        if (field === 'aplica') {
          return { ...e, aplica: value, valor: value ? (e.valor === 'No aplica' ? '' : e.valor) : 'No aplica' };
        }
        return { ...e, [field]: value };
      }
      return e;
    }));
  };

  const handleSubmit = async () => {
    const data: Omit<IngresoEquipo, 'id'> = {
      ...form,
      especificaciones,
      registradoPor: currentUser?.name || 'Usuario',
      folio: form.codigoBarras,
      tipoEquipo: form.tipoProducto,
    };

    try {
      if (isEditing && targetId) {
        const itemActualizado = await actualizarIngresoAPI(targetId, { ...data, id: targetId } as IngresoEquipo);
        setIngresoCreado(itemActualizado || { ...data, id: targetId } as IngresoEquipo);
      } else {
        const nuevoRegistro = await registrarIngresoAPI(data as IngresoEquipo);
        setIngresoCreado(nuevoRegistro);
      }
      setOpenModalExito(true);
    } catch (err) {
      setSnack({ open: true, message: `Error al ${isEditing ? 'actualizar' : 'registrar'} el producto. Verifica la API.`, severity: 'error' });
    }
  };

  const renderPhase1 = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Autocomplete
          freeSolo
          options={tiposProducto}
          value={form.tipoProducto}
          onChange={(_, newValue) => setField('tipoProducto', newValue || '')}
          onInputChange={(_, newInputValue) => setField('tipoProducto', newInputValue)}
          renderInput={(params) => (
            <TextField {...params} label="Tipo de Producto *" placeholder="Ej. Laptop, Servidor, Impresora..." />
          )}
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <TextField
          label="Marca *"
          placeholder="Ej. Dell, HP, Apple"
          fullWidth
          value={form.marca}
          onChange={(e) => setField('marca', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <TextField
          label="Modelo *"
          placeholder="Ej. XPS 13, ThinkPad T14"
          fullWidth
          value={form.modelo}
          onChange={(e) => setField('modelo', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          label="Fecha de Ingreso *"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={form.fechaIngreso}
          onChange={(e) => setField('fechaIngreso', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} md={2}>
        <TextField
          label="Cantidad *"
          placeholder="Ej. 1, 10"
          type="number"
          fullWidth
          inputProps={{ min: 1 }}
          value={form.cantidad}
          onChange={(e) => setField('cantidad', Number(e.target.value))}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            label="Código de Barras / Etiqueta *"
            placeholder="Ej. INV-2023-0001"
            fullWidth
            value={form.codigoBarras}
            onChange={(e) => setField('codigoBarras', e.target.value)}
          />
          <Button variant="outlined" onClick={handleGenerateBarcode} sx={{ height: '56px', whiteSpace: 'nowrap' }}>
            <QrCodeIcon sx={{ mr: 1 }} />
            Generar
          </Button>
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Autocomplete
          freeSolo
          options={ubicaciones}
          value={form.ubicacion}
          onChange={(_, newValue) => setField('ubicacion', newValue || '')}
          onInputChange={(_, newInputValue) => setField('ubicacion', newInputValue)}
          renderInput={(params) => (
            <TextField {...params} label="Ubicación del Equipo *" placeholder="Ej. Oficina 1, Recepción..." />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          label="Proveedor *"
          placeholder="Ej. Dell Technologies, HP Inc."
          fullWidth
          value={form.proveedor}
          onChange={(e) => setField('proveedor', e.target.value)}
        />
      </Grid>
    </Grid>
  );

  const renderPhase2 = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="primary">Lista de Especificaciones</Typography>
        <Button startIcon={<AddCircleOutlineIcon />} variant="outlined" onClick={handleAddEspecificacion}>
          Agregar Campo
        </Button>
      </Box>

      {especificaciones.map((spec) => (
        <Card key={spec.id} sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '16px !important' }}>
            <TextField
              label="Nombre de Especificación"
              placeholder="Ej. Tipo de Teclado"
              size="small"
              value={spec.nombre}
              onChange={(e) => handleChangeEspecificacion(spec.id, 'nombre', e.target.value)}
              disabled={!spec.aplica || spec.esPredeterminada}
              sx={{ flex: 1 }}
            />
            
            <TextField
              label="Valor de Especificación"
              placeholder={spec.aplica ? (spec.ejemplo || "Ej. Mecánico, Inalámbrico...") : ""}
              size="small"
              value={spec.valor}
              onChange={(e) => handleChangeEspecificacion(spec.id, 'valor', e.target.value)}
              disabled={!spec.aplica}
              sx={{ flex: 1 }}
            />

            <TextField
              select
              size="small"
              value={spec.aplica ? 'aplica' : 'no_aplica'}
              onChange={(e) => handleChangeEspecificacion(spec.id, 'aplica', e.target.value === 'aplica')}
              sx={{ minWidth: '130px' }}
            >
              <MenuItem value="aplica">Aplica</MenuItem>
              <MenuItem value="no_aplica">No Aplica</MenuItem>
            </TextField>
          </CardContent>
        </Card>
      ))}
      {especificaciones.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
          No hay especificaciones agregadas.
        </Typography>
      )}
    </Box>
  );

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/inventario')} color="primary" sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          {isEditing ? `Edición de Producto: ${form.tipoProducto || 'Item'}` : 'Registro de Nuevo Producto'}
        </Typography>
      </Box>

      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: '300px' }}>
          {activeStep === 0 ? renderPhase1() : renderPhase2()}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Atrás
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              {isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleNext}>
              Siguiente
            </Button>
          )}
        </Box>
      </Paper>

      {/* Modal de Éxito */}
      <Dialog open={openModalExito} onClose={() => navigate('/inventario')} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon color="success" /> {isEditing ? 'Producto Actualizado' : 'Producto Registrado'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ mb: 2 }}>
            El producto <strong>{ingresoCreado?.tipoProducto}</strong> ha sido {isEditing ? 'actualizado' : 'registrado'} correctamente con el código <strong>{ingresoCreado?.codigoBarras}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          {!isEditing && (
            <Button onClick={() => {
              setOpenModalExito(false);
              setActiveStep(0);
              setForm({ tipoProducto: '', proveedor: '', marca: '', modelo: '', fechaIngreso: today(), cantidad: 1, codigoBarras: '', ubicacion: '' });
            }}>
              Registrar Otro
            </Button>
          )}
          <Button variant="contained" onClick={() => navigate('/inventario')}>
            Ir al Inventario
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
