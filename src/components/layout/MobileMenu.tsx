import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS } from './navItems';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Menu lateral (hambúrguer) da versão mobile.
 *
 * É renderizado em um portal no <body> de propósito: o <header> usa
 * `backdrop-blur` (backdrop-filter), o que faz dele o "containing block" de
 * qualquer descendente `position: fixed`. Dentro do header, o painel ficava
 * com a altura do header (64px) e os itens transbordavam sobre o conteúdo,
 * parecendo transparentes.
 */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { user, logout } = useAuth();

  // fecha com Esc e trava o scroll do fundo enquanto o menu está aberto
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/50" onClick={onClose} aria-hidden="true" />
      <nav
        aria-label="Menu de navegação"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white p-4 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-ink-900">agendasys</span>
          <button
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-[var(--radius-chip)] px-3 py-3 text-sm font-medium',
                  isActive ? 'bg-emerald-50 text-emerald-700' : 'text-ink-600 hover:bg-ink-100',
                ].join(' ')
              }
            >
              <Icon className="size-[18px]" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-ink-100 pt-3">
          <p className="truncate px-3 text-sm font-medium text-ink-800">{user?.name}</p>
          <p className="truncate px-3 text-xs text-ink-400">{user?.email}</p>
          <button
            onClick={() => logout()}
            className="mt-2 flex w-full items-center gap-3 rounded-[var(--radius-chip)] px-3 py-3 text-sm font-medium text-ink-500 hover:bg-ink-100 hover:text-brick-600"
          >
            <LogOut className="size-[18px]" />
            Sair
          </button>
        </div>
      </nav>
    </div>,
    document.body,
  );
}
