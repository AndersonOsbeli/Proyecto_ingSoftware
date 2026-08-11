import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import LockIcon from '@mui/icons-material/Lock';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { login } from '../lib/auth';

const FEATURES = [
  'Gestion integral de empleados y asistencia',
  'Control de inventario con inspecciones tecnicas',
  'Bitacoras y auditoria completa de acciones'
];

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/');
    } else {
      setError('Credenciales invalidas. Verifique su usuario y contrasena.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '46%',
          p: 6,
          color: '#FFFFFF',
          background: 'linear-gradient(150deg, #1E3A8A 0%, #1E40AF 45%, #3B82F6 100%)'
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Sistema de Gestion
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.8)' }}>
            Plataforma de administracion empresarial
          </Typography>
        </Box>
        <Box>
          {FEATURES.map((f) => (
            <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
              <CheckCircleOutlineIcon fontSize="small" />
              <Typography variant="body2">{f}</Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          © {new Date().getFullYear()} Sistema de Gestion. Todos los derechos reservados.
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Paper elevation={0} sx={{ p: 5, width: 420, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Iniciar sesion
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Acceda con sus credenciales corporativas
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Usuario"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }
              }}
            />
            <TextField
              label="Contrasena"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" color="action" />
                    </InputAdornment>
                  )
                }
              }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3, py: 1.2 }}>
              Ingresar
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
