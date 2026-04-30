import { useCallback, useEffect, useState } from 'react';
import {
  fetchFiatBalances,
  fetchCryptoBalances,
  fetchCryptoTransactions,
  type FiatWallet,
  type CryptoBalance,
  type CryptoTx,
} from '@/api/wallets';
import { fetchCryptoMarkets } from '@/api/trading';

interface WalletsState {
  fiat: FiatWallet[];
  crypto: CryptoBalance[];
  transactions: CryptoTx[];
  prices: Record<string, number>;  // asset symbol → EUR mid price
  totalEur: number;     // fiat + crypto valued in EUR
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Aggregates fiat + crypto balances + live prices.
 * Crypto USD/EUR equivalent comes from `/api/trading/cryptos?currency=EUR` (KBEX-spread mid).
 */
export const useWallets = (): WalletsState => {
  const [fiat, setFiat] = useState<FiatWallet[]>([]);
  const [crypto, setCrypto] = useState<CryptoBalance[]>([]);
  const [transactions, setTransactions] = useState<CryptoTx[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [fiatRes, cryptoRes, txRes, marketsRes] = await Promise.allSettled([
        fetchFiatBalances(),
        fetchCryptoBalances(),
        fetchCryptoTransactions(30),
        fetchCryptoMarkets('EUR'),
      ]);
      if (fiatRes.status === 'fulfilled') setFiat(fiatRes.value);
      if (cryptoRes.status === 'fulfilled') setCrypto(cryptoRes.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value);
      if (marketsRes.status === 'fulfilled') {
        const map: Record<string, number> = {};
        marketsRes.value.forEach((m) => {
          map[m.symbol.toUpperCase()] = m.price;
        });
        setPrices(map);
      }

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

  // Strip network suffix for price lookup (USDT_POLYGON → USDT, ETH-AETH → ETH)
  const baseAssetSymbol = (asset: string): string => {
    return asset.split(/[-_]/)[0].toUpperCase();
  };

  const fiatEur = fiat.reduce((sum, w) => {
    if (w.currency === 'EUR') return sum + (w.balance || 0);
    if (w.currency === 'USD') return sum + (w.balance || 0) * 0.92;
    if (w.currency === 'GBP') return sum + (w.balance || 0) * 1.17;
    return sum;
  }, 0);

  const cryptoEur = crypto.reduce((sum, b) => {
    const sym = baseAssetSymbol(b.asset);
    const p = prices[sym] || 0;
    return sum + (b.total || 0) * p;
  }, 0);

  return {
    fiat, crypto, transactions, prices,
    totalEur: fiatEur + cryptoEur,
    loading, error, refresh: load,
  };
};
