import {
  Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip
} from '@mui/material';
import { useAuth } from '../../lib/auth';
import { USERS } from '../../lib/user';
import { getEmpleados } from '../empleados/service-empleados';

function countStorage(key: string): number {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]').length;
  } catch {
    return 0;
  }
}

export default function ConfiguracionSistema() {
  const { currentUser } = useAuth();

  const stats = [
    { label: 'Usuarios Registrados', value: USERS.length },
    { label: 'Empleados', value: getEmpleados().length },
    { label: 'Entradas/Salidas', value: countStorage('sg_entradas_salidas') },
    { label: 'Bitacora', value: countStorage('sg_bitacora') },
    { label: 'Inventario', value: countStorage('sg_inventario') }
  ];

  const roleLabel = (role: string) =>
    role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Administrador' : 'Recursos Humanos';

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Configuracion del Sistema</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Panel exclusivo del Super Administrador
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s) => (
          <Grid item xs={6} md={2.4} key={s.label}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{s.value}</Typography>
              <Typography color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Gestion de Usuarios</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Usuarios del sistema (datos hardcodeados)
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell><TableCell>Usuario</TableCell>
                <TableCell>Nombre</TableCell><TableCell>Rol</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {USERS.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={roleLabel(u.role)}
                      color={u.role === 'superadmin' ? 'error' : u.role === 'admin' ? 'primary' : 'default'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Informacion del Sistema</Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Version', value: '1.0.0' },
            { label: 'Framework', value: 'React 18 + Vite' },
            { label: 'UI Library', value: 'Material UI' },
            { label: 'Persistencia', value: 'localStorage' },
            { label: 'Sesion Activa', value: currentUser?.name || '' },
            { label: 'Rol', value: currentUser?.role || '' }
          ].map((i) => (
            <Grid item xs={6} md={4} key={i.label}>
              <Typography variant="body2" color="text.secondary">{i.label}</Typography>
              <Typography variant="body1">{i.value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
