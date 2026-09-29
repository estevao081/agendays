import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS } from './navItems';

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside aria-label="Navegação principal" className="hidden w-64 shrink-0 flex-col border-r border-ink-100 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex size-8 items-center justify-center rounded-[var(--radius-chip)] bg-emerald-600 font-display text-sm font-bold text-white">
          A
        </div>
        <span className="font-display text-lg font-semibold text-ink-900">agendasys</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-[var(--radius-chip)] px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800',
              ].join(' ')
            }
          >
            <Icon className="size-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 rounded-[var(--radius-chip)] px-3 py-2.5">
          <div className="flex size-9 items-center justify-center rounded-full bg-ink-100 font-display text-sm font-semibold text-ink-700">
            {user?.name?.[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-800">{user?.name}</p>
            <p className="truncate text-xs text-ink-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-1 flex w-full items-center gap-3 rounded-[var(--radius-chip)] px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-brick-600"
        >
          <LogOut className="size-[18px]" />
          Sair
        </button>
      </div>
    </aside>
  );
}
