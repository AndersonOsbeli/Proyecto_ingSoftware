import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Paper, Button, Typography, IconButton, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tab, Tabs, Grid, Snackbar, Alert,
  Card, CardContent, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { QRCodeCanvas } from 'qrcode.react';
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

  const descargarQR = () => {
    if (!empleado) return;
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR_${empleado.nombre.replace(/\s+/g, '_')}.png`;
      link.href = url;
      link.click();
      setSnack('Código QR descargado con éxito.');
    } else {
      setSnack('Error al generar la imagen del código QR.');
    }
  };

  const imprimirCredencial = () => {
    if (!empleado) return;
    const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const qrImage = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Credencial - ${empleado.nombre}</title>
            <style>
              body {
                font-family: 'Inter', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f8fafc;
              }
              .badge {
                width: 320px;
                border: 2px solid #1e40af;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                background: white;
                text-align: center;
              }
              .badge-header {
                background: linear-gradient(135deg, #1e40af, #1e3a8a);
                color: white;
                padding: 16px;
                font-weight: bold;
                letter-spacing: 1px;
                font-size: 14px;
                text-transform: uppercase;
              }
              .badge-body {
                padding: 24px 16px;
              }
              .avatar {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                object-fit: cover;
                border: 3px solid #cbd5e1;
                margin-bottom: 12px;
              }
              .avatar-placeholder {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: #e2e8f0;
                color: #475569;
                font-size: 36px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
                border: 3px solid #cbd5e1;
              }
              .name {
                font-size: 18px;
                font-weight: bold;
                color: #0f172a;
                margin: 4px 0;
              }
              .role {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 16px;
              }
              .qr-container {
                display: inline-block;
                padding: 8px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background: #f8fafc;
              }
              .qr-image {
                width: 150px;
                height: 150px;
                display: block;
              }
              .badge-footer {
                background-color: #f8fafc;
                padding: 12px;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
              }
              @media print {
                body { background: white; }
                .badge { box-shadow: none; border-color: #000; }
              }
            </style>
          </head>
          <body>
            <div class="badge">
              <div class="badge-header">CREDENCIAL DE ACCESO</div>
              <div class="badge-body">
                \${empleado.fotoBase64 
                  ? \`<img class="avatar" src="\${empleado.fotoBase64}" />\`
                  : \`<div class="avatar-placeholder">\${empleado.nombre.charAt(0)}</div>\`
                }
                <div class="name">\${empleado.nombre}</div>
                <div class="role">\${empleado.cargo}</div>
                <div class="qr-container">
                  <img class="qr-image" src="\${qrImage}" />
                </div>
              </div>
              <div class="badge-footer">
                <strong>No. Empleado:</strong> \${empleado.numeroEmpleado}<br>
                <span>\${empleado.departamento}</span>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

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
            <Grid container spacing={3}>
              {/* Columna Izquierda: Información del Empleado */}
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  {empleado.fotoBase64
                    ? <img src={empleado.fotoBase64} alt="foto" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                    : <Chip label="account_circle" variant="outlined" sx={{ width: 90, height: 90, borderRadius: '50%' }} />}
                  <Box>
                    {empleado.biometricTemplate && (
                      <Chip size="small" color="secondary" variant="outlined" label={`Biometría: ${empleado.biometricTemplate}`} sx={{ mb: 0.5 }} />
                    )}
                    <Typography variant="body2" color="text.secondary">ID Interno: {empleado.id}</Typography>
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  {[
                    ['Correo Electrónico', empleado.correo], ['Género', empleado.genero],
                    ['Sucursal asignada', empleado.sucursal], ['Fecha de Ingreso', empleado.fechaIngreso],
                    ['Horario Laboral', horarioNombre], ['Registrado por', empleado.registradoPor]
                  ].map(([label, value]) => (
                    <Grid item xs={12} sm={6} key={label}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
                      <Typography variant="body1" fontWeight={600}>{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Columna Derecha: Tarjeta de Credencial QR */}
              <Grid item xs={12} md={4}>
                <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 3, overflow: 'hidden' }}>
                  {/* Cabecera Credencial */}
                  <Box sx={{ background: 'linear-gradient(135deg, #1e40af, #1e3a8a)', color: 'white', py: 1.5, px: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: '0.1em' }}>
                      CREDENCIAL DIGITAL
                    </Typography>
                  </Box>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 3, pb: 2 }}>
                    {/* Render de QR en Canvas */}
                    <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: '#f8fafc', mb: 2 }}>
                      <QRCodeCanvas
                        id="qr-canvas"
                        value={empleado.id}
                        size={160}
                        level="H"
                        includeMargin={true}
                      />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} align="center" noWrap sx={{ width: '100%' }}>
                      {empleado.nombre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom>
                      No. Empleado: {empleado.numeroEmpleado}
                    </Typography>
                    <Chip label={empleado.departamento} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                  </CardContent>
                  <Divider />
                  {/* Botones de acción QR */}
                  <Box sx={{ p: 1.5, display: 'flex', gap: 1, justifyContent: 'center', bgcolor: 'action.hover' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={descargarQR}
                      fullWidth
                    >
                      Descargar QR
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={imprimirCredencial}
                      fullWidth
                    >
                      Imprimir
                    </Button>
                  </Box>
                </Card>
              </Grid>
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
