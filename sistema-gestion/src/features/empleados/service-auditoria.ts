import { createStore, genId, nowISO } from '../../lib/store';
import { RegistroAuditoria, TipoAccionAuditoria, STORAGE_KEYS } from './types';

export const auditoriaStore = createStore<RegistroAuditoria[]>(STORAGE_KEYS.auditoria, () => []);

export function registrar(data: Omit<RegistroAuditoria, 'id' | 'fechaHora' | 'ip'>): RegistroAuditoria {
  const registro: RegistroAuditoria = {
    ...data,
    id: genId(),
    fechaHora: nowISO(),
    ip: genIP()
  };
  const all = auditoriaStore.get();
  auditoriaStore.set([...all, registro]);
  return registro;
}

export function getAll(): RegistroAuditoria[] {
  return auditoriaStore.get();
}

export function getByFiltros(filtros: {
  usuario?: string; accion?: TipoAccionAuditoria; modulo?: string; fechaInicio?: string; fechaFin?: string
}): RegistroAuditoria[] {
  return auditoriaStore.get().filter((r) => {
    if (filtros.usuario && !r.usuario.toLowerCase().includes(filtros.usuario.toLowerCase())) return false;
    if (filtros.accion && r.accion !== filtros.accion) return false;
    if (filtros.modulo && r.modulo !== filtros.modulo) return false;
    if (filtros.fechaInicio && r.fechaHora < filtros.fechaInicio) return false;
    if (filtros.fechaFin && r.fechaHora > filtros.fechaFin + 'T23:59:59') return false;
    return true;
  });
}

export function getRegistrosPorModulo(modulo: string): RegistroAuditoria[] {
  return getAll().filter((r) => r.modulo === modulo);
}

export function getRegistrosPorUsuario(usuario: string): RegistroAuditoria[] {
  return getAll().filter((r) => r.usuario === usuario);
}

function genIP(): string {
  return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
}
