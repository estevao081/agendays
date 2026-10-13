import { describe, it, expect } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, WAIT } from './helpers';
import { authService } from '../src/services/authService';
import { providerService } from '../src/services/providerService';
import { buildProviderSlug, slugify } from '../src/utils/slug';
import { makeCpf, registerAccount } from './factories';
import { fillRegister } from './registerForm';

describe('Cadastro e link único do prestador', () => {
  it('slugify remove acentos e símbolos; slug sempre termina com identificador aleatório', () => {
    expect(slugify('  Barbearia do João & Cia! ')).toBe('barbearia-do-joao-cia');
    expect(slugify('***')).toBe('');
    expect(buildProviderSlug('Barbearia do João', () => false)).toMatch(/^barbearia-do-joao-[a-z2-9]{6}$/);
    expect(buildProviderSlug('***', () => false)).toMatch(/^prestador-[a-z2-9]{6}$/);
  });

  it('gera outro identificador quando o slug já existe', () => {
    let calls = 0;
    const slug = buildProviderSlug('Loja', () => ++calls < 3);
    expect(calls).toBe(3);
    expect(slug).toMatch(/^loja-/);
  });

  it('cadastro pela tela cria prestador novo com link único, dashboard vazio e página pública funcionando', async () => {
    const user = userEvent.setup();
    const router = renderApp('/cadastro');
    await fillRegister(user, {
      name: 'Ana Souza', business: 'Studio Ana', email: 'ana@studio.com', cpf: makeCpf(901), phone: '(81) 99123-4567',
    });

    expect(await screen.findByText(/Olá, Ana/, {}, WAIT)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(screen.getByText('Serviços cadastrados').parentElement!).toHaveTextContent('0');

    const linkText = await screen.findByText(/\/prestador\/studio-ana-[a-z2-9]{6}$/);
    const slug = linkText.textContent!.split('/prestador/')[1];

    // o WhatsApp verificado vira o contato público; a página pública existe
    await act(async () => { await router.navigate(`/prestador/${slug}`); });
    expect(await screen.findByRole('heading', { name: 'Studio Ana' }, WAIT)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Conversar no WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('5581991234567'));
  });

  it('duas pessoas com o mesmo nome e o mesmo estabelecimento criam conta, cada uma com link próprio', async () => {
    const a = await registerAccount({ name: 'João Silva', businessName: 'Barbearia Central' });
    const b = await registerAccount({ name: 'João Silva', businessName: 'Barbearia Central' });
    const [pa, pb] = await Promise.all([providerService.getById(a.providerId), providerService.getById(b.providerId)]);
    expect(a.providerId).not.toBe(b.providerId);
    expect(pa!.slug).not.toBe(pb!.slug);
    expect(pa!.slug).toMatch(/^barbearia-central-/);
    expect(pb!.slug).toMatch(/^barbearia-central-/);
  });

  it('e-mail repetido é recusado; login volta para a conta certa e valida a senha', async () => {
    const created = await registerAccount({ email: 'Bia@X.com' });
    await expect(registerAccount({ email: 'bia@x.com' })).rejects.toThrow('Já existe uma conta com este e-mail.');

    await authService.logout();
    await expect(authService.login({ email: 'bia@x.com', password: 'errada1' })).rejects.toThrow('Senha incorreta.');
    const again = await authService.login({ email: 'bia@x.com', password: 'abcdef' });
    expect(again.providerId).toBe(created.providerId);
  });

  it('nome do estabelecimento é obrigatório e mudar o nome não altera o link', async () => {
    const user = userEvent.setup();
    renderApp('/cadastro');
    await user.type(screen.getByLabelText('Nome'), 'Caio');
    await user.type(screen.getByLabelText('E-mail'), 'caio@x.com');
    await user.type(screen.getByLabelText('Senha'), 'abcdef');
    await user.type(screen.getByLabelText('Confirmar senha'), 'abcdef');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Informe o nome do estabelecimento.')).toBeInTheDocument();

    const u = await registerAccount({ businessName: 'Loja do Caio' });
    const before = await providerService.getById(u.providerId);
    const after = await providerService.updateProfile(u.providerId, { businessName: 'Novo Nome', slug: 'hack' });
    expect(after.businessName).toBe('Novo Nome');
    expect(after.slug).toBe(before!.slug);
  });

  it('o login continua exigindo o mesmo e-mail digitado de outro jeito (Gmail com pontos e +tag)', async () => {
    const created = await registerAccount({ email: 'maria.silva@gmail.com' });
    await authService.logout();
    const again = await authService.login({ email: 'MariaSilva+loja@gmail.com', password: 'abcdef' });
    expect(again.providerId).toBe(created.providerId);
  });
});
