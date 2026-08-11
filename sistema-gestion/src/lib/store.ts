import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  use: () => T;
}

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback();
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export function createStore<T>(key: string, fallback: () => T): Store<T> {
  let state: T = load(key, fallback);
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());

  const store: Store<T> = {
    get: () => state,
    set: (next) => {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
      localStorage.setItem(key, JSON.stringify(state));
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    use: () => useSyncExternalStore(store.subscribe, store.get, store.get)
  };

  return store;
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowTime(): string {
  return new Date().toTimeString().substring(0, 5);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES');
}
