import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { User } from 'lucide-react';

import {
  ServiceCard,
  Calendar,
  TimeSlotChip,
  BookingSummaryTicket,
  BookingStepHeader,
} from '../../components/booking';
import { Button, Input, Spinner, EmptyState } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

import { providerService } from '../../services/providerService';
import { serviceService } from '../../services/serviceService';
import { availabilityService } from '../../services/availabilityService';
import { billingService } from '../../services/billingService';
import { appointmentService } from '../../services/appointmentService';
import { whatsappNotificationService } from '../../services/whatsappNotificationService';

import { generateTimeSlots } from '../../utils/slotGenerator';
import { formatDateBR, weekdayLabel, parseIsoDateLocal } from '../../utils/formatters';

import type { AvailabilitySettings, Provider, Service } from '../../types';

const TOTAL_STEPS = 5;

export function BookingFlowPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const preselectedServiceId = (location.state as { serviceId?: string } | null)?.serviceId;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingBookings, setAcceptingBookings] = useState(true);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(preselectedServiceId ?? null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);

  useDocumentTitle(provider ? `Agendar · ${provider.businessName}` : undefined);

  useEffect(() => {
    if (!slug) return;
    providerService.getBySlug(slug).then(async (found) => {
      if (!found) {
        setIsLoading(false);
        return;
      }
      setProvider(found);
      if (!(await billingService.hasAccess(found.id))) {
        setAcceptingBookings(false);
        setIsLoading(false);
        return;
      }
      const [svcs, avail] = await Promise.all([
        serviceService.listByProvider(found.id),
        availabilityService.get(found.id),
      ]);
      const activeServices = svcs.filter((s) => s.active);
      setServices(activeServices);
      setAvailability(avail);
      setIsLoading(false);
      if (preselectedServiceId && activeServices.some((s) => s.id === preselectedServiceId)) {
        setStep(2);
      } else {
        // serviço inexistente ou desativado: volta para a escolha de serviço
        setServiceId(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!provider || !date) return;
    setIsLoadingSlots(true);
    appointmentService.listByProviderAndDate(provider.id, date).then((appts) => {
      setOccupiedTimes(
        appts.map((a) => a.time)
      );
      setIsLoadingSlots(false);
    });
  }, [provider, date, slotsVersion]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const dayAvailability = useMemo(() => {
    if (!availability || !date) return null;
    const dow = parseIsoDateLocal(date).getDay();
    return availability.days.find((d) => d.dayOfWeek === dow) ?? null;
  }, [availability, date]);

  const timeSlots = useMemo(() => {
    if (!dayAvailability || !dayAvailability.enabled || !date) return [];
    const slots = generateTimeSlots({
      periods: dayAvailability.periods,
      slotIntervalMinutes: dayAvailability.slotIntervalMinutes,
      occupiedTimes,
    });

    const isToday = date === format(new Date(), 'yyyy-MM-dd');
    if (!isToday) return slots;

    const nowTime = format(new Date(), 'HH:mm');
    return slots.map((slot) =>
      slot.time < nowTime ? { ...slot, available: false } : slot
    );
  }, [dayAvailability, occupiedTimes, date]);

  function isWeekdayEnabled(dayOfWeek: number): boolean {
    return availability?.days.find((d) => d.dayOfWeek === dayOfWeek)?.enabled ?? false;
  }

  function goBack() {
    if (step === 1) {
      navigate(`/prestador/${slug}`);
      return;
    }
    setStep((s) => s - 1);
  }

  async function handleConfirm() {
    if (!provider || !selectedService || !date || !time || !clientName.trim()) return;

    setIsSubmitting(true);
    try {
      const appointment = await appointmentService.create({
        providerId: provider.id,
        serviceId: selectedService.id,
        clientName: clientName.trim(),
        date,
        time,
      });

      const notification = await whatsappNotificationService.simulateNotification({
        appointment,
        providerWhatsapp: provider.whatsapp,
        serviceName: selectedService.name,
      });

      navigate(`/prestador/${slug}/agendar/sucesso`, {
        replace: true,
        state: {
          providerName: provider.businessName,
          serviceName: selectedService.name,
          date,
          time,
          clientName: clientName.trim(),
          simulatedMessage: notification.simulatedMessage,
        },
      });
    } catch (err) {
      showToast({
        message: 'Não foi possível agendar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'error',
      });
      // horário foi ocupado por outra pessoa: recarrega as vagas e volta para a escolha de horário
      setTime(null);
      setSlotsVersion((v) => v + 1);
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Spinner label="Carregando…" />;

  if (!provider) {
    return (
      <div className="p-6">
        <EmptyState title="Página não encontrada" description="Este link de agendamento não existe." />
      </div>
    );
  }

  if (!acceptingBookings) {
    return (
      <div className="p-6">
        <EmptyState title="Agendamento indisponível" description={`${provider.businessName} não está recebendo agendamentos online no momento.`} />
      </div>
    );
  }

  const STEP_TITLES = ['Escolha o serviço', 'Escolha a data', 'Escolha o horário', 'Seus dados', 'Confirmação'];

  return (
    <div className="pb-32">
      <BookingStepHeader
        step={step}
        totalSteps={TOTAL_STEPS}
        title={STEP_TITLES[step - 1]}
        onBack={goBack}
      />

      <div className="px-5 pt-2">
        {step === 1 && (
          <div className="space-y-2.5">
            {services.length === 0 ? (
              <EmptyState
                title="Nenhum serviço disponível"
                description="Esse prestador ainda não cadastrou serviços para agendamento online."
              />
            ) : (
              services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={service.id === serviceId}
                  onSelect={() => {
                    setServiceId(service.id);
                    setStep(2);
                  }}
                />
              ))
            )}
          </div>
        )}

        {step === 2 && (
          <Calendar
            selectedDate={date}
            isWeekdayEnabled={isWeekdayEnabled}
            onSelect={(iso) => {
              setDate(iso);
              setTime(null);
              setStep(3);
            }}
          />
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-sm text-ink-500">
              {date && (
                <>
                  {weekdayLabel(parseIsoDateLocal(date).getDay())}, {formatDateBR(date)}
                </>
              )}
            </p>
            {isLoadingSlots ? (
              <Spinner label="Verificando horários…" />
            ) : timeSlots.length === 0 ? (
              <EmptyState
                title="Sem horários disponíveis"
                description="Não há horários livres neste dia. Escolha outra data."
              />
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {timeSlots.map((slot) => (
                  <TimeSlotChip
                    key={slot.time}
                    time={slot.time}
                    available={slot.available}
                    selected={slot.time === time}
                    onClick={() => {
                      setTime(slot.time);
                      setStep(4);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Input
              label="Seu nome"
              icon={<User className="size-4" />}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como podemos te chamar?"
              autoFocus
            />
            <Button
              fullWidth
              disabled={!clientName.trim()}
              onClick={() => setStep(5)}
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 5 && selectedService && date && time && (
          <div className="space-y-5">
            <BookingSummaryTicket
              rows={[
                { label: 'Prestador', value: provider.businessName },
                { label: 'Serviço', value: selectedService.name },
                {
                  label: 'Data',
                  value: `${weekdayLabel(parseIsoDateLocal(date).getDay())}, ${formatDateBR(date)}`,
                },
                { label: 'Horário', value: time },
                { label: 'Cliente', value: clientName },
              ]}
              footerNote="O prestador será notificado pelo WhatsApp assim que você confirmar."
            />
            <Button fullWidth size="lg" onClick={handleConfirm} isLoading={isSubmitting}>
              Confirmar agendamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
