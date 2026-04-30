import { api } from './client';

export interface DepositAddress {
  asset: string;
  address: string;
  network: string;
  cached?: boolean;
}

export interface WithdrawalSummary {
  asset: string;
  amount: number;
  fee: number;
  network_fee: number;
  net_amount: number;
  destination: string;
}

export interface WithdrawalResponse {
  success: boolean;
  withdrawal_id: string;
  message: string;
  summary: WithdrawalSummary;
}

export interface Withdrawal {
  id: string;
  asset: string;
  amount: number;
  fee_amount: number;
  network_fee: number;
  net_amount: number;
  destination_address: string;
  network?: string;
  note?: string;
  status: string; // pending | approved | processing | completed | failed | cancelled
  created_at: string;
  updated_at: string;
}

export const fetchDepositAddress = async (asset: string): Promise<DepositAddress> => {
  const { data } = await api.get<DepositAddress>(`/crypto-wallets/deposit-address/${asset}`);
  return data;
};

export const initializeCryptoVault = async (): Promise<{ success: boolean }> => {
  const { data } = await api.post<{ success: boolean }>('/crypto-wallets/initialize');
  return data;
};

export const requestWithdrawal = async (params: {
  asset: string;
  amount: number;
  destination_address: string;
  network?: string;
  note?: string;
}): Promise<WithdrawalResponse> => {
  const { data } = await api.post<WithdrawalResponse>('/crypto-wallets/withdraw', params);
  return data;
};

export const fetchMyWithdrawals = async (): Promise<Withdrawal[]> => {
  const { data } = await api.get<Withdrawal[]>('/crypto-wallets/withdrawals');
  return Array.isArray(data) ? data : [];
};

export const cancelWithdrawal = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await api.post<{ success: boolean }>(`/crypto-wallets/withdrawals/${id}/cancel`);
  return data;
};
