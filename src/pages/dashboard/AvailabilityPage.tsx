import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { AvailabilityDayCard } from '../../components/dashboard';
import { Button, Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { availabilityService } from '../../services/availabilityService';
import type { AvailabilitySettings, DayAvailability, WeekDay } from '../../types';

// Exibimos segunda a domingo, embora dayOfWeek siga o padrão Date.getDay() (0 = domingo)
const DISPLAY_ORDER: WeekDay[] = [1, 2, 3, 4, 5, 6, 0];

function hasInvalidPeriods(day: DayAvailability): boolean {
  if (!day.enabled) return false;
  return day.periods.some((p) => p.start >= p.end);
}

export function AvailabilityPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.providerId) return;
    availabilityService.get(user.providerId).then((data) => {
      setSettings(data);
      setIsLoading(false);
    });
  }, [user?.providerId]);

  function updateDay(updated: DayAvailability) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            days: prev.days.map((d) => (d.dayOfWeek === updated.dayOfWeek ? updated : d)),
          }
        : prev
    );
  }

  async function handleSave() {
    if (!settings) return;

    const invalidDay = settings.days.find(hasInvalidPeriods);
    if (invalidDay) {
      showToast({
        message: 'Corrija os horários antes de salvar.',
        description: 'Existe um dia com horário final antes do inicial.',
        variant: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      await availabilityService.replaceAll(settings);
      showToast({ message: 'Horários atualizados com sucesso.', variant: 'success' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !settings) return <Spinner label="Carregando horários…" />;

  const orderedDays = DISPLAY_ORDER.map(
    (dow) => settings.days.find((d) => d.dayOfWeek === dow)!
  );

  return (
    <div className="space-y-5 pb-20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink-900">Horários</h2>
          <p className="text-sm text-ink-500">
            Configure os dias e horários em que você atende — os horários disponíveis para
            agendamento são gerados automaticamente.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {orderedDays.map((day) => (
          <AvailabilityDayCard key={day.dayOfWeek} day={day} onChange={updateDay} />
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur lg:pl-[calc(16rem+1rem)] lg:pr-6">
        <div className="mx-auto flex max-w-3xl justify-end lg:mx-0">
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="size-4" />
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
