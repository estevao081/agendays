import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { WAIT } from './helpers';

type U = ReturnType<typeof userEvent.setup>;

/** Preenche o cadastro pela interface, incluindo o código do WhatsApp (modo demonstração). */
export async function fillRegister(
  user: U,
  v: { name: string; business: string; email: string; cpf: string; phone: string; password?: string; verify?: boolean },
) {
  await user.type(screen.getByLabelText('Nome'), v.name);
  await user.type(screen.getByLabelText('Nome do estabelecimento'), v.business);
  await user.type(screen.getByLabelText('CPF ou CNPJ'), v.cpf);
  await user.type(screen.getByLabelText('WhatsApp'), v.phone);
  if (v.verify !== false) {
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    const hint = await screen.findByTestId('demo-otp', {}, WAIT);
    const code = hint.textContent!.match(/\d{6}/)![0];
    await user.type(screen.getByLabelText('Código recebido no WhatsApp'), code);
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    await screen.findByText('WhatsApp confirmado', {}, WAIT);
  }
  await user.type(screen.getByLabelText('E-mail'), v.email);
  await user.type(screen.getByLabelText('Senha'), v.password ?? 'segredo123');
  await user.type(screen.getByLabelText('Confirmar senha'), v.password ?? 'segredo123');
  await user.click(screen.getByRole('button', { name: 'Criar conta' }));
}
