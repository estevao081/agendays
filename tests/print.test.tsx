import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, WAIT } from './helpers';

describe('Impressão da página do prestador', () => {
  it('botão Imprimir chama window.print e a página traz os QR Codes de agendamento e WhatsApp', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();
    renderApp('/prestador/fulano-barbearia');

    await screen.findByRole('heading', { name: 'Barbearia Fulano' }, WAIT);

    // os QR Codes existem no DOM (a regra `print:` os exibe só ao imprimir)
    expect(screen.getByRole('img', { name: 'QR Code para agendar um horário' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR Code para conversar no WhatsApp' })).toBeInTheDocument();
    // o QR aponta para o mesmo link que o prestador divulga
    expect(screen.getByText(`${window.location.origin}/prestador/fulano-barbearia`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Imprimir/ }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
