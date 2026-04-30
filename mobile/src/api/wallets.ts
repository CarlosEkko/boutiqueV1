import { api } from './client';

export interface FiatWallet {
  user_id: string;
  currency: string;
  balance: number;
  pending?: number;
  iban?: string;
  account_holder?: string;
  bank_name?: string;
  status?: string;
  created_at?: string;
}

export interface CryptoBalance {
  asset: string;
  fireblocks_asset_id: string;
  total: number;
  available: number;
  pending: number;
  frozen: number;
}

export interface CryptoBalancesResponse {
  balances: CryptoBalance[];
  message?: string;
}

export interface CryptoTx {
  id: string;
  fireblocks_tx_id?: string;
  asset: string;
  asset_name?: string;
  amount: number;
  amount_usd?: number;
  status: string;
  direction?: 'incoming' | 'outgoing';
  destination_address?: string;
  tx_hash?: string;
  created_at: string;
  last_updated?: string;
}

/* ---------------- Fiat ---------------- */
export const fetchFiatBalances = async (): Promise<FiatWallet[]> => {
  const { data } = await api.get<FiatWallet[]>('/trading/fiat/balances');
  return Array.isArray(data) ? data : [];
};

/* ---------------- Crypto ---------------- */
export const fetchCryptoBalances = async (): Promise<CryptoBalance[]> => {
  const { data } = await api.get<CryptoBalancesResponse>('/crypto-wallets/balances');
  return data.balances || [];
};

export const fetchCryptoTransactions = async (limit = 30): Promise<CryptoTx[]> => {
  const { data } = await api.get<CryptoTx[] | { transactions: CryptoTx[] }>(
    `/crypto-wallets/transactions?limit=${limit}`
  );
  if (Array.isArray(data)) return data;
  return data.transactions || [];
};
