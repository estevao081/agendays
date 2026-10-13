import { useEffect, useState } from 'react';
import { MessageCircle, AtSign, QrCode } from 'lucide-react';
import { ShareLinkCard } from '../../components/dashboard';
import { Card, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { providerService } from '../../services/providerService';
import type { Provider } from '../../types';

const TIPS = [
  { icon: MessageCircle, title: 'Mande no WhatsApp', text: 'Envie o link para clientes fiéis e deixe o próprio cliente escolher o horário.' },
  { icon: AtSign, title: 'Coloque na bio do Instagram', text: 'Um único link na bio e seus seguidores já conseguem agendar.' },
  { icon: QrCode, title: 'Divulgue no balcão', text: 'Abra sua página e clique em Imprimir: os links viram QR Codes para o cliente apontar a câmera.' },
];

export function LinkSharingPage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.providerId) return;
    providerService.getById(user.providerId).then((data) => {
      setProvider(data);
      setIsLoading(false);
    });
  }, [user?.providerId]);

  if (isLoading) return <Spinner label="Carregando…" />;
  if (!provider) return null;

  return (
    <div className="max-w-2xl space-y-5">
      <ShareLinkCard slug={provider.slug} businessName={provider.businessName} />

      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-ink-800">Onde divulgar</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIPS.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-4">
              <Icon className="size-5 text-emerald-600" />
              <p className="mt-2 text-sm font-medium text-ink-900">{title}</p>
              <p className="mt-1 text-sm text-ink-500">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
