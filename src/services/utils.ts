/** Simula a latência de uma chamada HTTP nos services mockados. */
export function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Gera um id curto com prefixo (ex.: "svc-k3j9x2a"). Uma API real devolveria o id. */
export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
