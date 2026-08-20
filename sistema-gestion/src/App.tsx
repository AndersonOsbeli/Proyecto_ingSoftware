import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './lib/guards';
import Login from './pages/Login';
import DashboardLayout from './layout/DashboardLayout';
import Home from './pages/Home';
import EntradasSalidas from './features/entradas-salidas/EntradasSalidas';
import Bitacora from './features/bitacora/Bitacora';
import BitacoraActividades from './features/bitacora-actividades/BitacoraActividades';
import Inventario from './features/inventario/Inventario';
import Ingreso from './features/inventario/Ingreso';
import Inspeccion from './features/inventario/Inspeccion';
import Empleados from './features/empleados/Empleados';
import EmpleadoForm from './features/empleados/EmpleadoForm';
import Marcaje from './features/empleados/Marcaje';
import Horarios from './features/empleados/Horarios';
import Vacaciones from './features/empleados/Vacaciones';
import Permisos from './features/empleados/Permisos';
import Ausencias from './features/empleados/Ausencias';
import HistorialAsistencia from './features/empleados/HistorialAsistencia';
import HistorialSolicitudes from './features/empleados/HistorialSolicitudes';
import Auditoria from './features/empleados/Auditoria';
import Reportes from './features/empleados/Reportes';
import EmpleadoDetail from './features/empleados/EmpleadoDetail';
import ConfiguracionSistema from './features/configuracion/ConfiguracionSistema';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/entradas-salidas" element={<EntradasSalidas />} />
        <Route path="/bitacora" element={<Bitacora />} />
        <Route path="/bitacora-actividades" element={<BitacoraActividades />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/inventario/ingreso" element={<Ingreso />} />
        <Route path="/inventario/ingreso/:id" element={<Ingreso />} />
        <Route path="/inventario/inspeccion/:ingresoId" element={<Inspeccion />} />
        <Route path="/empleados" element={<Empleados />} />
        <Route path="/empleados/nuevo" element={<EmpleadoForm />} />
        <Route path="/empleados/:id/editar" element={<EmpleadoForm />} />
        <Route path="/empleados/:id" element={<EmpleadoDetail />} />
        <Route path="/empleados/marcaje" element={<Marcaje />} />
        <Route path="/empleados/horarios" element={<Horarios />} />
        <Route path="/empleados/vacaciones" element={<Vacaciones />} />
        <Route path="/empleados/permisos" element={<Permisos />} />
        <Route path="/empleados/ausencias" element={<Ausencias />} />
        <Route path="/empleados/historial-asistencia" element={<HistorialAsistencia />} />
        <Route path="/empleados/historial-solicitudes" element={<HistorialSolicitudes />} />
        <Route path="/empleados/auditoria" element={<Auditoria />} />
        <Route path="/empleados/reportes" element={<Reportes />} />
        <Route
          path="/configuracion-sistema"
          element={
            <RequireRole roles={['superadmin']}>
              <ConfiguracionSistema />
            </RequireRole>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
