/**
 * Persistência mockada em localStorage, com fallback em memória (ex.: testes em
 * Node, navegação privada). Uma API real substitui tudo isso.
 */
const memory = new Map<string, unknown>();

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return (memory.get(key) as T | undefined) ?? fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  if (hasStorage()) localStorage.setItem(key, JSON.stringify(value));
  else memory.set(key, value);
}
