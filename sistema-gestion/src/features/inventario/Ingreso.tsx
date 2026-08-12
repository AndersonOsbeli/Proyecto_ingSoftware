import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, Snackbar, Alert, IconButton, Chip, FormHelperText,
  Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Divider,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonIcon from '@mui/icons-material/Person';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DescriptionIcon from '@mui/icons-material/Description';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useAuth } from '../../lib/auth';
import { today } from '../../lib/store';
import { getModelos, registrarIngreso } from './service';
import { IngresoEquipo, EstadoDocumentalIngreso } from './types';

interface FormErrors {
  fecha?: string;
  proveedor?: string;
  tipoEquipo?: string;
  modelo?: string;
  cantidad?: string;
}

export default function Ingreso() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const modelos = getModelos();

  const [form, setForm] = useState({
    fecha: today(),
    origen: 'proveedor' as IngresoEquipo['origen'],
    proveedor: '',
    tipoEquipo: 'laptop',
    cantidad: 1,
    documentoReferencia: '',
    modelo: '',
    numeroParte: '',
    numeroSerie: '',
    estadoFisico: 'Nuevo' as IngresoEquipo['estadoFisico'],
    observaciones: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [ingresoCreado, setIngresoCreado] = useState<IngresoEquipo | null>(null);
  const [openModalExito, setOpenModalExito] = useState(false);

  const set = (field: keyof typeof form, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    // Clear error for field when modified
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validarFormulario = (): boolean => {
    const errs: FormErrors = {};
    if (!form.fecha) errs.fecha = 'La fecha de ingreso es obligatoria';
    if (!form.proveedor || form.proveedor.trim() === '') errs.proveedor = 'El proveedor o remitente es obligatorio';
    if (!form.tipoEquipo) errs.tipoEquipo = 'El tipo de equipo es obligatorio';
    if (!form.modelo) errs.modelo = 'Seleccione o ingrese un modelo de equipo';
    if (!form.cantidad || Number(form.cantidad) <= 0) errs.cantidad = 'La cantidad debe ser mayor a 0';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Flujo alterno: Validar campos obligatorios
    if (!validarFormulario()) {
      setSnack({
        open: true,
        message: 'Por favor complete todos los campos obligatorios marcados en rojo.',
        severity: 'error'
      });
      return;
    }

    // Determinar estado documental según flujo principal / alterno
    const tieneDocumento = form.documentoReferencia.trim().length > 0;
    const estadoDocumental: EstadoDocumentalIngreso = tieneDocumento ? 'con_documento' : 'pendiente_validacion';

    const data: Omit<IngresoEquipo, 'id' | 'folio'> = {
      ...form,
      cantidad: Number(form.cantidad),
      estadoDocumental,
      registradoPor: currentUser?.name ? `${currentUser.name} (Recepcion)` : 'Recepcionista'
    };

    // Crear registro y asignar identificador único (folio)
    const nuevoRegistro = registrarIngreso(data);
    setIngresoCreado(nuevoRegistro);
    setOpenModalExito(true);
  };

  const sinDocumento = form.documentoReferencia.trim().length === 0;

  return (
    <Box sx={{ pb: 4 }}>
      {/* Encabezado del caso de uso */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/inventario')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              Caso de Uso 1: Registrar Ingreso de Equipo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registro de llegada de equipos al área de recepción para control de inventario e inspección.
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<PersonIcon />}
          label={`Actor: ${currentUser?.name || 'Recepcionista'}`}
          color="info"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Banner de precondiciones */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" color="primary.dark" fontWeight={600}>
            Precondiciones verificadas:
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 3 }}>
          • Sesión iniciada correctamente como <strong>{currentUser?.name}</strong>.
          &nbsp;&nbsp;• Recepción física en almacén de recepción.
          &nbsp;&nbsp;• Permisos activos para registro de ingresos.
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>

          {/* Bloque 1: Datos Básicos del Ingreso */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'primary.main' }}>
              <DescriptionIcon />
              <Typography variant="h6" fontWeight={600}>
                1. Datos Básicos del Ingreso
              </Typography>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Fecha de Ingreso *"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                  error={Boolean(errors.fecha)}
                  helperText={errors.fecha}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="origen-label">Origen / Procedencia *</InputLabel>
                  <Select
                    labelId="origen-label"
                    label="Origen / Procedencia *"
                    value={form.origen}
                    onChange={(e) => set('origen', e.target.value)}
                  >
                    <MenuItem value="proveedor">Proveedor externo</MenuItem>
                    <MenuItem value="interno">Transferencia interna / Sucursal</MenuItem>
                    <MenuItem value="donacion">Donación / Convenio</MenuItem>
                    <MenuItem value="cliente">Cliente / Devolución</MenuItem>
                    <MenuItem value="otro">Otro origen</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Proveedor o Remitente *"
                  placeholder="Ej. Dell Logistics / Impresoras S.A."
                  fullWidth
                  value={form.proveedor}
                  onChange={(e) => set('proveedor', e.target.value)}
                  error={Boolean(errors.proveedor)}
                  helperText={errors.proveedor || 'Entidad o persona que envía el equipo'}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Cantidad *"
                  type="number"
                  fullWidth
                  inputProps={{ min: 1 }}
                  value={form.cantidad}
                  onChange={(e) => set('cantidad', e.target.value)}
                  error={Boolean(errors.cantidad)}
                  helperText={errors.cantidad}
                />
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  label="Documento de Referencia (Opcional)"
                  placeholder="Folio de orden de compra, factura, guía de remisión o contrato"
                  fullWidth
                  value={form.documentoReferencia}
                  onChange={(e) => set('documentoReferencia', e.target.value)}
                  helperText={
                    sinDocumento
                      ? 'Si no se proporciona un documento, el equipo quedará en estado "Pendiente de validación documental"'
                      : 'Documento registrado para respaldo documental'
                  }
                />
              </Grid>

              <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
                {sinDocumento ? (
                  <Alert severity="warning" icon={<WarningAmberIcon fontSize="inherit" />} sx={{ width: '100%', py: 0.5 }}>
                    <strong>Sin documento de referencia:</strong> El ingreso se marcará como <em>"Pendiente de validación documental"</em>.
                  </Alert>
                ) : (
                  <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="inherit" />} sx={{ width: '100%', py: 0.5 }}>
                    <strong>Documentado:</strong> Referencia lista para cotejo.
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Bloque 2: Identificadores Visibles del Equipo */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'primary.main' }}>
              <QrCodeIcon />
              <Typography variant="h6" fontWeight={600}>
                2. Identificadores Visibles del Equipo
              </Typography>
            </Box>
            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth error={Boolean(errors.tipoEquipo)}>
                  <InputLabel id="tipo-label">Tipo de Equipo *</InputLabel>
                  <Select
                    labelId="tipo-label"
                    label="Tipo de Equipo *"
                    value={form.tipoEquipo}
                    onChange={(e) => set('tipoEquipo', e.target.value)}
                  >
                    <MenuItem value="laptop">Laptop / Portátil</MenuItem>
                    <MenuItem value="desktop">Desktop / Torre Computadora</MenuItem>
                    <MenuItem value="monitor">Monitor / Pantalla</MenuItem>
                    <MenuItem value="impresora">Impresora / Multifuncional</MenuItem>
                    <MenuItem value="servidor">Servidor</MenuItem>
                    <MenuItem value="periferico">Periférico / Accesorio</MenuItem>
                    <MenuItem value="otro">Otro equipo</MenuItem>
                  </Select>
                  {errors.tipoEquipo && <FormHelperText>{errors.tipoEquipo}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth error={Boolean(errors.modelo)}>
                  <InputLabel id="modelo-label">Modelo del Equipo *</InputLabel>
                  <Select
                    labelId="modelo-label"
                    label="Modelo del Equipo *"
                    value={form.modelo}
                    onChange={(e) => set('modelo', e.target.value)}
                  >
                    {modelos.map((m) => (
                      <MenuItem key={m.modeloId} value={m.modeloId}>
                        {m.marca} - {m.nombre} ({m.tipo})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.modelo && <FormHelperText>{errors.modelo}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="estado-fisico-label">Estado Físico al Recibir *</InputLabel>
                  <Select
                    labelId="estado-fisico-label"
                    label="Estado Físico al Recibir *"
                    value={form.estadoFisico}
                    onChange={(e) => set('estadoFisico', e.target.value)}
                  >
                    <MenuItem value="Nuevo">Nuevo (En empaque sellado)</MenuItem>
                    <MenuItem value="Usado - Bueno">Usado - Buen estado</MenuItem>
                    <MenuItem value="Usado - Danado">Usado - Con detalles / Dañado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Número de Serie (Serial)"
                  placeholder="Ej. SN-883920194 (si está visible)"
                  fullWidth
                  value={form.numeroSerie}
                  onChange={(e) => set('numeroSerie', e.target.value)}
                  helperText="Identificador físico de serie grabado en el chasis"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={6}>
                <TextField
                  label="Número de Parte (Part Number)"
                  placeholder="Ej. PN-990-21A (si está disponible)"
                  fullWidth
                  value={form.numeroParte}
                  onChange={(e) => set('numeroParte', e.target.value)}
                  helperText="Número de catálogo o parte del fabricante"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Observaciones de Recepción"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Registrar notas adicionales sobre el estado exterior del paquete, sellos de seguridad o accesorios observados."
                  value={form.observaciones}
                  onChange={(e) => set('observaciones', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Botones de Acción */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate('/inventario')}
              sx={{ px: 3 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<InventoryIcon />}
              sx={{ px: 4, fontWeight: 700 }}
            >
              Registrar Ingreso y Asignar ID
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Modal / Confirmación de Postcondición y Asignación de ID Único */}
      <Dialog
        open={openModalExito}
        onClose={() => setOpenModalExito(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              ¡Ingreso Registrado Con Éxito!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Caso de Uso 1 completado satisfactoriamente
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {ingresoCreado && (
            <Box>
              <Card sx={{ bgcolor: '#f8fafc', border: '1px dashed #cbd5e1', mb: 2 }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Identificador Único Asignado (Folio):
                  </Typography>
                  <Typography variant="h4" color="primary.main" fontWeight={800} letterSpacing={1}>
                    {ingresoCreado.folio}
                  </Typography>
                </CardContent>
              </Card>

              <Grid container spacing={1.5} sx={{ fontSize: '0.9rem' }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Proveedor / Remitente:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ingresoCreado.proveedor}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Fecha de Llegada:</Typography>
                  <Typography variant="body2" fontWeight={600}>{new Date(ingresoCreado.fecha).toLocaleDateString('es-ES')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Tipo & Modelo:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ingresoCreado.tipoEquipo.toUpperCase()} ({ingresoCreado.modelo})</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Número de Serie:</Typography>
                  <Typography variant="body2" fontWeight={600}>{ingresoCreado.numeroSerie || 'No especificado (S/N)'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">Estado de Validación Documental:</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {ingresoCreado.estadoDocumental === 'pendiente_validacion' ? (
                      <Chip
                        icon={<WarningAmberIcon />}
                        label="Pendiente de Validación Documental"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        icon={<CheckCircleOutlineIcon />}
                        label="Documento de Referencia Registrado"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2.5 }}>
                <strong>Postcondición:</strong> El equipo ha quedado guardado y <strong>disponible para la apertura de su expediente de inspección</strong>.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setOpenModalExito(false);
              setForm({
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
              setErrors({});
            }}
          >
            Registrar Otro Ingreso
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/inventario/inspeccion/${ingresoCreado?.id}`)}
          >
            Abrir Inspección Técnica
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={() => navigate('/inventario')}
          >
            Ver Lista de Inventario
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alerta de notificación flotante */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((prev) => ({ ...prev, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
