import { useCallback, useEffect, useState } from 'react';
import {
  fetchFiatBalances,
  fetchCryptoBalances,
  fetchCryptoTransactions,
  type FiatWallet,
  type CryptoBalance,
  type CryptoTx,
} from '@/api/wallets';

interface WalletsState {
  fiat: FiatWallet[];
  crypto: CryptoBalance[];
  transactions: CryptoTx[];
  totalEur: number;     // best-effort aggregate (fiat only — crypto needs price oracle)
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Aggregates fiat + crypto balances and recent transactions from the backend.
 * Crypto USD-equivalent is left for a future price-oracle hook (M3 trading screen).
 */
export const useWallets = (): WalletsState => {
  const [fiat, setFiat] = useState<FiatWallet[]>([]);
  const [crypto, setCrypto] = useState<CryptoBalance[]>([]);
  const [transactions, setTransactions] = useState<CryptoTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Fail-soft: each call wrapped — one missing endpoint shouldn't blank the dashboard.
      const [fiatRes, cryptoRes, txRes] = await Promise.allSettled([
        fetchFiatBalances(),
        fetchCryptoBalances(),
        fetchCryptoTransactions(30),
      ]);
      if (fiatRes.status === 'fulfilled') setFiat(fiatRes.value);
      if (cryptoRes.status === 'fulfilled') setCrypto(cryptoRes.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value);

      const failures = [fiatRes, cryptoRes, txRes].filter(r => r.status === 'rejected');
      if (failures.length === 3) {
        setError('Failed to load wallets');
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Crude aggregate: convert all fiat to EUR by simple symbol match (no FX yet).
  const totalEur = fiat.reduce((sum, w) => {
    if (w.currency === 'EUR') return sum + (w.balance || 0);
    if (w.currency === 'USD') return sum + (w.balance || 0) * 0.92;     // placeholder FX
    if (w.currency === 'GBP') return sum + (w.balance || 0) * 1.17;     // placeholder FX
    return sum;
  }, 0);

  return { fiat, crypto, transactions, totalEur, loading, error, refresh: load };
};
