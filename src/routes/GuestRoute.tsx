import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Rotas de "visitante" (login, cadastro, esqueci senha): se já existe uma
 * sessão mockada ativa, redireciona direto para o dashboard.
 */
export function GuestRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
