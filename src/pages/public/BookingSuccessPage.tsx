import { useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { BookingSummaryTicket } from '../../components/booking';
import { Button } from '../../components/ui';
import { formatDateBR, weekdayLabel, parseIsoDateLocal } from '../../utils/formatters';

interface SuccessState {
  providerName: string;
  serviceName: string;
  date: string;
  time: string;
  clientName: string;
  simulatedMessage: string;
}

export function BookingSuccessPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as SuccessState | null;

  if (!state) {
    return <Navigate to={`/prestador/${slug}`} replace />;
  }

  return (
    <div className="space-y-6 p-5 pt-10 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="size-9" />
      </div>

      <div>
        <h1 className="font-display text-xl font-semibold text-ink-900">
          Agendamento realizado com sucesso!
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Anote os detalhes abaixo — te esperamos no horário combinado.
        </p>
      </div>

      <BookingSummaryTicket
        rows={[
          { label: 'Prestador', value: state.providerName },
          { label: 'Serviço', value: state.serviceName },
          {
            label: 'Data',
            value: `${weekdayLabel(parseIsoDateLocal(state.date).getDay())}, ${formatDateBR(state.date)}`,
          },
          { label: 'Horário', value: state.time },
          { label: 'Cliente', value: state.clientName },
        ]}
      />

      <div className="rounded-[var(--radius-card)] border border-emerald-100 bg-emerald-50 p-4 text-left">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <MessageCircle className="size-4" />
          Notificação enviada para o WhatsApp do prestador
        </p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-emerald-800/80">
          {state.simulatedMessage}
        </pre>
      </div>

      <Button fullWidth variant="ghost" onClick={() => navigate(`/prestador/${slug}`)}>
        Voltar para a página do prestador
      </Button>
    </div>
  );
}
