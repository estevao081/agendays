import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { DashboardLayout, PublicLayout } from '../components/layout';
import { PrivateRoute } from './PrivateRoute';
import { GuestRoute } from './GuestRoute';

import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

import { OverviewPage } from '../pages/dashboard/OverviewPage';
import { ServicesPage } from '../pages/dashboard/ServicesPage';
import { AvailabilityPage } from '../pages/dashboard/AvailabilityPage';
import { ProfilePage } from '../pages/dashboard/ProfilePage';
import { LinkSharingPage } from '../pages/dashboard/LinkSharingPage';

import { ProviderPublicPage } from '../pages/public/ProviderPublicPage';
import { BookingFlowPage } from '../pages/public/BookingFlowPage';
import { BookingSuccessPage } from '../pages/public/BookingSuccessPage';

export const routes: RouteObject[] = [
  {
    element: <GuestRoute />,
    children: [
      { path: '/', element: <LoginPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
    ],
  },

  {
    path: '/dashboard',
    element: <PrivateRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <OverviewPage />, handle: { title: 'Visão geral' } },
          {
            path: 'servicos',
            element: <ServicesPage />,
            handle: { title: 'Serviços' },
          },
          {
            path: 'horarios',
            element: <AvailabilityPage />,
            handle: { title: 'Horários' },
          },
          { path: 'perfil', element: <ProfilePage />, handle: { title: 'Perfil' } },
          {
            path: 'link',
            element: <LinkSharingPage />,
            handle: { title: 'Seu link' },
          },
        ],
      },
    ],
  },

  {
    path: '/prestador/:slug',
    element: <PublicLayout />,
    children: [
      { index: true, element: <ProviderPublicPage /> },
      { path: 'agendar', element: <BookingFlowPage /> },
      { path: 'agendar/sucesso', element: <BookingSuccessPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
