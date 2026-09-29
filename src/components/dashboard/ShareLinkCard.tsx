import { Fragment, useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { whatsappLink } from '../../utils/formatters';

interface ShareLinkCardProps {
  slug: string;
  businessName: string;
}

export function ShareLinkCard({ slug, businessName }: ShareLinkCardProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const path = `/prestador/${slug}`;
  const url = `${window.location.origin}${path}`;
  const displayUrl = `${window.location.host}${path}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showToast({ message: 'Link copiado!', description: 'Agora é só colar no WhatsApp ou Instagram.', variant: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ message: 'Não foi possível copiar', description: 'Selecione o link e copie manualmente.', variant: 'error' });
    }
  }

  async function handleShare() {
    const text = `Agende seu horário na ${businessName}: ${url}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: businessName, text: 'Agende seu horário online', url });
      } catch {
        /* o usuário fechou o painel de compartilhamento */
      }
      return;
    }
    // Fallback para navegadores sem Web Share API (ex.: desktop): abre o WhatsApp com a mensagem pronta
    window.open(whatsappLink('', text), '_blank', 'noopener,noreferrer');
  }

  return (
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold text-ink-900">Seu link de agendamento</h3>
      <p className="mt-0.5 text-sm text-ink-500">
        Envie este link para seus clientes — eles agendam sem precisar criar conta.
      </p>

      <div className="mt-4 rounded-[var(--radius-chip)] border border-ink-100 bg-paper-200/70 px-3.5 py-3">
        <p className="tabular-time select-all font-display text-sm font-medium text-ink-800">
          {displayUrl.split('/').map((part, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <>
                  /<wbr />
                </>
              )}
              {part}
            </Fragment>
          ))}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copiado' : 'Copiar link'}
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-chip)] border border-ink-200 bg-white px-5 text-[0.95rem] font-medium text-ink-700 transition-colors hover:bg-ink-100"
        >
          <ExternalLink className="size-4" />
          Abrir página
        </a>
        <Button onClick={handleShare}>
          <Share2 className="size-4" />
          Compartilhar
        </Button>
      </div>
    </Card>
  );
}
