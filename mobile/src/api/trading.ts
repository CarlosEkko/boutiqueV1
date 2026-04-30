import { api } from './client';

export interface CryptoMarket {
  symbol: string;
  name: string;
  price: number;
  price_buy: number;
  price_sell: number;
  buy_spread_pct: number;
  sell_spread_pct: number;
  change_24h?: number;
  change_24h_pct?: number;
  volume_24h?: number;
  market_cap?: number;
  logo?: string;
  fireblocks_asset_id?: string;
}

export interface PriceQuote {
  symbol: string;
  price: number;
  price_buy: number;
  price_sell: number;
  currency: string;
}

export interface Order {
  id: string;
  type: 'buy' | 'sell' | 'swap';
  asset: string;
  fiat_currency?: string;
  amount: number;
  fiat_amount?: number;
  price?: number;
  fee?: number;
  status: string;
  created_at: string;
}

export const fetchCryptoMarkets = async (currency = 'EUR'): Promise<CryptoMarket[]> => {
  const { data } = await api.get<CryptoMarket[]>(`/trading/cryptos?currency=${currency}&product=exchange`);
  return Array.isArray(data) ? data : [];
};

export const fetchPriceQuote = async (symbol: string, currency = 'EUR'): Promise<PriceQuote> => {
  const { data } = await api.get<PriceQuote>(`/trading/price/${symbol}?currency=${currency}`);
  return data;
};

export const placeBuyOrder = async (params: {
  asset: string;
  fiat_currency: string;
  fiat_amount: number;
}): Promise<Order> => {
  const { data } = await api.post<Order>('/trading/buy', params);
  return data;
};

export const placeSellOrder = async (params: {
  asset: string;
  fiat_currency: string;
  amount: number;
}): Promise<Order> => {
  const { data } = await api.post<Order>('/trading/sell', params);
  return data;
};

export const fetchOrders = async (limit = 50): Promise<Order[]> => {
  const { data } = await api.get<Order[]>(`/trading/orders?limit=${limit}`);
  return Array.isArray(data) ? data : [];
};

export const cancelOrder = async (orderId: string): Promise<void> => {
  await api.post(`/trading/orders/${orderId}/cancel`);
};
