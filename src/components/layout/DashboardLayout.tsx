import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SubscriptionBanner } from './SubscriptionBanner';
import { Spinner } from '../ui/Spinner';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { notificationService } from '../../services/notificationService';

export function DashboardLayout() {
  const matches = useMatches();
  const current = matches[matches.length - 1] as { handle?: { title?: string } };
  const title = current?.handle?.title ?? 'Dashboard';

  useDocumentTitle(`${title} · agendasys`);

  const { user } = useAuth();
  const location = useLocation();
  const { summary, isLoading: isLoadingSubscription } = useSubscription(user?.providerId);
  const onBillingPage = location.pathname === '/dashboard/assinatura';
  const { showToast } = useToast();
  const seenIds = useRef<Set<string> | null>(null);

  // Mostra um toast em tempo real sempre que um cliente confirma um
  // agendamento — funciona mesmo com a página pública aberta em outra aba,
  // simulando a chegada de uma notificação de WhatsApp para o prestador.
  useEffect(() => {
    const providerId = user?.providerId;
    if (!providerId) return;

    // registra o que já existia ao montar, para só notificar o que é novo
    seenIds.current = new Set(notificationService.listByProvider(providerId).map((n) => n.id));

    return notificationService.subscribe(() => {
      const latest = notificationService.listByProvider(providerId);
      for (const notification of latest) {
        if (!seenIds.current!.has(notification.id)) {
          seenIds.current!.add(notification.id);
          showToast({
            message: 'Novo agendamento!',
            description: `${notification.clientName} — ${notification.serviceName} às ${notification.time}`,
            variant: 'success',
          });
        }
      }
    });
  }, [user?.providerId, showToast]);

  return (
    <div className="flex min-h-screen bg-paper-100">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[var(--radius-chip)] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none px-4 py-6 sm:px-6 lg:px-8">
          {isLoadingSubscription ? (
            <Spinner label="Carregando…" />
          ) : summary && !summary.hasAccess && !onBillingPage ? (
            // assinatura vencida: só a tela de assinatura fica acessível
            <Navigate to="/dashboard/assinatura" replace />
          ) : (
            <>
              {summary && !onBillingPage && <SubscriptionBanner summary={summary} />}
              <Outlet />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
