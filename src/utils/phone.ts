/**
 * Celular brasileiro → "55" + DDD + 9 dígitos (formato usado pelo wa.me).
 * Aceita "(81) 99123-4567", "81991234567", "+55 81 99123-4567"…; devolve null se inválido.
 */
export function normalizeBrPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if (!/^[1-9][1-9]9\d{8}$/.test(digits)) return null; // DDD (11–99) + celular começando em 9
  return `55${digits}`;
}

/** Máscara enquanto digita: (81) 99123-4567 */
export function formatBrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^55(?=\d{11}$)/, '').slice(0, 11);
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2');
}
