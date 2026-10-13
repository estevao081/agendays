export type DocumentKind = 'cpf' | 'cnpj';

/** Só letras maiúsculas e números (o CNPJ pode ter letras desde jul/2026). */
export const cleanDocument = (raw: string): string => raw.toUpperCase().replace(/[^0-9A-Z]/g, '');

const allSame = (s: string) => /^(.)\1*$/.test(s);

/** Módulo 11 com valor do caractere = código ASCII − 48 (vale para CPF, CNPJ numérico e alfanumérico). */
function checkDigit(chars: string, weights: number[]): number {
  const sum = [...chars].reduce((acc, c, i) => acc + (c.charCodeAt(0) - 48) * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(raw: string): boolean {
  const d = cleanDocument(raw);
  if (!/^\d{11}$/.test(d) || allSame(d)) return false;
  const dv1 = checkDigit(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = checkDigit(d.slice(0, 9) + dv1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${dv1}${dv2}`);
}

/** Aceita CNPJ numérico e o alfanumérico (letras só nas 12 primeiras posições; os 2 DVs são numéricos). */
export function isValidCnpj(raw: string): boolean {
  const d = cleanDocument(raw);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(d) || allSame(d)) return false;
  const dv1 = checkDigit(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = checkDigit(d.slice(0, 12) + dv1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${dv1}${dv2}`);
}

export function documentKind(raw: string): DocumentKind | null {
  if (isValidCpf(raw)) return 'cpf';
  if (isValidCnpj(raw)) return 'cnpj';
  return null;
}

/** Máscara enquanto digita: CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00). */
export function formatDocument(raw: string): string {
  const d = cleanDocument(raw).slice(0, 14);
  const isCpf = d.length <= 11 && /^\d*$/.test(d);
  if (isCpf) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return d
    .replace(/^([0-9A-Z]{2})([0-9A-Z])/, '$1.$2')
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})([0-9A-Z])/, '$1.$2.$3')
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})\.([0-9A-Z]{3})([0-9A-Z])/, '$1.$2.$3/$4')
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})\.([0-9A-Z]{3})\/([0-9A-Z]{4})(\d)/, '$1.$2.$3/$4-$5');
}
