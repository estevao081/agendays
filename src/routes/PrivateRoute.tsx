import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';

/**
 * Protege as rotas do dashboard. Hoje verifica apenas o estado mockado de
 * autenticação (localStorage via AuthContext); no futuro, a mesma estrutura
 * pode validar um token/sessão real vindo de uma API.
 */
export function PrivateRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner label="Verificando sessão…" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
