import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarPlus2, CheckCheck } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProviderNotifications } from '../../hooks/useProviderNotifications';
import { formatDateBR } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';

export function NotificationBell({ providerId }: { providerId: string | undefined }) {
  const { notifications, unreadCount, markAllRead } = useProviderNotifications(providerId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    // efeitos colaterais ficam fora do updater do setState
    if (next && unreadCount > 0) markAllRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Notificações"
        className="relative -mr-2 flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brick-500 text-[0.625rem] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-card)] border border-ink-100 bg-white shadow-xl shadow-ink-950/10">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink-900">Notificações</p>
            {notifications.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-ink-400">
                <CheckCheck className="size-3.5" />
                lidas automaticamente
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-2 py-4">
                <EmptyState
                  icon={<CalendarPlus2 className="size-7" />}
                  title="Nenhuma notificação"
                  description="Novos agendamentos aparecem aqui."
                />
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex gap-3 border-b border-ink-100 px-4 py-3 last:border-0"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CalendarPlus2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900">Novo agendamento</p>
                    <p className="truncate text-sm text-ink-600">
                      {n.clientName} — {n.serviceName}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatDateBR(n.date)} às {n.time} ·{' '}
                      {formatDistanceToNowStrict(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
