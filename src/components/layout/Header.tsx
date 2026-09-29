import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { NAV_ITEMS } from './navItems';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMenuOpen(true)}
          className="-ml-3 flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-600 hover:bg-ink-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="font-display text-lg font-semibold text-ink-900 sm:text-xl">
          {title}
        </h1>
      </div>

      <NotificationBell providerId={user?.providerId} />

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-ink-900">
                agendasys
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex size-11 items-center justify-center rounded-[var(--radius-chip)] text-ink-500 hover:bg-ink-100"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-[var(--radius-chip)] px-3 py-3 text-sm font-medium',
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-ink-600 hover:bg-ink-100',
                    ].join(' ')
                  }
                >
                  <Icon className="size-[18px]" />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
