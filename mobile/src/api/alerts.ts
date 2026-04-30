import { api } from './client';

export interface PriceAlert {
  id: string;
  user_id: string;
  asset: string;
  direction: 'above' | 'below';
  target_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  triggered_at: string | null;
  triggered_price: number | null;
  note: string | null;
}

export const fetchMyAlerts = async (includeTriggered = false): Promise<PriceAlert[]> => {
  const { data } = await api.get<PriceAlert[]>(
    `/price-alerts?include_triggered=${includeTriggered}`
  );
  return Array.isArray(data) ? data : [];
};

export const createAlert = async (payload: {
  asset: string;
  direction: 'above' | 'below';
  target_price: number;
  currency?: string;
  note?: string;
}): Promise<PriceAlert> => {
  const { data } = await api.post<PriceAlert>('/price-alerts', {
    currency: 'EUR',
    ...payload,
  });
  return data;
};

export const deleteAlert = async (id: string): Promise<void> => {
  await api.delete(`/price-alerts/${id}`);
};

export const toggleAlert = async (id: string): Promise<PriceAlert> => {
  const { data } = await api.post<PriceAlert>(`/price-alerts/${id}/toggle`);
  return data;
};
