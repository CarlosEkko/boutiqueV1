import { useCallback, useEffect, useState } from 'react';
import { fetchCryptoMarkets, fetchOrders, type CryptoMarket, type Order } from '@/api/trading';

export const useMarkets = (currency = 'EUR') => {
  const [markets, setMarkets] = useState<CryptoMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchCryptoMarkets(currency);
      setMarkets(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => { refresh(); }, [refresh]);

  return { markets, loading, error, refresh };
};

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOrders(50);
      setOrders(data);
    } catch {
      // fail-soft
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { orders, loading, refresh };
};
