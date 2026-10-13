import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, format } from 'date-fns';
import { renderApp, WAIT } from './helpers';
import { authService } from '../src/services/authService';
import { registerAccount } from './factories';
import { appointmentService } from '../src/services/appointmentService';
import { serviceService } from '../src/services/serviceService';
import { buildSeries, canDelete, isRealized, summarizePeriods } from '../src/utils/earnings';
import type { Appointment } from '../src/types';

const appt = (date: string, time: string, price: number, id = `${date}-${time}-${price}`): Appointment => ({
  id, providerId: 'p', serviceId: 's', serviceName: 'Corte', clientName: 'C', date, time, price, createdAt: '',
});

// terça-feira, 29/09/2026, 15:00
const NOW = new Date(2026, 8, 29, 15, 0);

describe('Ganhos: regras de cálculo', () => {
  it('exemplo do pedido: 5 cortes de R$ 30 ontem = R$ 150 ao fim do dia', () => {
    // hoje é terça 29/09; ontem (segunda 28/09) tiveram 5 cortes de R$ 30
    const yesterday = ['09:00', '10:00', '11:00', '14:00', '16:00'].map((t) => appt('2026-09-28', t, 30));
    const days = buildSeries(yesterday, NOW, 'day');
    const y = days[days.length - 2];
    expect(y.from).toBe('2026-09-28');
    expect(y.realized).toBe(150);
    expect(y.realizedCount).toBe(5);
    expect(days.at(-1)!.realized).toBe(0); // hoje ainda sem atendimentos
    expect(summarizePeriods(yesterday, NOW).week.realized).toBe(150);
  });

  it('só conta como ganho depois que o horário passa; o resto é previsto', () => {
    const list = [appt('2026-09-29', '10:00', 35), appt('2026-09-29', '15:00', 25), appt('2026-09-29', '17:30', 55)];
    expect(isRealized(list[0], NOW)).toBe(true);
    expect(isRealized(list[1], NOW)).toBe(true); // exatamente agora
    expect(isRealized(list[2], NOW)).toBe(false);
    const { day } = summarizePeriods(list, NOW);
    expect(day).toMatchObject({ realized: 60, realizedCount: 2, upcoming: 55, upcomingCount: 1 });
  });

  it('dia, semana (seg–dom), mês e ano somam nos períodos certos', () => {
    const list = [
      appt('2026-09-29', '09:00', 10), // hoje (terça)
      appt('2026-09-28', '09:00', 20), // segunda: mesma semana
      appt('2026-09-27', '09:00', 40), // domingo: semana anterior, mesmo mês
      appt('2026-08-31', '09:00', 80), // mês anterior, mesmo ano
      appt('2025-12-31', '09:00', 160), // ano anterior
    ];
    const s = summarizePeriods(list, NOW);
    expect(s.day.realized).toBe(10);
    expect(s.week.realized).toBe(30);
    expect(s.week.from).toBe('2026-09-28');
    expect(s.week.to).toBe('2026-10-04');
    expect(s.month.realized).toBe(70);
    expect(s.year.realized).toBe(150);
  });

  it('séries têm o tamanho certo e terminam no período atual', () => {
    expect(buildSeries([], NOW, 'day')).toHaveLength(14);
    expect(buildSeries([], NOW, 'week')).toHaveLength(8);
    expect(buildSeries([], NOW, 'month')).toHaveLength(12);
    expect(buildSeries([], NOW, 'year')).toHaveLength(3);
    expect(buildSeries([], NOW, 'year').at(-1)!.label).toBe('2026');
  });

  it('só é possível excluir agendamentos de hoje em diante', () => {
    expect(canDelete({ date: '2026-09-28' }, NOW)).toBe(false);
    expect(canDelete({ date: '2026-09-29' }, NOW)).toBe(true);
    expect(canDelete({ date: '2026-10-05' }, NOW)).toBe(true);
  });
});

describe('Agendamentos: preço congelado e exclusão', () => {
  it('guarda preço e nome do serviço; editar o serviço depois não muda o histórico', async () => {
    const date = format(addDays(new Date(), 20), 'yyyy-MM-dd');
    const created = await appointmentService.create({ providerId: 'prov-1', serviceId: 'svc-2', clientName: 'Zé', date, time: '09:00' });
    expect(created).toMatchObject({ price: 25, serviceName: 'Barba' });

    await serviceService.update('svc-2', { price: 99 });
    const [saved] = (await appointmentService.listByProviderAndDate('prov-1', date)).filter((a) => a.id === created.id);
    expect(saved.price).toBe(25);
    await serviceService.update('svc-2', { price: 25 });
  });

  it('serviço inexistente é recusado (o preço nunca vem do cliente)', async () => {
    await expect(
      appointmentService.create({ providerId: 'prov-1', serviceId: 'nao-existe', clientName: 'X', date: '2030-01-01', time: '09:00' })
    ).rejects.toThrow('Serviço não encontrado.');
  });

  it('excluir libera o horário, avisa os ouvintes e não pode repetir', async () => {
    const date = format(addDays(new Date(), 25), 'yyyy-MM-dd');
    const input = { providerId: 'prov-1', serviceId: 'svc-1', clientName: 'Ana', date, time: '10:00' };
    const created = await appointmentService.create(input);
    let notified = 0;
    const off = appointmentService.onChange(() => notified++);

    await appointmentService.remove(created.id);
    expect(notified).toBe(1);
    expect((await appointmentService.listByProviderAndDate('prov-1', date)).some((a) => a.id === created.id)).toBe(false);
    await expect(appointmentService.create(input)).resolves.toBeTruthy(); // horário livre de novo
    await expect(appointmentService.remove(created.id)).rejects.toThrow('Agendamento não encontrado.');
    off();
  });
});

describe('Ganhos e agendamentos: interface', () => {
  it('prestador exclui um agendamento pela tela de Agendamentos', async () => {
    const user = userEvent.setup();
    const date = format(addDays(new Date(), 12), 'yyyy-MM-dd');
    await appointmentService.create({ providerId: 'prov-1', serviceId: 'svc-1', clientName: 'Cliente Faltou', date, time: '09:00' });
    await authService.login({ email: 'fulano@barbearia.com', password: '123456' });

    renderApp('/dashboard/agendamentos');
    expect(await screen.findByText('Cliente Faltou', {}, WAIT)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir agendamento de Cliente Faltou' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Cliente Faltou — Corte masculino/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Excluir agendamento' }));

    await waitFor(() => expect(screen.queryByText('Cliente Faltou')).not.toBeInTheDocument(), WAIT);
    expect(await screen.findByText('Agendamento excluído.', {}, WAIT)).toBeInTheDocument();
    expect(await appointmentService.listByProviderAndDate('prov-1', date)).toHaveLength(0);
  });

  it('cancelar a confirmação mantém o agendamento', async () => {
    const user = userEvent.setup();
    const date = format(addDays(new Date(), 13), 'yyyy-MM-dd');
    await appointmentService.create({ providerId: 'prov-1', serviceId: 'svc-1', clientName: 'Cliente Fica', date, time: '09:00' });
    await authService.login({ email: 'fulano@barbearia.com', password: '123456' });
    renderApp('/dashboard/agendamentos');
    await user.click(await screen.findByRole('button', { name: 'Excluir agendamento de Cliente Fica' }, WAIT));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Cliente Fica')).toBeInTheDocument();
  });

  it('dashboard de ganhos: 5 cortes de R$ 30 ontem aparecem como R$ 150 no dia, semana, mês e ano', async () => {
    const user = userEvent.setup();
    const account = await registerAccount({ name: 'Dona', businessName: 'Barbearia Nova' });
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
    const cuts = ['09:00', '10:00', '11:00', '14:00', '16:00'].map((time, i) => ({
      ...appt(yesterday, time, 30, `cut-${i}`), providerId: account.providerId,
    }));
    localStorage.setItem('agendasys:appointments:created', JSON.stringify(cuts));

    renderApp('/dashboard/ganhos');
    await screen.findByText('Ganhos por período', {}, WAIT);
    const money = (n: number) => new RegExp(`R\\$\\s*${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    // aba Dia: a linha de ontem mostra 5 atendimentos e R$ 150,00
    const rowFor = (label: string) => within(screen.getByTestId('earnings-table')).getByText(label).closest('tr')!;
    const yRow = rowFor(format(addDays(new Date(), -1), 'dd/MM'));
    expect(within(yRow).getByText('5')).toBeInTheDocument();
    expect(within(yRow).getByText(money(150))).toBeInTheDocument();

    // demais abas: o total das linhas é sempre R$ 150 (ontem cai em exatamente um período de cada)
    for (const tab of ['Semana', 'Mês', 'Ano']) {
      await user.click(screen.getByRole('tab', { name: tab }));
      const cells = within(screen.getByTestId('earnings-table')).getAllByRole('row').slice(1)
        .map((r) => within(r).getAllByRole('cell')[1].textContent!);
      const total = cells.reduce((sum, c) => sum + Number(c.replace(/[^\d,]/g, '').replace(',', '.') || 0), 0);
      expect(total).toBe(150);
    }
  });

  it('conta sem atendimentos mostra estado vazio e zeros', async () => {
    await registerAccount({ name: 'Nova', businessName: 'Sem Clientes' });
    renderApp('/dashboard/ganhos');
    expect(await screen.findByText('Ainda não há ganhos para mostrar', {}, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('earnings-day-value')).toHaveTextContent('R$');
  });
});
