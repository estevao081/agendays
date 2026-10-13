import { useCallback, useState } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { MobileMenu } from './MobileMenu';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

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

      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </header>
  );
}
