import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, Snackbar, Alert, Card, CardContent, Grid,
  Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  
  // Estado para búsqueda y cámara
  const [busqueda, setBusqueda] = useState('');
  const [openScanner, setOpenScanner] = useState(false);

  // Estados para Filtros Específicos
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroMarca, setFiltroMarca] = useState<string>('todas');
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('todas');

  // Estado para modal Ficha Técnica
  const [productoSeleccionado, setProductoSeleccionado] = useState<IngresoEquipo | null>(null);
  const [openFicha, setOpenFicha] = useState(false);

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

  // Tipos oficiales del formulario de registro
  const TIPOS_OFICIALES = ['Monitor', 'Laptop', 'Computadora de Escritorio', 'Impresora', 'Servidor', 'Otro tipo'];

  const marcasDisponibles = Array.from(
    new Set(ingresos.map(i => i.marca).filter(Boolean))
  );
  const ubicacionesDisponibles = Array.from(
    new Set(ingresos.map(i => i.ubicacion).filter(Boolean))
  );

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroTipo('todos');
    setFiltroMarca('todas');
    setFiltroUbicacion('todas');
  };

  // Efectificación de escáner de cámara
  useEffect(() => {
    let html5QrcodeScanner: any = null;

    if (openScanner) {
      const timer = setTimeout(() => {
        html5QrcodeScanner = new Html5QrcodeScanner(
          'reader',
          { 
            fps: 10, 
            qrbox: { width: 250, height: 140 },
            rememberLastUsedCamera: true
          },
          false
        );

        html5QrcodeScanner.render(
          (decodedText: string) => {
            setBusqueda(decodedText);
            setSnack(`✓ Código "${decodedText}" enfocado y encontrado`);
            html5QrcodeScanner.clear().catch(() => {});
            setOpenScanner(false);
          },
          () => {}
        );
      }, 200);

      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner) {
          html5QrcodeScanner.clear().catch(() => {});
        }
      };
    }
  }, [openScanner]);

  const handleToggleActivo = (id: string, activoActual: boolean) => {
    try {
      toggleActivoIngreso(id);
      setIngresos(getIngresos());
      setSnack(`Producto ${activoActual ? 'desactivado' : 'activado'} correctamente`);
    } catch {
      setSnack('Error al cambiar el estado. Intenta de nuevo.');
    }
  };

  // Función para descargar el código de barras como imagen PNG en Alta Resolución (HD)
  const downloadBarcodeImage = (idContainer: string, codigo: string) => {
    const container = document.getElementById(`barcode-container-${idContainer}`);
    const svgEl = container ? container.querySelector('svg') : null;
    
    if (!svgEl) {
      setSnack('No se encontró el elemento del código de barras para descargar');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Escalado de alta resolución (Factor 5x HD para etiquetas nítidas)
      const scale = 5;
      const margin = 20 * scale;

      canvas.width = img.width * scale + margin * 2;
      canvas.height = img.height * scale + margin * 2;

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fondo blanco nítido
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dibujar el código amplificado a 5x HD
        ctx.drawImage(img, margin, margin, img.width * scale, img.height * scale);
      }

      const pngUrl = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `codigo-barras-${codigo}-HD.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setSnack(`Código de barras "${codigo}" descargado en Alta Resolución (HD)`);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Filtrado dinámico multicriterio (Búsqueda general + Tipo + Marca + Ubicación)
  const ingresosFiltrados = ingresos.filter(i => {
    // 1. Filtro Texto General
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const coincideTexto = (
        (i.codigoBarras && i.codigoBarras.toLowerCase().includes(q)) ||
        (i.folio && i.folio.toLowerCase().includes(q)) ||
        (i.tipoProducto && i.tipoProducto.toLowerCase().includes(q)) ||
        (i.tipoEquipo && i.tipoEquipo.toLowerCase().includes(q)) ||
        (i.marca && i.marca.toLowerCase().includes(q)) ||
        (i.modelo && i.modelo.toLowerCase().includes(q)) ||
        (i.proveedor && i.proveedor.toLowerCase().includes(q)) ||
        (i.ubicacion && i.ubicacion.toLowerCase().includes(q))
      );
      if (!coincideTexto) return false;
    }

    // 2. Filtro Tipo de Producto
    if (filtroTipo !== 'todos') {
      const tipoVal = (i.tipoProducto || i.tipoEquipo || '').trim();
      if (filtroTipo === 'otro' || filtroTipo.toLowerCase() === 'otro tipo') {
        const esPrincipal = ['Monitor', 'Laptop', 'Computadora de Escritorio', 'Impresora', 'Servidor'].some(t => t.toLowerCase() === tipoVal.toLowerCase());
        if (esPrincipal) return false;
      } else {
        if (tipoVal.toLowerCase() !== filtroTipo.toLowerCase()) return false;
      }
    }

    // 3. Filtro Marca
    if (filtroMarca !== 'todas') {
      if ((i.marca || '').toLowerCase() !== filtroMarca.toLowerCase()) return false;
    }

    // 4. Filtro Ubicación
    if (filtroUbicacion !== 'todas') {
      if ((i.ubicacion || '').toLowerCase() !== filtroUbicacion.toLowerCase()) return false;
    }

    return true;
  });

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Gestión de Inventario (Nuevo Módulo)</Typography>
          <Typography variant="body2" color="text.secondary">
            Registro de productos, consulta y escáner de código de barras
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

      {/* Panel Avanzado de Búsqueda y Filtros Multicriterio */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
        {/* Fila 1: Campo de Texto General y Cámara */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              placeholder="Buscar por código de barras, marca, modelo, proveedor o ubicación..."
              size="small"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: busqueda ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setBusqueda('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>

          <Grid item xs={12} md={5} sx={{ display: 'flex', gap: 1, justifyContent: { md: 'flex-end' }, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setOpenScanner(true)}
              sx={{ fontWeight: 600, height: '40px', whiteSpace: 'nowrap' }}
            >
              Escanear con Cámara
            </Button>

            {(busqueda || filtroTipo !== 'todos' || filtroMarca !== 'todas' || filtroUbicacion !== 'todas') && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<FilterListOffIcon />}
                onClick={limpiarFiltros}
                size="small"
                sx={{ height: '40px' }}
              >
                Limpiar Filtros
              </Button>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.5 }} />

        {/* Fila 2: Selectores Específicos por Tipo, Marca y Ubicación */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="label-filtro-tipo">Tipo de Producto</InputLabel>
              <Select
                labelId="label-filtro-tipo"
                value={filtroTipo}
                label="Tipo de Producto"
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <MenuItem value="todos"><em>Todos los tipos</em></MenuItem>
                {TIPOS_OFICIALES.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="label-filtro-marca">Marca</InputLabel>
              <Select
                labelId="label-filtro-marca"
                value={filtroMarca}
                label="Marca"
                onChange={(e) => setFiltroMarca(e.target.value)}
              >
                <MenuItem value="todas"><em>Todas las marcas</em></MenuItem>
                {marcasDisponibles.map(m => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="label-filtro-ubicacion">Ubicación</InputLabel>
              <Select
                labelId="label-filtro-ubicacion"
                value={filtroUbicacion}
                label="Ubicación"
                onChange={(e) => setFiltroUbicacion(e.target.value)}
              >
                <MenuItem value="todas"><em>Todas las ubicaciones</em></MenuItem>
                {ubicacionesDisponibles.map(u => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3} sx={{ textAlign: { md: 'right' } }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Mostrando {ingresosFiltrados.length} de {ingresos.length} productos
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        {ingresosFiltrados.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Código de Barras</strong></TableCell>
                  <TableCell><strong>Fecha Ingreso</strong></TableCell>
                  <TableCell><strong>Tipo Producto</strong></TableCell>
                  <TableCell><strong>Ubicación</strong></TableCell>
                  <TableCell><strong>Marca</strong></TableCell>
                  <TableCell><strong>Modelo</strong></TableCell>
                  <TableCell><strong>Cantidad</strong></TableCell>
                  <TableCell><strong>Especificaciones</strong></TableCell>
                  <TableCell align="right"><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ingresosFiltrados.map((i) => {
                  const numSpecs = i.especificaciones?.filter(e => e.aplica !== false && e.valor !== 'No aplica').length || 0;
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box id={`barcode-container-list-${i.id}`} sx={{ maxWidth: '180px', overflow: 'hidden' }}>
                            <Barcode value={codigo || 'N/A'} height={30} width={1.2} fontSize={12} displayValue={true} background="transparent" />
                          </Box>
                          <Tooltip title="Descargar código de barras (Imagen PNG)">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => downloadBarcodeImage(`list-${i.id}`, codigo)}
                              sx={{ border: '1px solid rgba(30, 64, 175, 0.2)', p: 0.5 }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>{fecha ? new Date(fecha).toLocaleDateString('es-ES') : 'N/A'}</TableCell>
                      <TableCell>{tipo}</TableCell>
                      <TableCell>{i.ubicacion || 'Sin asignar'}</TableCell>
                      <TableCell>{i.marca || 'N/A'}</TableCell>
                      <TableCell>{i.modelo || 'N/A'}</TableCell>
                      <TableCell>{i.cantidad}</TableCell>
                      <TableCell>
                        <Tooltip title="Ver ficha técnica completa">
                          <Chip 
                            size="small" 
                            label={`${numSpecs} config.`} 
                            color="info" 
                            onClick={() => {
                              setProductoSeleccionado(i);
                              setOpenFicha(true);
                            }}
                            sx={{ 
                              cursor: 'pointer', 
                              fontWeight: 600, 
                              '&:hover': { opacity: 0.85, transform: 'scale(1.06)' }, 
                              transition: 'all 0.2s ease' 
                            }} 
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar producto">
                          <IconButton color="primary" onClick={() => navigate(`/inventario/ingreso/${i.id}`, { state: { item: i } })}>
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
            <Typography color="text.secondary" gutterBottom>
              {busqueda ? `No se encontraron productos coincidentes con "${busqueda}"` : 'No hay productos registrados'}
            </Typography>
            {busqueda ? (
              <Button variant="outlined" size="small" onClick={() => setBusqueda('')}>Limpiar Búsqueda</Button>
            ) : (
              <Button variant="contained" onClick={() => navigate('/inventario/ingreso')}>
                Registrar Primer Producto
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* Modal: Escáner de Código de Barras con Cámara */}
      <Dialog 
        open={openScanner} 
        onClose={() => setOpenScanner(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QrCodeScannerIcon color="secondary" />
            <Typography variant="h6" fontWeight={700}>Escáner por Cámara</Typography>
          </Box>
          <IconButton onClick={() => setOpenScanner(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            Enfoca el código de barras con tu cámara web para buscar el producto de forma automática.
          </Typography>
          <Box 
            id="reader" 
            sx={{ 
              width: '100%', 
              minHeight: '260px', 
              borderRadius: 2, 
              overflow: 'hidden',
              '& video': { borderRadius: 2, width: '100% !important' } 
            }} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScanner(false)} color="inherit">
            Cancelar Escaneo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Ficha Técnica del Producto */}
      <Dialog 
        open={openFicha} 
        onClose={() => setOpenFicha(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {productoSeleccionado && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AssignmentIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    Ficha Técnica del Producto
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID Registro: #{productoSeleccionado.id} | Código: {productoSeleccionado.codigoBarras || productoSeleccionado.folio || 'N/A'}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={() => setOpenFicha(false)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ py: 3 }}>
              {/* Header Summary Card */}
              <Card variant="outlined" sx={{ mb: 3, bgcolor: 'rgba(30, 64, 175, 0.03)', borderColor: 'rgba(30, 64, 175, 0.15)', borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase" letterSpacing={1}>
                      {productoSeleccionado.tipoProducto || productoSeleccionado.tipoEquipo}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {productoSeleccionado.marca || 'Marca N/A'} {productoSeleccionado.modelo || 'Modelo N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box id={`barcode-container-modal-${productoSeleccionado.id}`}>
                      <Barcode 
                        value={productoSeleccionado.codigoBarras || productoSeleccionado.folio || productoSeleccionado.id} 
                        height={35} 
                        width={1.3} 
                        fontSize={12} 
                      />
                    </Box>
                    <Tooltip title="Descargar código de barras (Imagen PNG)">
                      <IconButton 
                        color="primary" 
                        onClick={() => downloadBarcodeImage(`modal-${productoSeleccionado.id}`, productoSeleccionado.codigoBarras || productoSeleccionado.id)}
                        sx={{ border: '1px solid rgba(30, 64, 175, 0.3)', p: 1 }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>

              {/* Datos Generales */}
              <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                📋 Datos Generales
              </Typography>

              <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                  { label: 'Tipo de Producto', val: productoSeleccionado.tipoProducto || productoSeleccionado.tipoEquipo || 'N/A' },
                  { label: 'Marca', val: productoSeleccionado.marca || 'N/A' },
                  { label: 'Modelo', val: productoSeleccionado.modelo || 'N/A' },
                  { label: 'Proveedor', val: productoSeleccionado.proveedor || 'N/A' },
                  { label: 'Ubicación', val: productoSeleccionado.ubicacion || 'Sin asignar' },
                  { label: 'Cantidad en Stock', val: `${productoSeleccionado.cantidad} unidades` },
                  { label: 'Fecha de Ingreso', val: productoSeleccionado.fechaIngreso ? new Date(productoSeleccionado.fechaIngreso).toLocaleDateString('es-ES') : 'N/A' },
                  { label: 'Estado Documental', val: productoSeleccionado.estadoDocumental === 'con_documento' ? 'Con Documentación' : 'Pendiente' },
                ].map((field) => (
                  <Grid item xs={12} sm={6} md={3} key={field.label}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, height: '100%', bgcolor: '#fdfdfd' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        {field.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {field.val}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Especificaciones Técnicas */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color="primary">
                  ⚙️ Especificaciones Técnicas
                </Typography>
                <Chip 
                  size="small" 
                  color="info" 
                  label={`${Array.isArray(productoSeleccionado.especificaciones) ? productoSeleccionado.especificaciones.filter(e => e.aplica !== false && e.valor !== 'No aplica').length : 0} Configuradas`} 
                />
              </Box>

              {Array.isArray(productoSeleccionado.especificaciones) && productoSeleccionado.especificaciones.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                      <TableRow>
                        <TableCell><strong>Especificación</strong></TableCell>
                        <TableCell><strong>Valor / Detalle</strong></TableCell>
                        <TableCell align="center"><strong>Estado</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productoSeleccionado.especificaciones.map((spec: any, idx: number) => {
                        const nombre = spec.nombre || spec.clave || `Especificación ${idx + 1}`;
                        const valor = spec.valor || (spec.aplica ? 'No especificado' : 'No aplica');
                        const aplica = spec.aplica !== false && valor !== 'No aplica';

                        return (
                          <TableRow key={spec.id || idx} hover>
                            <TableCell sx={{ fontWeight: 600, width: '35%' }}>{nombre}</TableCell>
                            <TableCell sx={{ color: aplica ? 'text.primary' : 'text.disabled' }}>
                              {valor}
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                size="small" 
                                label={aplica ? 'Aplica' : 'No Aplica'} 
                                color={aplica ? 'success' : 'default'} 
                                variant={aplica ? 'filled' : 'outlined'} 
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ py: 2, textAlign: 'center' }}>
                  Este producto no cuenta con especificaciones adicionales registradas.
                </Typography>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
              <Button 
                startIcon={<PrintIcon />} 
                variant="outlined" 
                onClick={() => window.print()}
              >
                Imprimir Ficha
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  startIcon={<EditIcon />} 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setOpenFicha(false);
                    navigate(`/inventario/ingreso/${productoSeleccionado.id}`, { state: { item: productoSeleccionado } });
                  }}
                >
                  Editar Producto
                </Button>
                <Button variant="outlined" color="inherit" onClick={() => setOpenFicha(false)}>
                  Cerrar
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
