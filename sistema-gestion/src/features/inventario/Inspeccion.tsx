import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, Grid, TextField, Select, MenuItem,
  InputLabel, FormControl, IconButton, Checkbox, FormControlLabel,
  Radio, RadioGroup, Chip, Divider, Snackbar, Alert, Tab, Tabs, List,
  ListItem, ListItemIcon, ListItemText, ListItemButton, TableContainer
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../lib/auth';
import {
  getIngresoPorId, getInspeccionPorIngreso, crearInspeccion, getModeloPorId,
  getInspeccionPorId, updateDocumentacion, updateInspeccionFisica,
  updateVerificacionTecnica, agregarHallazgo, eliminarHallazgo,
  agregarEvidencia, eliminarEvidencia, emitirResultado, gestionarDisposicion
} from './service';
import { MAPA_CHECKLIST_POR_TIPO, Inspeccion, IngresoEquipo, Hallazgo } from './types';

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const ESTADO_COLOR: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  pendiente_revision: 'warning',
  cuarentena_tecnica: 'info',
  en_proceso: 'info',
  completada: 'success'
};

export default function InspeccionPage() {
  const { ingresoId } = useParams<{ ingresoId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState('');
  const [filePreview, setFilePreview] = useState<{ nombre: string; tipo: string; tamano: number; contenido: string } | null>(null);
  const [nuevaEvidencia, setNuevaEvidencia] = useState({ etapa: 'general', hallazgoId: '' });
  const [nuevoHallazgo, setNuevoHallazgo] = useState<Omit<Hallazgo, 'id' | 'origen' | 'registradoPor'>>({
    tipo: 'fisico', severidad: 'media', pasoAsociado: 'inspeccion_fisica', descripcion: ''
  });

  const ingreso: IngresoEquipo | undefined = ingresoId ? getIngresoPorId(ingresoId) : undefined;

  let inspeccion: Inspeccion | undefined = ingresoId ? getInspeccionPorIngreso(ingresoId) : undefined;
  if (!inspeccion && ingreso) {
    inspeccion = crearInspeccion(ingreso.id, currentUser?.name || 'Sin usuario');
  }

  const [resultado, setResultado] = useState<string>(inspeccion?.resultado || '');
  const [comentarioFinal, setComentarioFinal] = useState<string>(inspeccion?.comentarioFinal || '');
  const [disposicion, setDisposicion] = useState<string>(inspeccion?.disposicion || '');
  const [justificacionDisposicion, setJustificacionDisposicion] = useState<string>(inspeccion?.justificacionDisposicion || '');

  if (!ingreso || !inspeccion) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventario')}>Volver</Button>
        <Typography sx={{ mt: 2 }}>Cargando expediente...</Typography>
      </Box>
    );
  }

  const modelo = getModeloPorId(ingreso.modelo);
  const specKeys = modelo ? Object.keys(modelo.specsRequeridas) : [];
  const checklistFisico = MAPA_CHECKLIST_POR_TIPO[ingreso.tipoEquipo] || MAPA_CHECKLIST_POR_TIPO.otro;
  const checksFisicos = inspeccion.checklistFisico.length === checklistFisico.length
    ? inspeccion.checklistFisico
    : checklistFisico.map(() => false);

  const refresh = (): Inspeccion => getInspeccionPorId(ingresoId!) ?? inspeccion!;

  const getModeloName = () => (modelo ? `${modelo.marca} ${modelo.nombre}` : ingreso.modelo);

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      pendiente_revision: 'Pendiente de revision',
      cuarentena_tecnica: 'Cuarentena tecnica',
      en_proceso: 'En proceso',
      completada: 'Completada'
    };
    return labels[estado] || estado;
  };

  const handleDoc = (field: keyof Inspeccion['documentacion']) => {
    const next = { ...inspeccion!.documentacion, [field]: !inspeccion!.documentacion[field] as boolean };
    updateDocumentacion(inspeccion!.id, next);
    setSnack('Documentacion guardada');
  };

  const handleDocSelect = (field: keyof Inspeccion['documentacion'], value: string) => {
    const next = { ...inspeccion!.documentacion, [field]: value };
    updateDocumentacion(inspeccion!.id, next);
    setSnack('Documentacion guardada');
  };

  const handleChecklist = (i: number) => {
    const next = [...checksFisicos];
    next[i] = !next[i];
    updateInspeccionFisica(inspeccion!.id, inspeccion!.inspeccionFisica, next);
    setSnack('Checklist guardado');
  };

  const handleFisica = (field: keyof Inspeccion['inspeccionFisica'], value: string) => {
    const next = { ...inspeccion!.inspeccionFisica, [field]: value };
    updateInspeccionFisica(inspeccion!.id, next);
    setSnack('Inspeccion fisica guardada');
  };

  const setTechValue = (key: string, value: string) => {
    const current = inspeccion!.verificacionTecnica[key] || { valor: '', estado: 'pendiente' as const };
    current.valor = value;
    if (value) current.estado = 'verificado';
    const next = { ...inspeccion!.verificacionTecnica, [key]: current };
    updateVerificacionTecnica(inspeccion!.id, next);
  };

  const setTechStatus = (key: string, estado: 'verificado' | 'pendiente' | 'no_aplica') => {
    const current = inspeccion!.verificacionTecnica[key] || { valor: '', estado: 'pendiente' as const };
    current.estado = estado;
    const next = { ...inspeccion!.verificacionTecnica, [key]: current };
    updateVerificacionTecnica(inspeccion!.id, next);
  };

  const getComparison = (spec: string) => {
    const expected = modelo?.specsRequeridas[spec] || '';
    const real = inspeccion!.verificacionTecnica[spec]?.valor || '';
    const status = inspeccion!.verificacionTecnica[spec]?.estado || 'pendiente';
    if (status === 'pendiente' || !real) return { label: 'Pendiente', color: 'warning' as const };
    return real.toLowerCase().includes(expected.toLowerCase())
      ? { label: 'Coincide', color: 'success' as const }
      : { label: 'Diferente', color: 'error' as const };
  };

  const onAddHallazgo = () => {
    if (!nuevoHallazgo.descripcion) return;
    agregarHallazgo(inspeccion!.id, {
      ...nuevoHallazgo,
      origen: currentUser?.name || 'Sin usuario',
      registradoPor: currentUser?.name || 'Sin usuario'
    });
    setNuevoHallazgo({ tipo: 'fisico', severidad: 'media', pasoAsociado: 'inspeccion_fisica', descripcion: '' });
    setSnack('Hallazgo registrado');
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSnack('El archivo excede 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview({ nombre: file.name, tipo: file.type, tamano: file.size, contenido: reader.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onSubirEvidencia = () => {
    if (!filePreview) return;
    agregarEvidencia(inspeccion!.id, {
      nombre: filePreview.nombre,
      tipo: filePreview.tipo,
      contenido: filePreview.contenido,
      tamano: filePreview.tamano,
      hallazgoId: nuevaEvidencia.hallazgoId || undefined,
      etapa: nuevaEvidencia.etapa,
      registradoPor: currentUser?.name || 'Sin usuario'
    });
    setFilePreview(null);
    setNuevaEvidencia({ etapa: 'general', hallazgoId: '' });
    setSnack('Evidencia adjuntada');
  };

  const onEmitirResultado = () => {
    emitirResultado(inspeccion!.id, resultado as Inspeccion['resultado'], comentarioFinal);
    setSnack('Resultado emitido');
  };

  const onGestionarDisposicion = () => {
    gestionarDisposicion(inspeccion!.id, disposicion as Inspeccion['disposicion'], justificacionDisposicion);
    setSnack('Disposicion aplicada y expediente cerrado');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <IconButton onClick={() => navigate('/inventario')}><ArrowBackIcon /></IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">Expediente {inspeccion.folio}</Typography>
          <Typography variant="body2" color="text.secondary">
            Ingreso: {ingreso.folio} | Equipo: {getModeloName()} | Serial: {ingreso.numeroSerie}
          </Typography>
        </Box>
        <Chip label={getEstadoLabel(inspeccion.estado)} color={ESTADO_COLOR[inspeccion.estado]} />
      </Box>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Ingreso" />
          <Tab label="Documentacion" />
          <Tab label="Fisica" />
          <Tab label="Tecnica" />
          <Tab label="Comparacion" />
          <Tab label={`Hallazgos (${inspeccion.hallazgos.length})`} />
          <Tab label={`Evidencia (${inspeccion.evidencias.length})`} />
          <Tab label="Resultado" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {[
              ['Folio', ingreso.folio], ['Fecha', ingreso.fecha], ['Origen', ingreso.origen],
              ['Proveedor', ingreso.proveedor], ['Tipo', ingreso.tipoEquipo], ['Cantidad', String(ingreso.cantidad)],
              ['Modelo', getModeloName()], ['Serial', ingreso.numeroSerie],
              ['Part Number', ingreso.numeroParte || 'N/A'],
              ['Doc. Referencia', ingreso.documentoReferencia || 'Sin documento'],
              ['Estado Fisico', ingreso.estadoFisico],
              ['Observaciones', ingreso.observaciones || 'Ninguna']
            ].map(([label, value]) => (
              <Grid item xs={12} md={4} key={label}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body1">{value}</Typography>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Typography variant="h6" gutterBottom>Validacion Documental</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
            {([
              ['fichaTecnica', 'Ficha Tecnica'], ['manuales', 'Manuales'], ['certificados', 'Certificados'],
              ['etiquetas', 'Etiquetas documentadas'], ['documentoReferencia', 'Documento de referencia']
            ] as const).map(([field, label]) => (
              <FormControlLabel key={field}
                control={<Checkbox checked={!!inspeccion.documentacion[field]} onChange={() => handleDoc(field)} />}
                label={label} />
            ))}
          </Box>
          <Divider sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Resultado documental</InputLabel>
            <Select label="Resultado documental" value={inspeccion.documentacion.resultado}
              onChange={(e) => handleDocSelect('resultado', e.target.value)}>
              <MenuItem value="completa">Completa</MenuItem>
              <MenuItem value="incompleta">Incompleta</MenuItem>
              <MenuItem value="con_discrepancias">Con discrepancias</MenuItem>
              <MenuItem value="no_proporcionada">Documentacion no proporcionada</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Observaciones documentales" fullWidth multiline rows={3}
            value={inspeccion.documentacion.observaciones}
            onChange={(e) => handleDocSelect('observaciones', e.target.value)} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Typography variant="h6" gutterBottom>Inspeccion Fisica</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Checklist segun tipo: {ingreso.tipoEquipo}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
            {checklistFisico.map((item, i) => (
              <FormControlLabel key={i}
                control={<Checkbox checked={!!checksFisicos[i]} onChange={() => handleChecklist(i)} />}
                label={item} />
            ))}
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Condicion General</InputLabel>
                <Select label="Condicion General" value={inspeccion.inspeccionFisica.condicionGeneral}
                  onChange={(e) => handleFisica('condicionGeneral', e.target.value)}>
                  <MenuItem value="sin_dano">Sin dano</MenuItem>
                  <MenuItem value="con_observaciones">Con observaciones</MenuItem>
                  <MenuItem value="con_dano">Con dano</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Seriales visibles" fullWidth
                value={inspeccion.inspeccionFisica.serialesVisibles}
                onChange={(e) => handleFisica('serialesVisibles', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Observaciones fisicas" fullWidth multiline rows={3}
                value={inspeccion.inspeccionFisica.observaciones}
                onChange={(e) => handleFisica('observaciones', e.target.value)} />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Typography variant="h6" gutterBottom>Verificacion Tecnica</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Especificaciones de: {getModeloName()}
          </Typography>
          {specKeys.map((spec) => (
            <Grid container spacing={1} alignItems="center" key={spec} sx={{ mb: 1 }}>
              <Grid item xs={12} md={5}>
                <Typography variant="body2">
                  <strong>{spec}:</strong>{' '}
                  <span style={{ color: 'text.secondary' }}>{modelo?.specsRequeridas[spec]}</span>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Valor real verificado" size="small" fullWidth
                  value={inspeccion.verificacionTecnica[spec]?.valor || ''}
                  onChange={(e) => setTechValue(spec, e.target.value)} />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <Select value={inspeccion.verificacionTecnica[spec]?.estado || 'pendiente'}
                    onChange={(e) => setTechStatus(spec, e.target.value as 'verificado' | 'pendiente' | 'no_aplica')}>
                    <MenuItem value="verificado">Verificado</MenuItem>
                    <MenuItem value="pendiente">Pendiente</MenuItem>
                    <MenuItem value="no_aplica">No aplica</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          ))}
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Typography variant="h6" gutterBottom>Comparacion de Especificaciones</Typography>
          {specKeys.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <TableHeadRow />
              {specKeys.map((spec) => {
                const cmp = getComparison(spec);
                return (
                  <Grid container key={spec} sx={{ py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Grid item xs={3}><Typography variant="body2"><strong>{spec}</strong></Typography></Grid>
                    <Grid item xs={3}><Typography variant="body2">{modelo?.specsRequeridas[spec]}</Typography></Grid>
                    <Grid item xs={3}><Typography variant="body2">{inspeccion.verificacionTecnica[spec]?.valor || '---'}</Typography></Grid>
                    <Grid item xs={3}><Chip size="small" label={cmp.label} color={cmp.color} /></Grid>
                  </Grid>
                );
              })}
            </TableContainer>
          ) : (
            <Typography color="text.secondary">No hay specs para comparar.</Typography>
          )}
        </TabPanel>

        <TabPanel value={tab} index={5}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Registrar Hallazgo</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Tipo</InputLabel>
                  <Select label="Tipo" value={nuevoHallazgo.tipo}
                    onChange={(e) => setNuevoHallazgo((h) => ({ ...h, tipo: e.target.value as Hallazgo['tipo'] }))}>
                    <MenuItem value="documental">Documental</MenuItem>
                    <MenuItem value="fisico">Fisico</MenuItem>
                    <MenuItem value="tecnico">Tecnico</MenuItem>
                    <MenuItem value="accesorio_faltante">Accesorio faltante</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Severidad</InputLabel>
                  <Select label="Severidad" value={nuevoHallazgo.severidad}
                    onChange={(e) => setNuevoHallazgo((h) => ({ ...h, severidad: e.target.value as Hallazgo['severidad'] }))}>
                    <MenuItem value="baja">Baja</MenuItem>
                    <MenuItem value="media">Media</MenuItem>
                    <MenuItem value="alta">Alta</MenuItem>
                    <MenuItem value="critica">Critica</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Paso asociado</InputLabel>
                  <Select label="Paso asociado" value={nuevoHallazgo.pasoAsociado}
                    onChange={(e) => setNuevoHallazgo((h) => ({ ...h, pasoAsociado: e.target.value }))}>
                    <MenuItem value="documentacion">Documentacion</MenuItem>
                    <MenuItem value="inspeccion_fisica">Inspeccion fisica</MenuItem>
                    <MenuItem value="verificacion_tecnica">Verificacion tecnica</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Descripcion del hallazgo" fullWidth multiline rows={3}
                  value={nuevoHallazgo.descripcion}
                  onChange={(e) => setNuevoHallazgo((h) => ({ ...h, descripcion: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="secondary" onClick={onAddHallazgo}
                  disabled={!nuevoHallazgo.descripcion}>Agregar Hallazgo</Button>
              </Grid>
            </Grid>
          </Paper>

          {inspeccion.hallazgos.length > 0 && (
            <List>
              {inspeccion.hallazgos.map((h) => (
                <ListItem key={h.id} secondaryAction={
                  <IconButton color="error" onClick={() => eliminarHallazgo(inspeccion!.id, h.id)}><DeleteIcon /></IconButton>
                }>
                  <ListItemIcon><Chip size="small" label={h.tipo} /></ListItemIcon>
                  <ListItemText
                    primary={`${h.severidad} | ${h.pasoAsociado}`}
                    secondary={h.descripcion} />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tab} index={6}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Adjuntar Evidencia</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Etapa asociada</InputLabel>
                  <Select label="Etapa asociada" value={nuevaEvidencia.etapa}
                    onChange={(e) => setNuevaEvidencia((ev) => ({ ...ev, etapa: e.target.value }))}>
                    <MenuItem value="documentacion">Documentacion</MenuItem>
                    <MenuItem value="inspeccion_fisica">Inspeccion fisica</MenuItem>
                    <MenuItem value="verificacion_tecnica">Verificacion tecnica</MenuItem>
                    <MenuItem value="general">General</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Hallazgo asociado (opcional)</InputLabel>
                  <Select label="Hallazgo asociado (opcional)" value={nuevaEvidencia.hallazgoId}
                    onChange={(e) => setNuevaEvidencia((ev) => ({ ...ev, hallazgoId: e.target.value }))}>
                    <MenuItem value="">Ninguno (expediente general)</MenuItem>
                    {inspeccion.hallazgos.map((h) => (
                      <MenuItem key={h.id} value={h.id}>{h.tipo} - {h.descripcion.slice(0, 40)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <input type="file" id="fileInput" accept="image/*,.pdf,.doc,.docx"
                  onChange={onFileSelected} style={{ display: 'none' }} />
                <label htmlFor="fileInput">
                  <Button component="span" variant="outlined">Seleccionar Archivo</Button>
                </label>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Imagenes, PDF, DOC (max 5MB)
                </Typography>
              </Grid>
              {filePreview && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{filePreview.nombre} ({(filePreview.tamano / 1024).toFixed(0)} KB)</Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton color="error" onClick={() => setFilePreview(null)}><CloseIcon /></IconButton>
                    <Button variant="contained" onClick={onSubirEvidencia}>Guardar</Button>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Paper>

          {inspeccion.evidencias.length > 0 && (
            <List>
              {inspeccion.evidencias.map((ev) => (
                <ListItem key={ev.id} secondaryAction={
                  <IconButton color="error" onClick={() => eliminarEvidencia(inspeccion!.id, ev.id)}><DeleteIcon /></IconButton>
                }>
                  <ListItemIcon><Chip size="small" label="file" /></ListItemIcon>
                  <ListItemText primary={ev.nombre} secondary={`${ev.etapa} | ${(ev.tamano / 1024).toFixed(0)} KB`} />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>

        <TabPanel value={tab} index={7}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Emitir Resultado de Inspeccion</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={3}><Typography variant="caption" color="text.secondary">Documentacion</Typography></Grid>
              <Grid item xs={3}><Typography variant="body2">{inspeccion.documentacion.resultado || 'Sin validar'}</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" color="text.secondary">Condicion Fisica</Typography></Grid>
              <Grid item xs={3}><Typography variant="body2">{inspeccion.inspeccionFisica.condicionGeneral || 'Sin revision'}</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" color="text.secondary">Hallazgos</Typography></Grid>
              <Grid item xs={3}><Typography variant="body2">{inspeccion.hallazgos.length} registrados</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" color="text.secondary">Evidencias</Typography></Grid>
              <Grid item xs={3}><Typography variant="body2">{inspeccion.evidencias.length} adjuntas</Typography></Grid>
            </Grid>
            <Divider sx={{ mb: 2 }} />
            <RadioGroup row value={resultado} sx={{ mb: 2 }}
              onChange={(e) => setResultado(e.target.value)}>
              <FormControlLabel
                control={<Radio />}
                label="Conforme" value="conforme" />
              <FormControlLabel
                control={<Radio />}
                label="Conforme con observaciones" value="conforme_observaciones" />
              <FormControlLabel
                control={<Radio />}
                label="No conforme" value="no_conforme" />
            </RadioGroup>
            <TextField label="Comentario final" fullWidth multiline rows={3} sx={{ mb: 2 }}
              value={comentarioFinal}
              onChange={(e) => setComentarioFinal(e.target.value)} />
            <Button variant="contained" onClick={onEmitirResultado} disabled={!resultado}>
              Emitir Resultado
            </Button>
          </Paper>

          {resultado && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Gestionar Disposicion Final</Typography>
              <RadioGroup row value={disposicion} sx={{ mb: 2 }}
                onChange={(e) => setDisposicion(e.target.value)}>
                <FormControlLabel
                  control={<Radio />}
                  label="Liberacion interna" value="liberacion" />
                <FormControlLabel
                  control={<Radio />}
                  label="Retencion" value="retencion" />
                <FormControlLabel
                  control={<Radio />}
                  label="Rechazo" value="rechazo" />
              </RadioGroup>
              <TextField label="Justificacion de la decision" fullWidth multiline rows={3} sx={{ mb: 2 }}
                value={justificacionDisposicion}
                onChange={(e) => setJustificacionDisposicion(e.target.value)} />
              <Button variant="contained" color="secondary" onClick={onGestionarDisposicion}
                disabled={!disposicion}>
                Aplicar Disposicion
              </Button>
              {disposicion && (
                <Box sx={{ mt: 2 }}>
                  <Chip label={`Disposicion actual: ${disposicion}`} color="primary" />
                  {inspeccion.fechaCierre && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Cerrado: {new Date(inspeccion.fechaCierre).toLocaleString('es-ES')}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          )}
        </TabPanel>
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={2000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}

function TableHeadRow() {
  return (
    <Grid container sx={{ py: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
      <Grid item xs={3}><Typography variant="overline">Atributo</Typography></Grid>
      <Grid item xs={3}><Typography variant="overline">Esperado</Typography></Grid>
      <Grid item xs={3}><Typography variant="overline">Verificado</Typography></Grid>
      <Grid item xs={3}><Typography variant="overline">Estado</Typography></Grid>
    </Grid>
  );
}
