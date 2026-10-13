# agendasys — frontend mockado de agendamento para prestadores de serviço

Frontend em **React + TypeScript + Vite + Tailwind CSS v4 + React Router**, 100% com dados mockados
(sem backend), organizado para que a troca por uma API real seja feita **só dentro de `src/services/`**.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # type-check + build de produção
npm run lint     # oxlint
npm test         # testes de interface/serviços (Vitest + Testing Library) + regras de negócio
npm run test:ui  # só os testes de interface (Vitest + Testing Library)
npm run test:rules # só as regras de negócio
npm run test:visual # verificação visual em navegador real (Playwright); 1ª vez: npx playwright install chromium
```

### Verificação visual (Playwright)

Os testes de interface rodam em jsdom, que **não calcula posição nem sobreposição**. Por isso existe `e2e/`, que abre o
app num Chromium de verdade (celular 390×844 e desktop 1280×800) e confere:

- **Nada coberto por outra coisa:** para cada botão, link, campo e imagem visível, testa uma grade de pontos e vê quem
  está por cima (foi assim que o avatar escondido atrás da faixa verde teria sido pego). A página é rolada de ponta a
  ponta. Camadas `fixed`/`sticky` (cabeçalho, barra de agendar, toasts, modais) e botões pequenos sobre uma foto (selo
  da câmera do avatar) são sobreposição intencional e não contam.
- **Sem rolagem horizontal**, apontando qual elemento estoura (ex.: `<p.text-3xl> "R$ 21.110,00" termina em x=420`).
- **Menu hambúrguer:** painel com a altura da tela inteira e fundo opaco.
- **Impressão:** os links viram QR Codes e nada fica cortado.

Cobre as páginas públicas e todas as telas do painel. As imagens externas são trocadas por um quadrado cinza, então o
teste não depende de internet. Falhas geram uma captura de tela em `node_modules/.cache/playwright/`.
Como em qualquer teste, só vale se falhar quando o bug volta: os 3 bugs visuais deste projeto (avatar, menu, estouro de
largura) foram reintroduzidos de propósito e a suíte os detectou.


Login de demonstração: qualquer e-mail **não cadastrado** + senha com 6+ caracteres (entra na conta de exemplo). E-mails
criados em `/cadastro` entram na própria conta, com a senha cadastrada.
Página pública de exemplo: `/prestador/fulano-barbearia`

## Rotas

| Rota | Descrição |
| --- | --- |
| `/login`, `/cadastro`, `/esqueci-senha` | Autenticação mockada (só para visitantes). `/cadastro?ref=CODIGO` preenche o código de indicação |
| `/dashboard` | Visão geral, próximos agendamentos e link de agendamento |
| `/dashboard/agendamentos` | Todos os agendamentos de hoje em diante; **excluir** quando o cliente avisa que não vem |
| `/dashboard/ganhos` | Ganhos por **dia, semana, mês e ano** (realizado × previsto), gráfico e tabela |
| `/dashboard/assinatura` | Plano, pagamento (simulado), código/link de indicação e histórico |
| `/dashboard/servicos` | CRUD de serviços |
| `/dashboard/horarios` | Dias, períodos, intervalo entre horários e pré-visualização das vagas |
| `/dashboard/perfil` | Perfil + prévia da página pública |
| `/dashboard/link` | Copiar / abrir / compartilhar o link |
| `/prestador/:slug` | Página pública do prestador (sem login). Botão **Imprimir**: na impressão os links viram QR Codes |
| `/prestador/:slug/agendar` | Fluxo: serviço → data → horário → nome → confirmação |
| `/prestador/:slug/agendar/sucesso` | Confirmação + simulação da notificação de WhatsApp |

## Estrutura

```
src/
  components/  ui/ (Button, Input, Modal, Switch…)  layout/  booking/  dashboard/
  pages/       auth/  dashboard/  public/
  routes/      AppRoutes, PrivateRoute, GuestRoute
  contexts/    AuthContext, ToastContext
  hooks/       useAuth, useToast, useDashboardOverview, useProviderNotifications…
  services/    ← ÚNICA camada que conhece "de onde vêm os dados"
  mocks/       dados fictícios usados pelos services
  types/       contratos (Provider, Service, Appointment, DayAvailability…)
  utils/       slotGenerator (regra de horários), formatters
tests/         testes das regras de negócio
```

## Trocando os mocks por uma API real

Componentes e páginas **nunca** acessam `mocks/`. Todo acesso passa por `services/`, cujas funções já
retornam `Promise<T>` com a mesma forma de uma chamada HTTP. Para integrar, reescreva apenas o corpo:

| Service | Sugestão de endpoint |
| --- | --- |
| `authService.login / register / logout` | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout` |
| `providerService.getBySlug / updateProfile` | `GET /providers/:slug`, `PATCH /providers/:id` |
| `serviceService.*` | `GET/POST /providers/:id/services`, `PATCH/DELETE /services/:id` |
| `availabilityService.get / replaceAll` | `GET/PUT /providers/:id/availability` |
| `billingService.*` | `GET /providers/:id/subscription`, `POST /providers/:id/subscription/payments` (+ webhook do gateway) |
| `appointmentService.create / listByProviderAndDate / remove` | `POST /appointments`, `GET /providers/:id/appointments?date=`, `DELETE /appointments/:id` |
| `whatsappNotificationService` | Chamada ao backend, que dispara a mensagem via API de WhatsApp (Meta Cloud API, Twilio…) |
| `notificationService` | WebSocket / SSE / push no lugar do `localStorage` |

> **Importante (antiabuso):** nada disso protege de verdade se rodar só no navegador. Em produção, **todas** estas regras
> ficam no servidor: documento e telefone com **HMAC-SHA-256 + segredo do servidor** (um CPF tem só ~10⁹ combinações;
> SHA-256 puro, como neste mock, é quebrável por força bruta), limite de tentativas por IP/dispositivo, OTP enviado por um
> provedor (WhatsApp Business API / Twilio Verify) **sem devolver o código na resposta** (aqui o `demoCode` existe só para
> demonstrar), e uma lista de e-mails descartáveis mantida. Validar CPF/CNPJ só confere os dígitos: para provar que o
> documento é da pessoa seria preciso consultar um serviço (ex.: Receita/bureau). Exigir **cartão** no início do teste é a
> barreira mais forte, mas precisa de um gateway (Stripe/Mercado Pago) que devolva a impressão digital do cartão — nunca
> manuseie o número do cartão no front-end. Este mock não implementa isso.

> **Importante (cobrança):** o pagamento aqui é só simulado. Numa API real, cobre no servidor (Pix/cartão via Mercado
> Pago, Stripe…), confirme por **webhook** e nunca confie no cliente para marcar algo como pago ou creditar indicações.
> O preço do agendamento também é definido no servidor a partir do `serviceId`.

> **Importante:** a checagem de horário duplo em `appointmentService.create` hoje é feita no cliente
> (mock). Na API real, essa validação precisa existir **no servidor** (com restrição única no banco).

## Regras de negócio principais

- **Horários** (`utils/slotGenerator.ts`): para cada período do dia (ex.: 08:00–12:00 e 14:00–18:00) gera
  um horário a cada *N* minutos (5 a 120), sem incluir o horário final. Períodos sobrepostos não duplicam.
- **Vagas ocupadas**: todo agendamento existente bloqueia o horário;
  excluir o agendamento libera o horário.
- **Cliente** só informa o nome — sem conta, e-mail ou CPF.
- **Link do prestador** (`utils/slug.ts`): `nome-do-estabelecimento-` + identificador aleatório de 6 caracteres
  (ex.: `barbearia-central-k3x9qa`). Só o **e-mail** precisa ser único; nome e estabelecimento podem se repetir. O
  slug nunca muda, nem se o nome do estabelecimento for editado (o link impresso continua valendo).
- **Cobrança** (`utils/billing.ts`, um único lugar para ajustar valores): 1º mês grátis; depois **R$ 50/mês**.
  **Indicação:** cada indicado que **assina** (paga a 1ª mensalidade de verdade — só se cadastrar não conta) rende
  **1 mês grátis** a quem indicou. Os meses ficam num **saldo de no máximo 3**: indicação confirmada com o saldo cheio
  conta como indicação, mas não rende mês até que algum seja usado. Os meses são usados **automaticamente**, um por vez,
  quando o período atual (teste ou pago) termina — e nunca antes da data em que foram ganhos, para não "cobrir pra trás"
  um intervalo em que a conta ficou sem acesso. Aparecem no histórico como "Mês grátis por indicação" (R$ 0,00) e não
  contam como pagamento (por isso não disparam a indicação de quem convidou essa pessoa). Conta vencida perde o painel
  (só a tela de Assinatura) e a página pública mostra "agendamento indisponível".
- **Antiabuso do mês grátis** (`utils/document.ts`, `utils/email.ts`, `services/verificationService.ts`):
  - **Um mês grátis por CPF/CNPJ e por WhatsApp.** O cadastro exige documento válido (CPF, CNPJ numérico **e** o
    alfanumérico em vigor desde jul/2026) e WhatsApp confirmado por código (OTP). A conta nasce normalmente, mas sem o
    teste se o documento ou o telefone já o usou; ela cai na tela de Assinatura com a explicação.
  - Só uma **impressão digital (hash)** do documento e do telefone é guardada no registro de identidades, que é
    permanente: apagar a conta não devolve o mês grátis. O telefone também fica no perfil público (é o contato do QR Code).
  - **E-mail:** `a.b+x@gmail.com` e `ab@gmail.com` são a mesma conta; domínios descartáveis (lista de exemplo) são recusados.
  - **Indicação:** não vale com o mesmo CPF/CNPJ ou WhatsApp de quem indicou, e só é confirmada **7 dias** depois da 1ª
    mensalidade do indicado (prazo de desistência do consumidor). Até lá aparece como "em confirmação" e não rende mês grátis.
- **Ganhos** (`utils/earnings.ts`): soma dos preços dos atendimentos cujo horário **já passou** (realizado); os que ainda
  vão acontecer aparecem como *previsto*. O preço fica gravado no agendamento, então editar/excluir o serviço não
  altera o histórico. Semana = segunda a domingo. Agendamento excluído sai dos ganhos e libera o horário; só é possível
  excluir de hoje em diante.

## Dados de demonstração

- Limitação conhecida: quem limpa o navegador ainda burla o que é só local; por isso as regras acima precisam ir para a API.
- Serviços e horários ficam em memória (voltam ao padrão ao recarregar). Contas, prestadores, assinaturas, agendamentos e
  notificações ficam no `localStorage`. A conta de demonstração vem com ~200 dias de histórico para o dashboard de ganhos.
- **Agendamentos criados, agendamentos excluídos e notificações ficam no `localStorage`** e são compartilhados entre
  abas: agende numa aba e veja o toast/sino e a lista de próximos agendamentos atualizarem na aba do prestador.
  Os agendamentos de exemplo são gerados a cada carga, sempre relativos a hoje.
- Para zerar tudo: `localStorage.clear()` no console do navegador.

## O que os testes cobrem

- **Prestador:** cadastro → dashboard → serviços (validação, criar, desativar, editar, excluir) → horários
  (todas as 10 frequências, almoço, período inválido, persistência) → perfil (prévia ao vivo, foto) → link
  (copiar/abrir) → notificação ao vivo → logout e proteção de rotas.
- **Cliente:** página pública → serviço → data → horário → nome → confirmação → sucesso; horários ocupados,
  fora do expediente, dias sem atendimento, horários que já passaram hoje, serviço desativado, slug inexistente
  e disputa pelo mesmo horário.
- Verificado também manualmente em Chromium headless (390px e 1280px): sem overflow horizontal, sem erros de
  console, fluxo de duas abas simultâneas.
