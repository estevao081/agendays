export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Segredo fixo só porque este é um mock sem servidor.
const MOCK_PEPPER = 'agendasys-mock-pepper';

/**
 * Impressão digital de um identificador (CPF/CNPJ, telefone) para detectar
 * repetição sem guardar o dado original.
 *
 * ATENÇÃO (produção): um CPF tem só ~10⁹ combinações, então SHA-256 puro seria
 * quebrado por força bruta em minutos. No servidor use **HMAC-SHA-256 com um
 * segredo que só o servidor conhece** e limite a taxa de consultas.
 */
export function hashIdentifier(kind: 'document' | 'phone', value: string): Promise<string> {
  return sha256Hex(`${MOCK_PEPPER}:${kind}:${value}`);
}
