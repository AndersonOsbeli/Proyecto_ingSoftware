import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PhoneIcon from '@mui/icons-material/Phone';
import EventNoteIcon from '@mui/icons-material/EventNote';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import { useAuth, logout } from '../lib/auth';

const drawerWidth = 264;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    section: 'Principal',
    items: [
      { label: 'Inicio', path: '/', icon: <DashboardIcon />, roles: ['superadmin', 'admin', 'rrhh'] }
    ]
  },
  {
    section: 'Operaciones',
    items: [
      { label: 'Entradas y Salidas', path: '/entradas-salidas', icon: <SwapHorizIcon />, roles: ['superadmin', 'admin', 'rrhh'] },
      { label: 'Bitacora Telefonica', path: '/bitacora', icon: <PhoneIcon />, roles: ['superadmin', 'admin', 'rrhh'] },
      { label: 'Bitacora de Actividades', path: '/bitacora-actividades', icon: <EventNoteIcon />, roles: ['superadmin', 'admin', 'rrhh'] },
      { label: 'Inventario', path: '/inventario', icon: <InventoryIcon />, roles: ['superadmin', 'admin'] },
      { label: 'Empleados', path: '/empleados', icon: <PeopleIcon />, roles: ['superadmin', 'admin', 'rrhh'] }
    ]
  },
  {
    section: 'Administracion',
    items: [
      { label: 'Configuracion', path: '/configuracion-sistema', icon: <SettingsIcon />, roles: ['superadmin'] }
    ]
  }
];

const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/empleados/marcaje', title: 'Marcaje de Asistencia' },
  { prefix: '/empleados/horarios', title: 'Horarios Laborales' },
  { prefix: '/empleados/vacaciones', title: 'Vacaciones' },
  { prefix: '/empleados/permisos', title: 'Permisos' },
  { prefix: '/empleados/ausencias', title: 'Ausencias' },
  { prefix: '/empleados/historial-asistencia', title: 'Historial de Asistencia' },
  { prefix: '/empleados/historial-solicitudes', title: 'Historial de Solicitudes' },
  { prefix: '/empleados/auditoria', title: 'Bitacora de Auditoria' },
  { prefix: '/empleados/reportes', title: 'Reportes' },
  { prefix: '/empleados/nuevo', title: 'Nuevo Empleado' },
  { prefix: '/inventario/ingreso', title: 'Registro de Ingreso' },
  { prefix: '/inventario/inspeccion', title: 'Inspeccion de Equipo' },
  { prefix: '/configuracion-sistema', title: 'Configuracion del Sistema' },
  { prefix: '/entradas-salidas', title: 'Entradas y Salidas' },
  { prefix: '/bitacora-actividades', title: 'Bitacora de Actividades' },
  { prefix: '/bitacora', title: 'Bitacora Telefonica' },
  { prefix: '/inventario', title: 'Inventario' },
  { prefix: '/empleados', title: 'Empleados' },
  { prefix: '/', title: 'Inicio' }
];

function getPageTitle(pathname: string): string {
  for (const p of PAGE_TITLES) {
    if (p.prefix === '/' || pathname.startsWith(p.prefix)) return p.title;
  }
  return 'Sistema de Gestion';
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleSections = navSections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => currentUser && item.roles.includes(currentUser.role))
    }))
    .filter((s) => s.items.length > 0);

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: '#FFFFFF', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar sx={{ minHeight: 64, bgcolor: '#FFFFFF' }}>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2, color: '#475569' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary', fontSize: '1.05rem' }}>
            {getPageTitle(location.pathname)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
              {initials}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1.2, color: 'text.primary' }}>
                {currentUser?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                {currentUser?.role}
              </Typography>
            </Box>
            <IconButton onClick={handleLogout} title="Cerrar sesion" sx={{ ml: 0.5, color: '#475569' }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: open ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
            color: '#CBD5E1'
          }
        }}
      >
        <Box sx={{ height: 64, display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: '#FFFFFF' }}>
            <WorkspacesIcon fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 700, lineHeight: 1.2 }}>
              Sistema de Gestion
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(203,213,225,0.6)' }}>
              Panel de administracion
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5, pb: 3 }}>
          {visibleSections.map((section) => (
            <Box key={section.section} sx={{ mt: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  color: 'rgba(203,213,225,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  fontSize: '0.68rem'
                }}
              >
                {section.section}
              </Typography>
              <List sx={{ py: 0.5 }}>
                {section.items.map((item) => (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      component={NavLink}
                      to={item.path}
                      end={item.path === '/'}
                      sx={{
                        borderRadius: 2,
                        py: 0.9,
                        color: '#CBD5E1',
                        '&.active': {
                          color: '#FFFFFF',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          boxShadow: 'inset 3px 0 0 #3B82F6'
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.06)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Toolbar sx={{ minHeight: 64, bgcolor: 'transparent' }} />
        <Outlet />
      </Box>
    </Box>
  );
}
