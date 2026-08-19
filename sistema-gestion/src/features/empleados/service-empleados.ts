import { createStore, genId, today, nowTime, nowISO } from '../../lib/store';
import { Empleado, STORAGE_KEYS } from './types';

export const empleadosStore = createStore<Empleado[]>(STORAGE_KEYS.empleados, () => []);

export function getEmpleados(): Empleado[] {
  return empleadosStore.get();
}

export function getById(id: string): Empleado | undefined {
  return getEmpleados().find((e) => e.id === id);
}

export function getByNumero(numero: string): Empleado | undefined {
  return getEmpleados().find((e) => e.numeroEmpleado === numero);
}

export function getActivos(): Empleado[] {
  return getEmpleados().filter((e) => e.estado === 'activo');
}

export function generarNumeroEmpleado(): string {
  return `EMP-${(getEmpleados().length + 1).toString().padStart(4, '0')}`;
}

export function generarBiometricTemplate(fotoBase64: string): string {
  let hash = 0;
  const str = fotoBase64.substring(0, 200);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'BIO-' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

export function registrar(data: Omit<Empleado, 'id' | 'biometricTemplate' | 'estado' | 'fechaRegistro'>): Empleado {
  const nuevo: Empleado = {
    ...data,
    id: genId(),
    biometricTemplate: generarBiometricTemplate(data.fotoBase64),
    estado: 'activo',
    fechaRegistro: nowISO()
  };
  empleadosStore.set([...getEmpleados(), nuevo]);
  return nuevo;
}

export function update(id: string, data: Partial<Empleado>): void {
  empleadosStore.set(getEmpleados().map((e) => (e.id === id ? { ...e, ...data } : e)));
}

export function activar(id: string): void { update(id, { estado: 'activo' }); }
export function desactivar(id: string): void { update(id, { estado: 'inactivo' }); }

export function eliminar(id: string): void {
  empleadosStore.set(getEmpleados().filter((e) => e.id !== id));
}

export function getEmpleadosParaReconocimiento(): Pick<Empleado, 'id' | 'nombre' | 'numeroEmpleado' | 'fotoBase64' | 'departamento' | 'estado'>[] {
  return getActivos().map((e) => ({
    id: e.id, nombre: e.nombre, numeroEmpleado: e.numeroEmpleado,
    fotoBase64: e.fotoBase64, departamento: e.departamento, estado: e.estado
  }));
}

export function getFechaHoy(): string {
  return today();
}

export function getHoraActual(): string {
  return nowTime();
}
