import { api } from './client';

export interface DepositAddress {
  asset: string;
  address: string;
  network: string;
  cached?: boolean;
}

export const fetchDepositAddress = async (asset: string): Promise<DepositAddress> => {
  const { data } = await api.get<DepositAddress>(`/crypto-wallets/deposit-address/${asset}`);
  return data;
};

export const initializeCryptoVault = async (): Promise<{ success: boolean }> => {
  const { data } = await api.post<{ success: boolean }>('/crypto-wallets/initialize');
  return data;
};
