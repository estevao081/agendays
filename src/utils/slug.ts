/** "Barbearia do João!" → "barbearia-do-joao" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

// sem caracteres ambíguos (0/o, 1/l/i) para o link ser fácil de ler e ditar
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** Identificador curto e aleatório (6 caracteres ≈ 887 milhões de combinações). */
export function randomLinkId(length = 6): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

/**
 * Monta o slug público: nome legível + identificador único
 * (ex.: "barbearia-fulano-k3x9qa"). Assim, dois prestadores com o mesmo nome e o
 * mesmo estabelecimento nunca colidem — e nenhum deles é impedido de criar conta.
 * `isTaken` permite à camada de dados garantir a unicidade (na API real, o
 * servidor também precisa garantir, com índice único no banco).
 */
export function buildProviderSlug(businessName: string, isTaken: (slug: string) => boolean): string {
  const base = slugify(businessName) || 'prestador';
  let slug: string;
  do {
    slug = `${base}-${randomLinkId()}`;
  } while (isTaken(slug));
  return slug;
}
