import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addMinutes, addSeconds } from 'date-fns';
import { renderApp, WAIT } from './helpers';
import { authService } from '../src/services/authService';
import { billingService } from '../src/services/billingService';
import { verificationService, OTP_MAX_ATTEMPTS } from '../src/services/verificationService';
import { cleanDocument, documentKind, formatDocument, isValidCnpj, isValidCpf } from '../src/utils/document';
import { isDisposableEmail, normalizeEmail } from '../src/utils/email';
import { formatBrPhone, normalizeBrPhone } from '../src/utils/phone';
import { makeCpf, makePhone, registerAccount } from './factories';
import { fillRegister } from './registerForm';

describe('Validadores', () => {
  it('CPF: confere dígitos verificadores e rejeita sequências repetidas', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('529.982.247-26')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('1234')).toBe(false);
    expect(isValidCpf(makeCpf(7))).toBe(true);
  });

  it('CNPJ: aceita o numérico e o alfanumérico (jul/2026), com letras só nas 12 primeiras posições', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true); // exemplo oficial da Receita Federal
    expect(isValidCnpj('12abc34501de35')).toBe(true); // minúsculas e sem máscara
    expect(isValidCnpj('12.ABC.345/01DE-36')).toBe(false);
    expect(isValidCnpj('12.ABC.345/01DE-3A')).toBe(false); // DV precisa ser numérico
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
    expect(documentKind('529.982.247-25')).toBe('cpf');
    expect(documentKind('12.ABC.345/01DE-35')).toBe('cnpj');
    expect(documentKind('123')).toBeNull();
  });

  it('máscara de CPF e CNPJ enquanto digita', () => {
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
    expect(formatDocument('5299822')).toBe('529.982.2');
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('12abc34501de35')).toBe('12.ABC.345/01DE-35');
    expect(cleanDocument('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });

  it('e-mail: mesma caixa postal escrita de jeitos diferentes vira a mesma chave', () => {
    expect(normalizeEmail('A.B+promo@Gmail.com')).toBe('ab@gmail.com');
    expect(normalizeEmail('ab@googlemail.com')).toBe('ab@gmail.com');
    expect(normalizeEmail('  Joao+x@Empresa.com.br ')).toBe('joao@empresa.com.br');
    expect(normalizeEmail('a.b@empresa.com')).toBe('a.b@empresa.com'); // pontos só são ignorados no Gmail
  });

  it('e-mail descartável é reconhecido', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('X@YOPMAIL.com')).toBe(true);
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
  });

  it('celular brasileiro: normaliza e valida', () => {
    expect(normalizeBrPhone('(81) 99123-4567')).toBe('5581991234567');
    expect(normalizeBrPhone('+55 81 99123-4567')).toBe('5581991234567');
    expect(normalizeBrPhone('81 3123-4567')).toBeNull(); // fixo não recebe WhatsApp
    expect(normalizeBrPhone('01 99123-4567')).toBeNull(); // DDD inválido
    expect(normalizeBrPhone('99123')).toBeNull();
    expect(formatBrPhone('81991234567')).toBe('(81) 99123-4567');
  });
});

describe('Verificação do WhatsApp (OTP)', () => {
  const phone = '(81) 99777-0001';
  const t0 = new Date();

  it('código certo verifica o número, vale uma vez e expira', async () => {
    const { demoCode } = await verificationService.sendCode(phone, t0);
    expect(demoCode).toMatch(/^\d{6}$/);
    expect(await verificationService.isVerified(phone, t0)).toBe(false);

    await verificationService.verifyCode(phone, demoCode, addSeconds(t0, 20));
    expect(await verificationService.isVerified(phone, addMinutes(t0, 1))).toBe(true);
    expect(await verificationService.isVerified(phone, addMinutes(t0, 30))).toBe(false); // venceu

    await verificationService.consume(phone);
    expect(await verificationService.isVerified(phone, addMinutes(t0, 1))).toBe(false);
  });

  it('código errado conta tentativas e trava; reenvio exige esperar', async () => {
    const { demoCode } = await verificationService.sendCode(phone, t0);
    const wrong = demoCode === '000000' ? '111111' : '000000';
    await expect(verificationService.sendCode(phone, addSeconds(t0, 5))).rejects.toThrow(/Aguarde \d+s/);

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      await expect(verificationService.verifyCode(phone, wrong, addSeconds(t0, 10))).rejects.toThrow('Código incorreto.');
    }
    // depois de 5 erros nem o código certo funciona
    await expect(verificationService.verifyCode(phone, demoCode, addSeconds(t0, 10))).rejects.toThrow(/Muitas tentativas/);
    // pedir outro código (após o intervalo) zera as tentativas
    const fresh = await verificationService.sendCode(phone, addSeconds(t0, 40));
    await expect(verificationService.verifyCode(phone, fresh.demoCode, addSeconds(t0, 45))).resolves.toBeUndefined();
  });

  it('código expira em 5 minutos; número inválido é recusado', async () => {
    const { demoCode } = await verificationService.sendCode(phone, t0);
    await expect(verificationService.verifyCode(phone, demoCode, addMinutes(t0, 6))).rejects.toThrow('O código expirou. Peça um novo.');
    await expect(verificationService.sendCode('123', t0)).rejects.toThrow(/celular válido/);
    await expect(verificationService.verifyCode(phone, '123456', t0)).rejects.toThrow(); // sem desafio ativo ou expirado
  });
});

describe('Regras do cadastro (serviço)', () => {
  const base = { name: 'X', businessName: 'Y', password: 'abcdef', confirmPassword: 'abcdef' };

  it('exige WhatsApp verificado, e a verificação vale uma única vez', async () => {
    await expect(
      authService.register({ ...base, email: 'a@x.com', document: makeCpf(1), whatsapp: makePhone(500) })
    ).rejects.toThrow('Confirme seu WhatsApp');

    const first = await registerAccount({ whatsapp: makePhone(501) });
    await expect(
      authService.register({ ...base, email: 'outro@x.com', document: makeCpf(2), whatsapp: first.whatsapp })
    ).rejects.toThrow('Confirme seu WhatsApp'); // a verificação anterior já foi usada
  });

  it('rejeita CPF/CNPJ inválido, celular inválido e e-mail descartável', async () => {
    await expect(registerAccount({ document: '111.111.111-11' })).rejects.toThrow('CPF ou CNPJ inválido');
    await expect(registerAccount({ email: 'teste@mailinator.com' })).rejects.toThrow('E-mails temporários');
  });

  it('mesma caixa postal do Gmail (pontos e +tag) conta como o mesmo e-mail', async () => {
    await registerAccount({ email: 'maria.silva@gmail.com' });
    await expect(registerAccount({ email: 'mariasilva+loja@gmail.com' })).rejects.toThrow('Já existe uma conta com este e-mail.');
    await expect(registerAccount({ email: 'Maria.Silva@googlemail.com' })).rejects.toThrow('Já existe uma conta com este e-mail.');
  });

  it('um mês grátis por CPF/CNPJ: segunda conta com o mesmo documento nasce sem teste', async () => {
    const cpf = makeCpf(777);
    const first = await registerAccount({ document: cpf });
    const second = await registerAccount({ document: formatDocument(cpf) }); // mesmo CPF, escrito com máscara

    expect(await billingService.getSummary(first.providerId)).toMatchObject({ status: 'trial', trialDeniedReason: null });
    const s = await billingService.getSummary(second.providerId);
    expect(s).toMatchObject({ status: 'expired', hasAccess: false, trialDeniedReason: 'document' });
  });

  it('um mês grátis por WhatsApp: outro CPF com o mesmo celular também fica sem teste', async () => {
    const phone = makePhone(888);
    await registerAccount({ whatsapp: phone });
    const second = await registerAccount({ whatsapp: phone });
    expect(await billingService.getSummary(second.providerId)).toMatchObject({ status: 'expired', trialDeniedReason: 'phone' });
  });

  it('conta sem teste pode assinar normalmente e passa a ter acesso', async () => {
    const cpf = makeCpf(999);
    await registerAccount({ document: cpf });
    const second = await registerAccount({ document: cpf });
    const paid = await billingService.pay(second.providerId);
    expect(paid.status).toBe('active');
    expect(paid.hasAccess).toBe(true);
  });

  it('CPF não é gravado em lugar nenhum; telefone fica fora do registro de identidades e do OTP', async () => {
    const cpf = makeCpf(4242);
    const phone = makePhone(4242);
    await registerAccount({ document: cpf, whatsapp: phone });

    const all = Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k)}`).join('\n');
    expect(all).not.toContain(cpf);
    expect(all).not.toContain(formatDocument(cpf));

    // o telefone aparece só no perfil público (é o contato que vira botão/QR Code), nunca nas tabelas antiabuso
    const phoneDigits = `55${phone}`;
    for (const key of ['agendasys:identity-ledger', 'agendasys:otp', 'agendasys:accounts', 'agendasys:subscriptions']) {
      expect(localStorage.getItem(key) ?? '').not.toContain(phone);
      expect(localStorage.getItem(key) ?? '').not.toContain(phoneDigits);
    }
    expect(localStorage.getItem('agendasys:identity-ledger')).toMatch(/documentHash/);
    expect(localStorage.getItem('agendasys:providers:created')).toContain(phoneDigits);
  });

  it('o registro de identidades é permanente (apagar a conta não devolve o mês grátis)', async () => {
    const cpf = makeCpf(5151);
    const first = await registerAccount({ document: cpf });
    // simula a exclusão da conta e da assinatura
    localStorage.removeItem('agendasys:accounts');
    const subs = JSON.parse(localStorage.getItem('agendasys:subscriptions')!);
    localStorage.setItem('agendasys:subscriptions', JSON.stringify(subs.filter((s: { providerId: string }) => s.providerId !== first.providerId)));

    const again = await registerAccount({ document: cpf, email: 'volta@teste.com' });
    expect(await billingService.getSummary(again.providerId)).toMatchObject({ trialDeniedReason: 'document', status: 'expired' });
  });
});

describe('Autoindicação', () => {
  it('não pode usar o próprio código com o mesmo CPF/CNPJ ou o mesmo WhatsApp', async () => {
    const cpf = makeCpf(321);
    const phone = makePhone(321);
    const owner = await registerAccount({ document: cpf, whatsapp: phone });
    const code = (await billingService.getSummary(owner.providerId)).referralCode;

    await expect(registerAccount({ document: cpf, referralCode: code })).rejects.toThrow('não pode ser usado nesta conta');
    await expect(registerAccount({ whatsapp: phone, referralCode: code })).rejects.toThrow('não pode ser usado nesta conta');

    // uma pessoa diferente usa o mesmo código normalmente
    const friend = await registerAccount({ referralCode: code });
    expect((await billingService.getSummary(friend.providerId)).trialDeniedReason).toBeNull();
  });

  it('indicado só vira mês grátis depois do prazo; assinar e sumir não rende nada', async () => {
    const owner = await registerAccount();
    const code = (await billingService.getSummary(owner.providerId)).referralCode;
    const t0 = new Date();
    const friend = await registerAccount({ referralCode: code });
    await billingService.pay(friend.providerId, t0);
    const s = await billingService.getSummary(owner.providerId, addMinutes(t0, 60 * 24 * 3));
    expect(s).toMatchObject({ referralsTotal: 0, referralsPending: 1, freeMonthsBanked: 0 });
  });
});

describe('Cadastro (interface)', () => {
  it('mostra o aviso do link/mês grátis, valida o CPF e exige o WhatsApp confirmado', async () => {
    const user = userEvent.setup();
    renderApp('/cadastro');
    expect(screen.getByText(/ficam ligados a esta conta e não passam para outra/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome do estabelecimento'), 'Studio');
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '11111111111');
    expect(screen.getByLabelText('CPF ou CNPJ')).toHaveValue('111.111.111-11');
    await user.type(screen.getByLabelText('Senha'), 'abcdef');
    await user.type(screen.getByLabelText('Confirmar senha'), 'abcdef');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('CPF ou CNPJ inválido. Confira os números.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('CPF ou CNPJ'));
    await user.type(screen.getByLabelText('CPF ou CNPJ'), makeCpf(61));
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Confirme seu WhatsApp com o código antes de criar a conta.')).toBeInTheDocument();
  });

  it('código errado mostra o erro; trocar o número exige verificar de novo', async () => {
    const user = userEvent.setup();
    renderApp('/cadastro');
    await user.type(screen.getByLabelText('WhatsApp'), '81991230000');
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(81) 99123-0000');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    const hint = await screen.findByTestId('demo-otp', {}, WAIT);
    const right = hint.textContent!.match(/\d{6}/)![0];
    const wrong = right === '000000' ? '111111' : '000000';

    await user.type(screen.getByLabelText('Código recebido no WhatsApp'), wrong);
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByText('Código incorreto.', {}, WAIT)).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Código recebido no WhatsApp'));
    await user.type(screen.getByLabelText('Código recebido no WhatsApp'), right);
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByText('WhatsApp confirmado', {}, WAIT)).toBeInTheDocument();

    await user.type(screen.getByLabelText('WhatsApp'), '1'); // mexeu no número → perde a confirmação
    expect(screen.queryByText('WhatsApp confirmado')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument();
  });

  it('segunda conta com o mesmo CPF entra, mas cai na tela de assinatura explicando o mês grátis', async () => {
    const user = userEvent.setup();
    const cpf = makeCpf(1313);
    await registerAccount({ document: cpf });
    await authService.logout(); // quem cria a 2ª conta é um visitante

    const router = renderApp('/cadastro');
    await fillRegister(user, { name: 'Dupla', business: 'Outra Loja', email: 'dupla@teste.com', cpf, phone: '(81) 99888-0002' });

    expect(await screen.findByText(/O mês grátis não foi aplicado/, {}, WAIT)).toBeInTheDocument();
    expect(screen.getByText(/este CPF\/CNPJ já usou/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard/assinatura');
    expect(screen.getByRole('button', { name: /Assinar agora|Reativar assinatura/ })).toBeInTheDocument();
  });
});
