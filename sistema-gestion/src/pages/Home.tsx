import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PhoneIcon from '@mui/icons-material/Phone';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../lib/auth';

interface QuickAccess {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  roles: string[];
}

const QUICK_ACCESS: QuickAccess[] = [
  { title: 'Empleados', description: 'Gestion del personal, horarios y solicitudes', path: '/empleados', icon: <PeopleIcon />, color: '#2563EB', roles: ['superadmin', 'admin', 'rrhh'] },
  { title: 'Inventario', description: 'Equipos, ingresos e inspecciones tecnicas', path: '/inventario', icon: <InventoryIcon />, color: '#0F766E', roles: ['superadmin', 'admin'] },
  { title: 'Entradas y Salidas', description: 'Registro de personal y visitas', path: '/entradas-salidas', icon: <SwapHorizIcon />, color: '#D97706', roles: ['superadmin', 'admin', 'rrhh'] },
  { title: 'Bitacora Telefonica', description: 'Registro de llamadas recibidas y realizadas', path: '/bitacora', icon: <PhoneIcon />, color: '#7C3AED', roles: ['superadmin', 'admin', 'rrhh'] },
  { title: 'Bitacora de Actividades', description: 'Actividades diarias con calendario', path: '/bitacora-actividades', icon: <EventNoteIcon />, color: '#DB2777', roles: ['superadmin', 'admin', 'rrhh'] },
  { title: 'Configuracion', description: 'Parametros del sistema y usuarios', path: '/configuracion-sistema', icon: <SettingsIcon />, color: '#64748B', roles: ['superadmin'] }
];

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    setFecha(new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }));
  }, []);

  const accesos = QUICK_ACCESS.filter((a) => currentUser && a.roles.includes(currentUser.role));

  return (
    <Box>
      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 3,
          color: '#FFFFFF',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 60%, #3B82F6 100%)',
          border: 'none'
        }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Bienvenido, {currentUser?.name}
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.85)' }}>
          {fecha.charAt(0).toUpperCase() + fecha.slice(1)} · Rol: {currentUser?.role}
        </Typography>
      </Paper>

      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Acceso rapido
      </Typography>

      <Grid container spacing={3}>
        {accesos.map((a) => (
          <Grid item xs={12} sm={6} md={4} key={a.path}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea onClick={() => navigate(a.path)} sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
                  <Avatar sx={{ width: 52, height: 52, bgcolor: a.color, boxShadow: `0 4px 12px ${a.color}44` }}>
                    {a.icon}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {a.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                      {a.description}
                    </Typography>
                  </Box>
                  <ChevronRightIcon color="action" />
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
