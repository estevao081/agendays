import { expect, type Page } from '@playwright/test';

export const DEMO_USER = { id: 'user-1', name: 'Fulano da Silva', email: 'fulano@barbearia.com', providerId: 'prov-1' };

/** Entra como a conta de demonstração sem passar pela tela de login. */
export async function loginAsDemo(page: Page): Promise<void> {
  await page.addInitScript((user) => localStorage.setItem('agendasys:auth-user', JSON.stringify(user)), DEMO_USER);
}

/**
 * Troca imagens externas (Unsplash…) por um quadrado cinza: o teste não depende
 * de internet e o layout é sempre o mesmo (foto lenta/quebrada muda o tamanho das coisas).
 */
export async function stubExternalImages(page: Page): Promise<void> {
  const placeholder = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#9aa3af"/></svg>';
  await page.route('**/*', (route) => {
    const request = route.request();
    const { hostname } = new URL(request.url());
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal && request.resourceType() === 'image') {
      return route.fulfill({ contentType: 'image/svg+xml', body: placeholder });
    }
    return route.continue();
  });
}

/** Abre a página e espera ela assentar (rede, carregamentos simulados, fontes), sem animações. */
export async function openPage(page: Page, path: string): Promise<void> {
  await stubExternalImages(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/Carregando/)).toHaveCount(0);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await page.evaluate(() => document.fonts.ready);
}

export interface CoverFinding {
  /** elemento que deveria estar visível/clicável */
  element: string;
  /** o que está por cima dele */
  coveredBy: string;
  /** ponto da tela (x,y) onde isso foi detectado */
  at: string;
}

/**
 * Roda DENTRO do navegador (precisa ser autocontida). Para cada botão, link,
 * campo e imagem inteiramente visível na tela, testa uma grade 3×3 de pontos e
 * vê quem está por cima. Se não for o próprio elemento (ou algo dentro/fora
 * dele na mesma "pilha"), ele está coberto — como o avatar que ficava escondido
 * atrás da faixa verde.
 *
 * Não contam como achado: camadas `fixed`/`sticky` (cabeçalho, barra de agendar,
 * toasts, modais), que cobrem de propósito, e um botão/link pequeno por cima de
 * uma foto (selo, como a câmera do avatar). Continuam sendo achados: um bloco
 * não interativo por cima de uma foto e um controle por cima de outro controle.
 */
function detectCoveredElements(): CoverFinding[] {
  const describe = (el: Element): string => {
    const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
    return `<${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}>${text ? ` "${text}"` : ''}`;
  };
  const isFixedOrSticky = (start: Element | null): boolean => {
    for (let n = start; n && n !== document.documentElement; n = n.parentElement) {
      const position = getComputedStyle(n).position;
      if (position === 'fixed' || position === 'sticky') return true;
    }
    return false;
  };

  /** Testa uma grade 3×3 dentro do elemento; devolve o primeiro ponto onde outra coisa está por cima. */
  const firstCoverOf = (el: Element, rect: DOMRect): CoverFinding | null => {
    for (const fy of [0.25, 0.5, 0.75]) {
      for (const fx of [0.25, 0.5, 0.75]) {
        const x = rect.left + rect.width * fx;
        const y = rect.top + rect.height * fy;
        const hit = document.elementFromPoint(x, y);
        if (!hit || hit === el || el.contains(hit) || hit.contains(el)) continue;
        if (isFixedOrSticky(hit)) continue; // sobreposição intencional
        // selo/atalho clicável sobre uma foto (ex.: botão da câmera no avatar) é design, não bug
        if (el.tagName === 'IMG' && hit.closest('button, a[href], [role="button"]')) continue;
        return { element: describe(el), coveredBy: describe(hit), at: `${Math.round(x)},${Math.round(y)}` };
      }
    }
    return null;
  };

  const found: CoverFinding[] = [];
  const candidates = document.querySelectorAll('button, a[href], input, select, textarea, img, [role="button"], [role="tab"], [role="switch"]');
  for (const el of candidates) {
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0 || style.pointerEvents === 'none') continue;
    if (el.closest('[aria-hidden="true"], [hidden]')) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    // só o que está inteiro na tela agora (a varredura rola a página para ver o resto)
    if (rect.top < 0 || rect.left < 0 || rect.bottom > innerHeight || rect.right > innerWidth) continue;

    const finding = firstCoverOf(el, rect);
    if (finding) found.push(finding);
  }
  return found;
}

export interface OverflowReport {
  pageOverflows: boolean;
  scrollWidth: number;
  clientWidth: number;
  /** elementos que passam da borda direita e não estão dentro de uma área com rolagem própria */
  offenders: string[];
}

/** Roda DENTRO do navegador (autocontida). A página não pode ter barra de rolagem horizontal. */
function detectHorizontalOverflow(): OverflowReport {
  const doc = document.documentElement;
  const report: OverflowReport = { pageOverflows: doc.scrollWidth > doc.clientWidth, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders: [] };
  if (!report.pageOverflows) return report;

  const clipsHorizontally = (start: Element | null): boolean => {
    for (let n = start; n && n !== document.body; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
    }
    return false;
  };
  // onde o elemento (ou o conteúdo que vaza dele, como um texto longo) termina na horizontal
  const endOf = (el: Element, rect: DOMRect): number =>
    el instanceof HTMLElement && el.scrollWidth > el.clientWidth ? Math.max(rect.right, rect.left + el.scrollWidth) : rect.right;

  const overflowing: { el: Element; end: number }[] = [];
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) continue;
    const end = endOf(el, rect);
    if (end <= doc.clientWidth + 1) continue;
    if (getComputedStyle(el).position === 'fixed' || clipsHorizontally(el.parentElement)) continue;
    overflowing.push({ el, end });
  }
  // só os mais internos: se um texto vaza, a lista não precisa repetir todos os "pais" dele
  const deepest = overflowing.filter((a) => !overflowing.some((b) => b !== a && a.el.contains(b.el)));
  for (const { el, end } of deepest.slice(0, 6)) {
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30);
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
    report.offenders.push(`<${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}> "${text}" termina em x=${Math.round(end)}`);
  }
  return report;
}

/** Rola a página inteira, de ponta a ponta, juntando tudo que está coberto em qualquer trecho. */
export async function scanForCoveredElements(page: Page): Promise<CoverFinding[]> {
  const viewportHeight = page.viewportSize()?.height ?? 800;
  const step = Math.floor(viewportHeight * 0.6);
  const found = new Map<string, CoverFinding>();

  for (let y = 0; ; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    for (const finding of await page.evaluate(detectCoveredElements)) found.set(`${finding.element}|${finding.coveredBy}`, finding);
    const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    if (y + viewportHeight >= totalHeight) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return [...found.values()];
}

/** Falha se algo estiver coberto por outro elemento ou se a página estourar na horizontal. */
export async function expectCleanLayout(page: Page): Promise<void> {
  const overflow = await page.evaluate(detectHorizontalOverflow);
  expect(
    overflow.pageOverflows,
    `A página tem rolagem horizontal (conteúdo ${overflow.scrollWidth}px numa tela de ${overflow.clientWidth}px). Culpados:\n  ${overflow.offenders.join('\n  ')}`,
  ).toBe(false);

  const covered = await scanForCoveredElements(page);
  expect(
    covered,
    `Elementos cobertos por outros:\n${covered.map((c) => `  ${c.element}\n    coberto por ${c.coveredBy} em (${c.at})`).join('\n')}`,
  ).toEqual([]);
}
