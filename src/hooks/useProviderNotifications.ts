import { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';
import type { AppNotification } from '../types';

export function useProviderNotifications(providerId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    providerId ? notificationService.listByProvider(providerId) : []
  );

  useEffect(() => {
    if (!providerId) return;

    return notificationService.subscribe(() => {
      setNotifications(notificationService.listByProvider(providerId));
    });
  }, [providerId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    if (!providerId) return;
    notificationService.markAllRead(providerId);
  }

  return { notifications, unreadCount, markAllRead };
}
