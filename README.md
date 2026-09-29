# agendasys — frontend mockado de agendamento para prestadores de serviço

Frontend em **React + TypeScript + Vite + Tailwind CSS v4 + React Router**, 100% com dados mockados
(sem backend), organizado para que a troca por uma API real seja feita **só dentro de `src/services/`**.

## Como rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # type-check + build de produção
npm run lint     # oxlint
npm test         # 12 testes de interface (jornadas completas) + 10 de regras de negócio
npm run test:ui  # só os testes de interface (Vitest + Testing Library)
npm run test:rules # só as regras de negócio
```

Login de demonstração: qualquer e-mail + senha com 6+ caracteres.
Página pública de exemplo: `/prestador/fulano-barbearia`

## Rotas

| Rota | Descrição |
| --- | --- |
| `/login`, `/cadastro`, `/esqueci-senha` | Autenticação mockada (só para visitantes) |
| `/dashboard` | Visão geral, próximos agendamentos e link de agendamento |
| `/dashboard/servicos` | CRUD de serviços |
| `/dashboard/horarios` | Dias, períodos, intervalo entre horários e pré-visualização das vagas |
| `/dashboard/perfil` | Perfil + prévia da página pública |
| `/dashboard/link` | Copiar / abrir / compartilhar o link |
| `/prestador/:slug` | Página pública do prestador (sem login) |
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
| `appointmentService.create / listByProviderAndDate / updateStatus` | `POST /appointments`, `GET /providers/:id/appointments?date=`, `PATCH /appointments/:id` |
| `whatsappNotificationService` | Chamada ao backend, que dispara a mensagem via API de WhatsApp (Meta Cloud API, Twilio…) |
| `notificationService` | WebSocket / SSE / push no lugar do `localStorage` |

> **Importante:** a checagem de horário duplo em `appointmentService.create` hoje é feita no cliente
> (mock). Na API real, essa validação precisa existir **no servidor** (com restrição única no banco).

## Regras de negócio principais

- **Horários** (`utils/slotGenerator.ts`): para cada período do dia (ex.: 08:00–12:00 e 14:00–18:00) gera
  um horário a cada *N* minutos (5 a 120), sem incluir o horário final. Períodos sobrepostos não duplicam.
- **Vagas ocupadas**: agendamentos `agendado`, `confirmado` e `concluido` bloqueiam o horário;
  `cancelado` libera.
- **Cliente** só informa o nome — sem conta, e-mail ou CPF.

## Dados de demonstração

- Serviços, perfil e horários ficam em memória (voltam ao padrão ao recarregar).
- **Agendamentos criados, mudanças de status e notificações ficam no `localStorage`** e são compartilhados entre
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
