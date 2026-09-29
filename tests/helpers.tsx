import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type InitialEntry } from 'react-router-dom';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import { ToastContainer } from '../src/components/ui';
import { routes } from '../src/routes/AppRoutes';

/** Renderiza o app inteiro (providers + rotas reais) a partir de uma URL. */
export function renderApp(initialEntry: InitialEntry) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  render(
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
  return router;
}

export const WAIT = { timeout: 5000 };
