import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, MessageCircle, AtSign, Frown, Printer } from 'lucide-react';
import { ServiceCard } from '../../components/booking';
import { Button, EmptyState, QrCode, Spinner } from '../../components/ui';
import { providerService } from '../../services/providerService';
import { serviceService } from '../../services/serviceService';
import { billingService } from '../../services/billingService';
import { whatsappLink } from '../../utils/formatters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { Provider, Service } from '../../types';

export function ProviderPublicPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<Provider | null | undefined>(undefined);
  const [services, setServices] = useState<Service[]>([]);
  const [acceptingBookings, setAcceptingBookings] = useState(true);

  useDocumentTitle(provider ? `${provider.businessName} · Agendamento online` : undefined);

  useEffect(() => {
    if (!slug) return;
    providerService.getBySlug(slug).then(async (found) => {
      setProvider(found);
      if (found) {
        setAcceptingBookings(await billingService.hasAccess(found.id));
        const allServices = await serviceService.listByProvider(found.id);
        setServices(allServices.filter((s) => s.active));
      }
    });
  }, [slug]);

  function goToBooking(serviceId?: string) {
    navigate(`/prestador/${slug}/agendar`, { state: serviceId ? { serviceId } : undefined });
  }

  if (provider === undefined) return <Spinner label="Carregando…" />;

  if (provider === null) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Frown className="size-8" />}
          title="Página não encontrada"
          description="Este link de agendamento não existe ou foi desativado pelo prestador."
        />
      </div>
    );
  }

  if (!acceptingBookings) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Frown className="size-8" />}
          title="Agendamento indisponível"
          description={`${provider.businessName} não está recebendo agendamentos online no momento. Fale diretamente com o estabelecimento.`}
        />
      </div>
    );
  }

  const bookingUrl = `${window.location.origin}/prestador/${provider.slug}`;

  return (
    <div className="pb-28 print:pb-0">
      <div className="relative h-28 bg-gradient-to-br from-emerald-600 to-emerald-700 print:bg-none print:h-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="absolute right-4 top-4 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-chip)] bg-white/90 px-3 text-sm font-medium text-ink-800 shadow-sm hover:bg-white print:hidden"
        >
          <Printer className="size-4" />
          Imprimir
        </button>
      </div>

      <div className="relative -mt-12 px-5 print:mt-0">
        <img
          src={provider.avatarUrl}
          alt={provider.businessName}
          className="size-24 rounded-full border-4 border-paper-100 bg-ink-100 object-cover shadow-sm"
        />

        <div className="mt-3">
          <h1 className="font-display text-xl font-semibold text-ink-900">
            {provider.businessName}
          </h1>
          <p className="text-sm text-ink-500">{provider.name}</p>
        </div>

        {provider.description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{provider.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {provider.address && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs text-ink-600">
              <MapPin className="size-3.5 text-ink-400" />
              {provider.address}
            </span>
          )}
          {provider.instagram && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-100 bg-white px-3 py-1.5 text-xs text-ink-600">
              <AtSign className="size-3.5 text-ink-400" />
              {provider.instagram.replace(/^@/, '')}
            </span>
          )}
        </div>

        {provider.whatsapp && (
          <a
            href={whatsappLink(
              provider.whatsapp,
              `Olá! Vi seu link de agendamento e gostaria de tirar uma dúvida.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-[var(--radius-chip)] border border-emerald-600 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 print:hidden"
          >
            <MessageCircle className="size-4" />
            Conversar no WhatsApp
          </a>
        )}

        <div className="mt-7">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-800">Serviços</h2>

          {services.length === 0 ? (
            <EmptyState
              title="Nenhum serviço disponível"
              description="Esse prestador ainda não cadastrou serviços para agendamento online."
            />
          ) : (
            <div className="space-y-2.5">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={() => goToBooking(service.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <PrintQrCodes
        bookingUrl={bookingUrl}
        whatsappUrl={provider.whatsapp ? whatsappLink(provider.whatsapp) : null}
      />

      {services.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-ink-100 bg-white/95 px-5 py-3 backdrop-blur print:hidden">
          <Button fullWidth size="lg" onClick={() => goToBooking()}>
            Agendar horário
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Bloco exibido apenas na impressão: os links interativos (agendamento e
 * WhatsApp) viram QR Codes para o cliente apontar a câmera do celular.
 */
function PrintQrCodes({ bookingUrl, whatsappUrl }: { bookingUrl: string; whatsappUrl: string | null }) {
  return (
    <section
      aria-label="QR Codes para impressão"
      className="mt-8 hidden break-inside-avoid grid-cols-2 gap-6 px-5 print:grid"
    >
      <figure className="flex flex-col items-center text-center">
        <QrCode value={bookingUrl} label="QR Code para agendar um horário" size={176} />
        <figcaption className="mt-2 text-sm font-semibold text-ink-900">Agende seu horário</figcaption>
        <p className="mt-0.5 break-all text-[10px] leading-tight text-ink-500">{bookingUrl}</p>
      </figure>
      {whatsappUrl && (
        <figure className="flex flex-col items-center text-center">
          <QrCode value={whatsappUrl} label="QR Code para conversar no WhatsApp" size={176} />
          <figcaption className="mt-2 text-sm font-semibold text-ink-900">Fale pelo WhatsApp</figcaption>
          <p className="mt-0.5 text-[10px] leading-tight text-ink-500">Aponte a câmera do celular</p>
        </figure>
      )}
    </section>
  );
}
