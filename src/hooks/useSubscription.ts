import { useCallback, useEffect, useState } from 'react';
import type { SubscriptionSummary } from '../types';
import { billingService } from '../services/billingService';

export function useSubscription(providerId: string | undefined) {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!providerId) return;
    setSummary(await billingService.getSummary(providerId));
    setIsLoading(false);
  }, [providerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // a assinatura muda ao pagar aqui, ou quando um indicado assina (em qualquer aba)
    return billingService.onChange(() => void refresh());
  }, [refresh]);

  return { summary, isLoading, refresh };
}
