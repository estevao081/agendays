import { expect, test } from '@playwright/test';
import { expectCleanLayout, loginAsDemo, openPage } from './helpers';

/**
 * Verificação visual em navegador real, nos dois tamanhos de tela (projetos
 * `mobile` e `desktop` do playwright.config.ts). O jsdom dos testes de
 * interface não calcula posição nem sobreposição, então bugs como "o avatar
 * fica escondido atrás da faixa verde" ou "o menu ficou transparente" só
 * aparecem aqui.
 */

const PUBLIC_ROUTES = ['/prestador/fulano-barbearia', '/prestador/fulano-barbearia/agendar', '/login', '/cadastro'];

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/agendamentos',
  '/dashboard/ganhos',
  '/dashboard/servicos',
  '/dashboard/horarios',
  '/dashboard/perfil',
  '/dashboard/link',
  '/dashboard/assinatura',
];

test.describe('layout: nada coberto e sem rolagem horizontal', () => {
  for (const route of PUBLIC_ROUTES) {
    test(route, async ({ page }) => {
      await openPage(page, route);
      await expectCleanLayout(page);
    });
  }

  for (const route of DASHBOARD_ROUTES) {
    test(route, async ({ page }) => {
      await loginAsDemo(page);
      await openPage(page, route);
      await expectCleanLayout(page);
    });
  }
});

test.describe('página pública do prestador', () => {
  test('o avatar fica por cima da faixa verde (não escondido atrás dela)', async ({ page }) => {
    await openPage(page, '/prestador/fulano-barbearia');
    const avatar = page.getByRole('img', { name: 'Barbearia Fulano' });
    const box = (await avatar.boundingBox())!;

    // pontos da metade de cima do avatar, justamente a parte que a faixa chegou a cobrir
    for (const [fx, fy] of [[0.5, 0.2], [0.3, 0.3], [0.7, 0.3]]) {
      const topmostIsAvatar = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.getAttribute('alt') === 'Barbearia Fulano',
        [box.x + box.width * fx, box.y + box.height * fy],
      );
      expect(topmostIsAvatar, `ponto (${fx}, ${fy}) do avatar está coberto`).toBe(true);
    }
  });

  test('impressão: os links viram QR Codes e nada fica cortado', async ({ page }) => {
    await openPage(page, '/prestador/fulano-barbearia');
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('button', { name: /Imprimir/ })).toBeHidden();
    await expect(page.getByRole('link', { name: /WhatsApp/ })).toBeHidden();
    await expect(page.getByRole('button', { name: /Agendar horário/ })).toBeHidden();
    await expect(page.getByRole('img', { name: 'QR Code para agendar um horário' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'QR Code para conversar no WhatsApp' })).toBeVisible();

    await expectCleanLayout(page);
  });
});

test.describe('menu hambúrguer (mobile)', () => {
  test.skip(({ isMobile }) => !isMobile, 'o menu hambúrguer só existe na versão mobile');

  test('cobre a tela inteira e tem fundo opaco (não fica transparente)', async ({ page }) => {
    await loginAsDemo(page);
    await openPage(page, '/dashboard');
    await page.getByRole('button', { name: 'Abrir menu' }).click();

    const menu = page.getByRole('navigation', { name: 'Menu de navegação' });
    await expect(menu).toBeVisible();

    const viewportHeight = page.viewportSize()!.height;
    const box = (await menu.boundingBox())!;
    expect(box.height, 'o painel deve ocupar a altura toda da tela').toBeGreaterThanOrEqual(viewportHeight - 1);

    const background = await menu.evaluate((el) => getComputedStyle(el).backgroundColor);
    const alpha = Number(background.match(/rgba?\(([^)]+)\)/)?.[1].split(',')[3] ?? 1);
    expect(alpha, `fundo ${background} é transparente`).toBe(1);

    // em vários pontos do painel, o que está por cima é o próprio painel
    for (const y of [120, viewportHeight / 2, viewportHeight - 120]) {
      const insideMenu = await page.evaluate(
        (point) => !!document.elementFromPoint(40, point)?.closest('nav[aria-label="Menu de navegação"]'),
        y,
      );
      expect(insideMenu, `o painel não está por cima em y=${y}`).toBe(true);
    }
  });
});
