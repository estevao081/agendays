import { LayoutDashboard, Scissors, CalendarClock, UserRound, Link2, CreditCard, CalendarDays, TrendingUp } from 'lucide-react';

/** Itens de navegação do dashboard — fonte única para Sidebar (desktop) e Header (menu mobile). */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/dashboard/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { to: '/dashboard/ganhos', label: 'Ganhos', icon: TrendingUp },
  { to: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { to: '/dashboard/horarios', label: 'Horários', icon: CalendarClock },
  { to: '/dashboard/perfil', label: 'Perfil', icon: UserRound },
  { to: '/dashboard/link', label: 'Seu link', icon: Link2 },
  { to: '/dashboard/assinatura', label: 'Assinatura', icon: CreditCard },
];
