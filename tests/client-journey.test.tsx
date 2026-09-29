import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, addMonths, format, isWeekend, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { renderApp, WAIT } from './helpers';
import { Calendar } from '../src/components/booking';
import { serviceService } from '../src/services/serviceService';
import { appointmentService } from '../src/services/appointmentService';
import { notificationService } from '../src/services/notificationService';
import { mockAppointments } from '../src/mocks/appointments';
import { parseIsoDateLocal } from '../src/utils/formatters';

type U = ReturnType<typeof userEvent.setup>;
const SLUG = '/prestador/fulano-barbearia';

const dayLabel = (iso: string) =>
  format(parseIsoDateLocal(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR });

/** Primeiro dia útil do próximo mês (sempre no futuro, sem agendamentos de horário tardio). */
function firstBusinessDayNextMonth(): string {
  let d = startOfMonth(addMonths(new Date(), 1));
  while (isWeekend(d)) d = addDays(d, 1);
  return format(d, 'yyyy-MM-dd');
}

/** Clica na data no calendário, avançando de mês se preciso. */
async function pickDate(user: U, iso: string) {
  for (let i = 0; i < 4; i++) {
    // ignora as células de outro mês (desabilitadas e com visibility:hidden no navegador real)
    const btn = screen.queryAllByRole('button', { name: dayLabel(iso) }).find((b) => !(b as HTMLButtonElement).disabled);
    if (btn) {
      await user.click(btn);
      return;
    }
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
  }
  throw new Error(`Data ${iso} não encontrada no calendário`);
}

async function bookUntilConfirmation(user: U, iso: string, time: string, name: string) {
  const router = renderApp({ pathname: `${SLUG}/agendar`, state: { serviceId: 'svc-2' } });
  await screen.findByText('Escolha a data', {}, WAIT);
  await pickDate(user, iso);
  await user.click(await screen.findByRole('button', { name: time }, WAIT));
  await user.type(await screen.findByLabelText('Seu nome'), name);
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText('Confirmação', {}, WAIT);
  return router;
}

describe('Página pública', () => {
  it('mostra perfil, serviços com preço e contatos', async () => {
    renderApp(SLUG);
    expect(await screen.findByRole('heading', { name: 'Barbearia Fulano' }, WAIT)).toBeInTheDocument();
    expect(screen.getByText('Fulano da Silva')).toBeInTheDocument();
    expect(screen.getByText(/Rua das Palmeiras/)).toBeInTheDocument();
    expect(screen.getByText('barbeariafulano')).toBeInTheDocument();
    expect(await screen.findByText('Corte masculino')).toBeInTheDocument();
    expect(screen.getByText('Corte + barba')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*35,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*55,00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conversar no WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/wa\.me\/5581991234567\?text=/)
    );
    expect(screen.getByRole('button', { name: 'Agendar horário' })).toBeInTheDocument();
  });

  it('não lista serviço desativado; slug inexistente mostra "não encontrada"', async () => {
    await serviceService.toggleActive('svc-2'); // desativa "Barba"
    try {
      renderApp(SLUG);
      await screen.findByText('Corte masculino', {}, WAIT);
      expect(screen.queryByText('Barba')).not.toBeInTheDocument();
    } finally {
      await serviceService.toggleActive('svc-2');
    }
    cleanup();
    renderApp('/prestador/nao-existe');
    expect(await screen.findByText('Página não encontrada', {}, WAIT)).toBeInTheDocument();
  });

  it('acesso direto à tela de sucesso (sem agendar) volta para a página do prestador', async () => {
    const router = renderApp(`${SLUG}/agendar/sucesso`);
    await waitFor(() => expect(router.state.location.pathname).toBe(SLUG), WAIT);
  });
});

describe('Fluxo de agendamento do cliente', () => {
  it('serviço → data → horário → nome → confirmar → sucesso (e prestador é notificado)', async () => {
    const user = userEvent.setup();
    const iso = firstBusinessDayNextMonth();
    renderApp(SLUG);

    await user.click(await screen.findByRole('button', { name: /Barba/ }, WAIT)); // "Barba" (não "Corte + barba")
    expect(await screen.findByText('Escolha a data', {}, WAIT)).toBeInTheDocument(); // serviço pré-selecionado

    await pickDate(user, iso);
    await user.click(await screen.findByRole('button', { name: '17:30' }, WAIT));

    const next = await screen.findByLabelText('Seu nome');
    const continueBtn = screen.getByRole('button', { name: 'Continuar' });
    expect(continueBtn).toBeDisabled(); // nome obrigatório
    await user.type(next, 'João Silva');
    expect(continueBtn).toBeEnabled();
    await user.click(continueBtn);

    expect(await screen.findByText('Confirmação', {}, WAIT)).toBeInTheDocument();
    const summary = screen.getByText('Prestador').closest('div')!.parentElement!;
    expect(within(summary).getByText('Barbearia Fulano')).toBeInTheDocument();
    expect(within(summary).getByText('Barba')).toBeInTheDocument();
    expect(within(summary).getByText('17:30')).toBeInTheDocument();
    expect(within(summary).getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText(/será notificado pelo WhatsApp/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    expect(await screen.findByRole('heading', { name: 'Agendamento realizado com sucesso!' }, WAIT)).toBeInTheDocument();
    expect(screen.getByText('Notificação enviada para o WhatsApp do prestador')).toBeInTheDocument();
    expect(screen.getByText(/Cliente: João Silva/)).toBeInTheDocument();

    const saved = await appointmentService.listByProviderAndDate('prov-1', iso);
    expect(saved.some((a) => a.clientName === 'João Silva' && a.time === '17:30' && a.status === 'agendado')).toBe(true);
    const notifs = notificationService.listByProvider('prov-1');
    expect(notifs[0]).toMatchObject({ clientName: 'João Silva', serviceName: 'Barba', time: '17:30', read: false });

    // o horário reservado agora aparece indisponível para o próximo cliente
    cleanup();
    renderApp({ pathname: `${SLUG}/agendar`, state: { serviceId: 'svc-1' } });
    await screen.findByText('Escolha a data', {}, WAIT);
    await pickDate(user, iso);
    expect(await screen.findByRole('button', { name: '17:30 — indisponível' }, WAIT)).toBeDisabled();
  });

  it('horários ocupados ficam desabilitados; nada fora do expediente (08:00–18:00, a cada 30 min)', async () => {
    const user = userEvent.setup();
    const busy = mockAppointments.find((a) => a.id === 'appt-3')!; // 09:00
    const busy2 = mockAppointments.find((a) => a.id === 'appt-4')!; // 11:30 (mesmo dia)
    renderApp({ pathname: `${SLUG}/agendar`, state: { serviceId: 'svc-1' } });
    await screen.findByText('Escolha a data', {}, WAIT);
    await pickDate(user, busy.date);
    await screen.findByText('Escolha o horário', {}, WAIT);

    expect(await screen.findByRole('button', { name: `${busy.time} — indisponível` }, WAIT)).toBeDisabled();
    expect(screen.getByRole('button', { name: `${busy2.time} — indisponível` })).toBeDisabled();
    expect(screen.getByRole('button', { name: '08:00' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '08:30' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '17:30' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '07:30' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '18:00' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /08:15/ })).not.toBeInTheDocument();
  });

  it('agendamento duplo: se o horário for ocupado durante a confirmação, avisa e volta para os horários', async () => {
    const user = userEvent.setup();
    const iso = firstBusinessDayNextMonth();
    await bookUntilConfirmation(user, iso, '17:00', 'Cliente Lento');

    // outra pessoa reserva o mesmo horário antes de confirmarmos
    await appointmentService.create({ providerId: 'prov-1', serviceId: 'svc-1', clientName: 'Mais Rápido', date: iso, time: '17:00' });
    await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    expect(await screen.findByText(/acabou de ser ocupado/, {}, WAIT)).toBeInTheDocument();
    expect(await screen.findByText('Escolha o horário', {}, WAIT)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '17:00 — indisponível' }, WAIT)).toBeDisabled();
    const all = await appointmentService.listByProviderAndDate('prov-1', iso);
    expect(all.filter((a) => a.time === '17:00')).toHaveLength(1);
  });

  it('serviço inexistente na URL volta para a escolha de serviço', async () => {
    renderApp({ pathname: `${SLUG}/agendar`, state: { serviceId: 'svc-999' } });
    expect(await screen.findByText('Escolha o serviço', {}, WAIT)).toBeInTheDocument();
  });

  it('horários que já passaram hoje ficam indisponíveis', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 15, 10)); // segunda, 05/10/2026 15:10
    try {
      const user = userEvent.setup();
      renderApp({ pathname: `${SLUG}/agendar`, state: { serviceId: 'svc-1' } });
      await screen.findByText('Escolha a data', {}, WAIT);
      await user.click(screen.getByRole('button', { name: '5 de outubro de 2026' }));
      expect(await screen.findByRole('button', { name: '08:00 — indisponível' }, WAIT)).toBeDisabled();
      expect(screen.getByRole('button', { name: '15:00 — indisponível' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '15:30' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Calendário', () => {
  it('bloqueia dias sem atendimento (fim de semana) e dias passados; não volta antes do mês atual', () => {
    const { container } = render(
      <Calendar selectedDate={null} onSelect={() => {}} isWeekdayEnabled={(d) => d >= 1 && d <= 5} />
    );
    const days = Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));
    expect(days.length % 7).toBe(0);
    days.forEach((btn, i) => {
      const col = i % 7; // 0 = domingo … 6 = sábado
      if (col === 0 || col === 6) expect(btn).toBeDisabled();
    });
    const todayIdx = days.findIndex((b) => b.getAttribute('aria-current') === 'date');
    expect(todayIdx).toBeGreaterThanOrEqual(0);
    days.slice(0, todayIdx).forEach((btn) => expect(btn).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();
    expect(screen.getByText(/ de \d{4}$/)).toBeInTheDocument(); // "outubro de 2026" (pt-BR)
  });
});
