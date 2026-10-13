import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addDays, addMonths } from 'date-fns';
import { renderApp, WAIT } from './helpers';
import { authService } from '../src/services/authService';
import { billingService } from '../src/services/billingService';
import { providerService } from '../src/services/providerService';
import { makeCpf, registerAccount } from './factories';
import type { SubscriptionRecord } from '../src/types';

async function newAccount(referralCode?: string) {
  return (await registerAccount({ referralCode })).providerId;
}

describe('Cobrança: mês grátis, mensalidade e indicações', () => {
  it('conta nova ganha 1 mês grátis; depois vence; pagar custa R$ 50 e reativa', async () => {
    const id = await newAccount();
    const t0 = new Date();
    const s = await billingService.getSummary(id, t0);
    expect(s.status).toBe('trial');
    expect(s.hasAccess).toBe(true);
    expect(s.nextPrice).toBe(50);

    const afterTrial = addDays(addMonths(t0, 1), 1);
    expect((await billingService.getSummary(id, afterTrial)).status).toBe('expired');
    expect(await billingService.hasAccess(id, afterTrial)).toBe(false);

    const paid = await billingService.pay(id, afterTrial);
    expect(paid.status).toBe('active');
    expect(paid.payments).toHaveLength(1);
    expect(paid.payments[0]).toMatchObject({ amount: 50 });
    expect(paid.hasAccess).toBe(true);
  });

  it('pagar durante o mês grátis não perde dias: a mensalidade começa quando o teste acaba', async () => {
    const id = await newAccount();
    const t0 = new Date();
    await billingService.pay(id, t0);
    expect((await billingService.getSummary(id, t0)).status).toBe('trial');
    expect((await billingService.getSummary(id, addDays(addMonths(t0, 1), 1))).status).toBe('active');
    expect((await billingService.getSummary(id, addDays(addMonths(t0, 2), 1))).status).toBe('expired');
  });

  it('indicado que assina fica PENDENTE por 7 dias; só então rende 1 mês grátis (e só se cadastrar não conta)', async () => {
    const referrer = await newAccount();
    const code = (await billingService.getSummary(referrer)).referralCode;
    const friend = await newAccount(code);
    const t0 = new Date();

    let s = await billingService.getSummary(referrer, t0);
    expect(s).toMatchObject({ referralsTotal: 0, referralsPending: 0, freeMonthsBanked: 0 }); // só se cadastrou

    await billingService.pay(friend, t0);
    s = await billingService.getSummary(referrer, t0);
    expect(s).toMatchObject({ referralsTotal: 0, referralsPending: 1, freeMonthsBanked: 0 });
    expect(s.nextReferralConfirmAt).toBe(addDays(t0, 7).toISOString());

    s = await billingService.getSummary(referrer, addDays(t0, 6)); // ainda no prazo de desistência
    expect(s).toMatchObject({ referralsTotal: 0, referralsPending: 1, freeMonthsBanked: 0 });

    s = await billingService.getSummary(referrer, addDays(t0, 7)); // prazo cumprido
    expect(s).toMatchObject({ referralsTotal: 1, referralsPending: 0, freeMonthsBanked: 1, maxFreeMonths: 3 });
    expect(s.nextPrice).toBe(50); // não existe mais desconto: o prêmio é mês grátis

    await billingService.pay(friend, addDays(t0, 10)); // 2ª mensalidade do mesmo indicado não rende de novo
    expect((await billingService.getSummary(referrer, addDays(t0, 30))).freeMonthsBanked).toBe(1);
  });

  it('meses grátis ficam guardados e entram sozinhos, um por vez, quando o período atual termina', async () => {
    const referrer = await newAccount();
    const code = (await billingService.getSummary(referrer)).referralCode;
    const t0 = new Date();
    for (let i = 0; i < 2; i++) await billingService.pay(await newAccount(code), t0);

    // durante o mês grátis de boas-vindas os 2 meses ficam guardados
    let s = await billingService.getSummary(referrer, addDays(t0, 8));
    expect(s).toMatchObject({ status: 'trial', freeMonthsBanked: 2, referralsTotal: 2 });

    // fim do teste: o 1º mês grátis entra, sem pagar nada
    s = await billingService.getSummary(referrer, addDays(addMonths(t0, 1), 5));
    expect(s).toMatchObject({ status: 'active', hasAccess: true, freeMonthsBanked: 1, hasPaid: false });
    expect(s.payments).toHaveLength(1);
    expect(s.payments[0]).toMatchObject({ amount: 0, source: 'referral_credit' });

    // o 2º entra logo depois
    s = await billingService.getSummary(referrer, addDays(addMonths(t0, 2), 5));
    expect(s).toMatchObject({ status: 'active', freeMonthsBanked: 0 });
    expect(s.payments).toHaveLength(2);

    // acabaram os meses grátis: volta a precisar pagar
    expect((await billingService.getSummary(referrer, addDays(addMonths(t0, 3), 5))).status).toBe('expired');
  });

  it('o saldo guardado tem teto de 3 meses; ao usar um, uma nova indicação volta a render', async () => {
    const referrer = await newAccount();
    const code = (await billingService.getSummary(referrer)).referralCode;
    const t0 = new Date();
    const afterTrial = addMonths(t0, 1);

    for (let i = 0; i < 5; i++) await billingService.pay(await newAccount(code), t0); // 5 indicados confirmados
    let s = await billingService.getSummary(referrer, addDays(t0, 8));
    expect(s).toMatchObject({ referralsTotal: 5, freeMonthsBanked: 3 }); // só 3 viram mês grátis

    await billingService.pay(await newAccount(code), addDays(t0, 10)); // 6º, com o saldo cheio
    s = await billingService.getSummary(referrer, addDays(t0, 18));
    expect(s).toMatchObject({ referralsTotal: 6, freeMonthsBanked: 3 });

    s = await billingService.getSummary(referrer, addDays(afterTrial, 5)); // 1 mês é usado → abre espaço
    expect(s).toMatchObject({ status: 'active', freeMonthsBanked: 2 });

    await billingService.pay(await newAccount(code), addDays(afterTrial, 6)); // 7º agora rende
    s = await billingService.getSummary(referrer, addDays(afterTrial, 14));
    expect(s).toMatchObject({ referralsTotal: 7, freeMonthsBanked: 3 });
  });

  it('conta já vencida: o mês grátis vale a partir de quando foi ganho (não cobre o intervalo sem acesso)', async () => {
    const cpf = makeCpf(2024);
    await registerAccount({ document: cpf });
    const referrer = (await registerAccount({ document: cpf })).providerId; // nasce sem o mês de boas-vindas
    const code = (await billingService.getSummary(referrer)).referralCode;
    const t0 = new Date();
    await billingService.pay(await newAccount(code), t0);

    let s = await billingService.getSummary(referrer, addDays(t0, 6));
    expect(s).toMatchObject({ status: 'expired', referralsPending: 1 });

    s = await billingService.getSummary(referrer, addDays(t0, 8));
    expect(s).toMatchObject({ status: 'active', hasAccess: true, freeMonthsBanked: 0 });
    expect(new Date(s.payments[0].date).getTime()).toBe(addDays(t0, 7).getTime()); // começa no dia em que foi ganho

    expect((await billingService.getSummary(referrer, addDays(addMonths(t0, 1), 8))).status).toBe('expired');
  });

  it('meses grátis não contam como a 1ª mensalidade de quem foi indicado', async () => {
    const root = await newAccount();
    const rootCode = (await billingService.getSummary(root)).referralCode;
    const middle = await newAccount(rootCode); // indicado pela raiz
    const middleCode = (await billingService.getSummary(middle)).referralCode;
    const t0 = new Date();
    await billingService.pay(await newAccount(middleCode), t0); // o "middle" ganha 1 mês grátis

    const afterTrial = addMonths(t0, 1);
    const s = await billingService.getSummary(middle, addDays(afterTrial, 1)); // o mês grátis já entrou
    expect(s).toMatchObject({ hasPaid: false });
    expect(s.payments[0].source).toBe('referral_credit');
    expect((await billingService.getSummary(root, addDays(afterTrial, 1))).referralsPending).toBe(0);

    await billingService.pay(middle, addDays(afterTrial, 2)); // agora sim, a 1ª mensalidade de verdade
    expect((await billingService.getSummary(root, addDays(afterTrial, 2))).referralsPending).toBe(1);
  });

  it('registros gravados pela regra antiga (ano grátis) continuam funcionando', async () => {
    const id = await newAccount();
    const list = JSON.parse(localStorage.getItem('agendasys:subscriptions')!) as Record<string, unknown>[];
    const rec = list.find((r) => r.providerId === id)!;
    delete rec.freeMonthCredits;
    rec.freeUntil = addMonths(new Date(), 12).toISOString();
    rec.trialEndsAt = addDays(new Date(), -1).toISOString();
    localStorage.setItem('agendasys:subscriptions', JSON.stringify(list));

    const s = await billingService.getSummary(id);
    expect(s).toMatchObject({ status: 'active', hasAccess: true, freeMonthsBanked: 0 });
  });

  it('código de indicação inexistente impede o cadastro', async () => {
    await expect(registerAccount({ referralCode: 'ZZZZZZ' })).rejects.toThrow('Código de indicação inválido.');
  });
});

describe('Cobrança: interface', () => {
  function expireTrial(providerId: string) {
    const list = JSON.parse(localStorage.getItem('agendasys:subscriptions')!) as SubscriptionRecord[];
    const rec = list.find((r) => r.providerId === providerId)!;
    rec.trialEndsAt = addDays(new Date(), -1).toISOString();
    localStorage.setItem('agendasys:subscriptions', JSON.stringify(list));
  }

  it('assinatura vencida bloqueia painel e página pública', async () => {
    const id = await newAccount();
    const { slug } = (await providerService.getById(id))!;
    expireTrial(id);

    const router = renderApp('/dashboard/servicos');
    expect(await screen.findByText('Sua assinatura venceu. Reative para voltar a receber agendamentos.', {}, WAIT)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard/assinatura');

    const pub = renderApp(`/prestador/${slug}`);
    expect(await screen.findByText('Agendamento indisponível', {}, WAIT)).toBeInTheDocument();
    expect(pub.state.location.pathname).toBe(`/prestador/${slug}`);
  });

  it('página de assinatura: mostra preço, paga e reativa o painel', async () => {
    const user = userEvent.setup();
    const id = await newAccount();
    expireTrial(id);
    const router = renderApp('/dashboard/assinatura');

    expect(await screen.findByTestId('next-price', {}, WAIT)).toHaveTextContent('R$');
    expect(screen.getByTestId('free-months')).toHaveTextContent('Meses grátis guardados: 0 de 3');
    await user.click(screen.getByRole('button', { name: /Reativar assinatura/ }));
    await waitFor(() => expect(screen.getByTestId('subscription-status-text')).toHaveTextContent(/Assinatura ativa até/), WAIT);
    expect(await screen.findByText('Pagamento registrado.', {}, WAIT)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Visão geral' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'), WAIT);
    expect(await screen.findByText(/Aqui está o resumo/, {}, WAIT)).toBeInTheDocument();
  });

  it('indicação em confirmação aparece para o indicador', async () => {
    const referrer = await registerAccount();
    const code = (await billingService.getSummary(referrer.providerId)).referralCode;
    const friend = await registerAccount({ referralCode: code });
    await billingService.pay(friend.providerId);

    await authService.login({ email: referrer.email, password: 'abcdef' });
    renderApp('/dashboard/assinatura');
    expect(await screen.findByTestId('referral-pending', {}, WAIT)).toHaveTextContent('1 indicação(ões) em confirmação');
    expect(screen.getByTestId('free-months')).toHaveTextContent('Meses grátis guardados: 0 de 3');
  });

  it('indicação confirmada aparece como mês grátis guardado; com o saldo cheio avisa do limite', async () => {
    const referrer = await registerAccount();
    const code = (await billingService.getSummary(referrer.providerId)).referralCode;
    const friend = await registerAccount({ referralCode: code });
    await billingService.pay(friend.providerId);

    // o indicado pagou há 8 dias: o prazo de confirmação já passou
    const list = JSON.parse(localStorage.getItem('agendasys:subscriptions')!) as SubscriptionRecord[];
    const rec = list.find((r) => r.providerId === referrer.providerId)!;
    rec.referralsPending![0].paidAt = addDays(new Date(), -8).toISOString();
    localStorage.setItem('agendasys:subscriptions', JSON.stringify(list));

    await authService.login({ email: referrer.email, password: 'abcdef' });
    renderApp('/dashboard/assinatura');
    expect(await screen.findByTestId('free-months', {}, WAIT)).toHaveTextContent('Meses grátis guardados: 1 de 3');
    expect(screen.getByTestId('referrals-total')).toHaveTextContent('1 indicação confirmada');
    expect(screen.getByTestId('banked-note')).toHaveTextContent(/Entram automaticamente quando o período atual terminar/);
    expect(screen.queryByTestId('bank-full')).not.toBeInTheDocument();
    expect(screen.getByTestId('next-price')).toHaveTextContent('R$ 50,00'); // sem desconto
  });

  it('saldo cheio (3 meses) mostra o aviso de limite', async () => {
    const owner = await registerAccount();
    const list = JSON.parse(localStorage.getItem('agendasys:subscriptions')!) as SubscriptionRecord[];
    list.find((r) => r.providerId === owner.providerId)!.freeMonthCredits = [1, 2, 3].map((d) => addDays(new Date(), d).toISOString());
    localStorage.setItem('agendasys:subscriptions', JSON.stringify(list));

    renderApp('/dashboard/assinatura');
    expect(await screen.findByTestId('free-months', {}, WAIT)).toHaveTextContent('Meses grátis guardados: 3 de 3');
    expect(screen.getByTestId('bank-full')).toHaveTextContent(/limite de 3 meses/);
  });
});
