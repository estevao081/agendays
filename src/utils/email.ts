const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Chave canônica do e-mail, para detectar a "mesma caixa postal" escrita de
 * jeitos diferentes: `A.B+promo@Gmail.com` e `ab@gmail.com` viram `ab@gmail.com`.
 * - tudo em minúsculas; remove o sufixo `+qualquer-coisa` (subendereço);
 * - no Gmail, pontos no nome não contam e `googlemail.com` = `gmail.com`.
 */
export function normalizeEmail(email: string): string {
  const [rawLocal = '', rawDomain = ''] = email.trim().toLowerCase().split('@');
  let domain = rawDomain;
  let local = rawLocal.split('+')[0];
  if (GMAIL_DOMAINS.has(domain)) {
    domain = 'gmail.com';
    local = local.replace(/\./g, '');
  }
  return `${local}@${domain}`;
}

/**
 * Domínios de e-mail descartável (caixa temporária). Lista curta de exemplo:
 * em produção use uma lista mantida (ex.: pacote `disposable-email-domains`)
 * ou um serviço de verificação, pois surgem domínios novos todo dia.
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamailblock.com', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', 'temp-mail.org', 'tempmail.com', 'tempmail.net', 'temp-mail.io',
  'yopmail.com', 'yopmail.fr', 'trashmail.com', 'trashmail.net', 'getnada.com', 'nada.email',
  'throwawaymail.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'moakt.com', 'mohmal.com',
  'tempail.com', 'burnermail.io', 'mintemail.com', 'mailnesia.com', 'discard.email', 'mytemp.email',
  'inboxkitten.com', 'emailondeck.com', 'spamgourmet.com', 'tmpmail.org', 'tmpmail.net', 'mailcatch.com',
  'fakemail.net', 'anonbox.net', 'tempinbox.com', 'owlymail.com', 'minuteinbox.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return DISPOSABLE_DOMAINS.has(domain);
}
