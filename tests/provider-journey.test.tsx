import { describe, it, expect } from 'vitest';
import { screen, within, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, WAIT } from './helpers';
import { notificationService } from '../src/services/notificationService';

async function goTo(user: ReturnType<typeof userEvent.setup>, linkName: string) {
  await user.click(screen.getByRole('link', { name: linkName }));
}

describe('Jornada do prestador', () => {
  it('cadastro → dashboard → serviços → horários → perfil → link → logout', async () => {
    const user = userEvent.setup();
    const router = renderApp('/cadastro');

    // ---------- Cadastro ----------
    await user.type(screen.getByLabelText('Nome'), 'Ana Souza');
    await user.type(screen.getByLabelText('E-mail'), 'ana@studio.com');
    await user.type(screen.getByLabelText('Senha'), 'segredo123');
    await user.type(screen.getByLabelText('Confirmar senha'), 'segredo123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    // ---------- Dashboard ----------
    expect(await screen.findByText(/Olá, Ana/, {}, WAIT)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    const servicesLabel = screen.getByText('Serviços cadastrados');
    expect(within(servicesLabel.parentElement!).getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Seu link de agendamento')).toBeInTheDocument();

    // ---------- Serviços: validação, criar, desativar, editar, excluir ----------
    await goTo(user, 'Serviços');
    expect(await screen.findByText('Corte masculino', {}, WAIT)).toBeInTheDocument();
    expect(screen.getByText('Corte + barba')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await user.click(await screen.findByRole('button', { name: 'Adicionar serviço' }));
    expect(await screen.findByText('Informe o nome do serviço.')).toBeInTheDocument();
    expect(screen.getByText('Informe um preço válido.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome do serviço'), 'Sobrancelha');
    await user.type(screen.getByLabelText('Preço (R$)'), '20,00');
    await user.clear(screen.getByLabelText('Duração (min)'));
    await user.type(screen.getByLabelText('Duração (min)'), '15');
    await user.click(screen.getByRole('button', { name: 'Adicionar serviço' }));
    expect(await screen.findByText('Sobrancelha', {}, WAIT)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*20,00/)).toBeInTheDocument();
    expect(screen.getByText('Serviço adicionado.')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Desativar Sobrancelha' }));
    expect(await screen.findByRole('switch', { name: 'Ativar Sobrancelha' }, WAIT)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Editar Sobrancelha' }));
    const priceField = await screen.findByLabelText('Preço (R$)');
    expect(priceField).toHaveValue('20');
    await user.clear(priceField);
    await user.type(priceField, '25');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText(/R\$\s*25,00/, {}, WAIT)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir Sobrancelha' }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByText('Sobrancelha')).not.toBeInTheDocument(), WAIT);

    // ---------- Horários: diferentes frequências, almoço, validação, persistência ----------
    await goTo(user, 'Horários');
    await screen.findByText('Segunda-feira', {}, WAIT);
    const monday = screen.getByTestId('availability-day-1');
    const interval = within(monday).getByLabelText('Intervalo entre horários');

    // expediente padrão 08:00–18:00 (600 min): nº de horários = ceil(600 / intervalo)
    for (const minutes of [5, 10, 15, 20, 25, 30, 45, 60, 90, 120]) {
      await user.selectOptions(interval, String(minutes));
      const expected = Math.ceil(600 / minutes);
      expect(
        within(monday).getByText(new RegExp(`^${expected} horário\\(s\\) gerado`))
      ).toBeInTheDocument();
    }
    // 25 min → 08:00, 08:25, 08:50…
    await user.selectOptions(interval, '25');
    expect(within(monday).getByLabelText('08:25')).toBeInTheDocument();
    expect(within(monday).getByLabelText('08:50')).toBeInTheDocument();
    await user.selectOptions(interval, '30');

    // almoço: 08:00–12:00 + 14:00–18:00
    let times = monday.querySelectorAll<HTMLInputElement>('input[type="time"]');
    fireEvent.change(times[1], { target: { value: '12:00' } });
    await user.click(within(monday).getByRole('button', { name: /Adicionar período/ }));
    times = monday.querySelectorAll<HTMLInputElement>('input[type="time"]');
    expect(times).toHaveLength(4);
    expect(times[2]).toHaveValue('12:00'); // novo período nasce válido (12:00–18:00)
    expect(times[3]).toHaveValue('18:00');
    fireEvent.change(times[2], { target: { value: '14:00' } });
    expect(within(monday).getByText(/^16 horário\(s\) gerado/)).toBeInTheDocument();
    expect(within(monday).queryByLabelText('12:00')).not.toBeInTheDocument();
    expect(within(monday).queryByLabelText('13:30')).not.toBeInTheDocument();
    expect(within(monday).getByLabelText('11:30')).toBeInTheDocument();
    expect(within(monday).getByLabelText('14:00')).toBeInTheDocument();

    // período inválido bloqueia o salvamento
    fireEvent.change(times[3], { target: { value: '13:00' } });
    expect(within(monday).getByText('O horário final precisa ser depois do horário inicial.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Corrija os horários antes de salvar.')).toBeInTheDocument();
    fireEvent.change(times[3], { target: { value: '18:00' } });
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Horários atualizados com sucesso.', {}, WAIT)).toBeInTheDocument();

    // dia fechado some com os campos; persistência ao navegar
    const sunday = screen.getByTestId('availability-day-0');
    expect(within(sunday).getByText('Fechado')).toBeInTheDocument();
    expect(sunday.querySelectorAll('input[type="time"]')).toHaveLength(0);
    await goTo(user, 'Serviços');
    await screen.findByText('Corte masculino', {}, WAIT);
    await goTo(user, 'Horários');
    const mondayAgain = await screen.findByTestId('availability-day-1', {}, WAIT);
    await waitFor(() => expect(within(mondayAgain).getByText(/^16 horário\(s\) gerado/)).toBeInTheDocument(), WAIT);

    // ---------- Perfil: edição, preview ao vivo, foto ----------
    await goTo(user, 'Perfil');
    const business = await screen.findByLabelText('Nome do estabelecimento', {}, WAIT);
    expect(business).toHaveValue('Barbearia Fulano');
    await user.clear(business);
    await user.type(business, 'Barbearia do Fulano');
    expect(screen.getByText('Barbearia do Fulano')).toBeInTheDocument(); // prévia atualiza na hora
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(fileInput, new File(['x'], 'foto.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByAltText('Foto de perfil').getAttribute('src')).toMatch(/^data:image\/png/), WAIT);
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Perfil atualizado com sucesso.', {}, WAIT)).toBeInTheDocument();

    // ---------- Link de agendamento ----------
    await goTo(user, 'Seu link');
    expect(await screen.findByText(/\/prestador\/fulano-barbearia$/, {}, WAIT)).toBeInTheDocument();
    const openLink = screen.getByRole('link', { name: /Abrir página/ });
    expect(openLink).toHaveAttribute('href', expect.stringMatching(/\/prestador\/fulano-barbearia$/));
    expect(openLink).toHaveAttribute('target', '_blank');
    await user.click(screen.getByRole('button', { name: /Copiar link/ }));
    expect(await screen.findByText('Link copiado!')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toMatch(/\/prestador\/fulano-barbearia$/);

    // ---------- Notificação em tempo real (toast + sino) ----------
    act(() => {
      notificationService.create({
        providerId: 'prov-1',
        clientName: 'Cliente Ao Vivo',
        serviceName: 'Barba',
        date: '2030-01-01',
        time: '10:00',
      });
    });
    expect(await screen.findByText('Novo agendamento!', {}, WAIT)).toBeInTheDocument();
    const bell = screen.getByRole('button', { name: 'Notificações' });
    expect(within(bell).getByText('1')).toBeInTheDocument();
    await user.click(bell);
    expect(await within(bell.parentElement!).findByText(/Cliente Ao Vivo — Barba/)).toBeInTheDocument();
    await waitFor(() => expect(within(bell).queryByText('1')).not.toBeInTheDocument());

    // ---------- Logout e proteção de rota ----------
    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Entrar' }, WAIT)).toBeInTheDocument();
    await act(async () => { await router.navigate('/dashboard/servicos'); });
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('login: valida senha curta, entra, e usuário logado não acessa /login', async () => {
    const user = userEvent.setup();
    const router = renderApp('/login');

    await user.type(screen.getByLabelText('Senha'), '123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Senha incorreta.', {}, WAIT)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');

    await user.clear(screen.getByLabelText('Senha'));
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/Olá, Fulano/, {}, WAIT)).toBeInTheDocument();

    await act(async () => { await router.navigate('/login'); });
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });

  it('cadastro: senhas diferentes não criam conta; rota privada exige login e volta ao destino', async () => {
    const user = userEvent.setup();
    const router = renderApp('/cadastro');
    await user.type(screen.getByLabelText('Nome'), 'Bia');
    await user.type(screen.getByLabelText('E-mail'), 'bia@x.com');
    await user.type(screen.getByLabelText('Senha'), 'abcdef');
    await user.type(screen.getByLabelText('Confirmar senha'), 'abcdeX');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/cadastro');

    await act(async () => { await router.navigate('/dashboard/horarios'); });
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    await user.type(screen.getByLabelText('Senha'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/horarios'), WAIT);
  });
});
