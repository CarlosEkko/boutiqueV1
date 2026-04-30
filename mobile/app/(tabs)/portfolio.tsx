import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/theme';
import { useWallets } from '@/hooks/useWallets';
import {
  ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ArrowLeftRight,
  Eye, EyeOff, ChevronRight,
} from 'lucide-react-native';

// Static logo lookup (avoids extra fetch). Falls back to letter avatar.
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  USDT: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
  USDC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png',
  SOL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png',
  XRP: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
  MATIC: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png',
  BNB: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
  DOGE: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
};

const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', USDT: 'Tether', USDC: 'USD Coin',
  SOL: 'Solana', XRP: 'XRP', MATIC: 'Polygon', BNB: 'BNB', DOGE: 'Dogecoin',
};

const FIAT_FLAGS: Record<string, string> = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', AED: '🇦🇪',
  CHF: '🇨🇭', QAR: '🇶🇦', SAR: '🇸🇦', HKD: '🇭🇰',
};

const formatCurrency = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const formatCryptoAmount = (n: number) => {
  if (n === 0) return '0';
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
};

// Strip network suffix and return primary asset + network label.
const splitAsset = (asset: string): { base: string; network: string | null } => {
  // Patterns: USDT_POLYGON, USDT_ARB, ETH-AETH, USDT_BSC, MATIC_POLYGON
  const m = asset.match(/^([A-Z]+)[-_](.+)$/i);
  if (!m) return { base: asset.toUpperCase(), network: null };
  const networkRaw = m[2].toUpperCase();
  const networkMap: Record<string, string> = {
    POLYGON: 'Polygon', ARB: 'Arbitrum', BSC: 'BSC', AETH: 'Arbitrum',
    OPT: 'Optimism', AVAX: 'Avalanche', SOL: 'Solana',
  };
  return {
    base: m[1].toUpperCase(),
    network: networkMap[networkRaw] || networkRaw,
  };
};

export default function PortfolioScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [hideZeros, setHideZeros] = useState(true);
  const { fiat, crypto, prices, totalEur, loading, refresh } = useWallets();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Group crypto holdings: hide zeros + sort by EUR value desc.
  const cryptoFiltered = useMemo(() => {
    const enriched = crypto.map((b) => {
      const { base, network } = splitAsset(b.asset);
      const price = prices[base] || 0;
      const value = (b.total || 0) * price;
      return { ...b, base, network, value, displayName: CRYPTO_NAMES[base] || base };
    });
    const filtered = hideZeros
      ? enriched.filter((b) => (b.total || 0) > 0)
      : enriched;
    return filtered.sort((a, b) => b.value - a.value);
  }, [crypto, prices, hideZeros]);

  const fiatFiltered = useMemo(() => {
    const filtered = hideZeros ? fiat.filter((w) => (w.balance || 0) > 0) : fiat;
    return filtered.sort((a, b) => (b.balance || 0) - (a.balance || 0));
  }, [fiat, hideZeros]);

  const hasZeros = useMemo(() => {
    return crypto.some((b) => (b.total || 0) === 0)
      || fiat.some((w) => (w.balance || 0) === 0);
  }, [crypto, fiat]);

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        {/* Hero — Total Balance */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
            {t('wallet.totalBalance') || 'Total Balance'}
          </Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 16 }} />
          ) : (
            <Text
              testID="wallet-total-balance"
              style={{
                color: theme.colors.gold,
                fontSize: 38,
                fontWeight: '300',
                marginTop: 8,
                letterSpacing: -0.5,
              }}
            >
              {formatCurrency(totalEur)}
            </Text>
          )}
        </View>

        {/* Quick Actions — Revolut-style */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingHorizontal: 16,
          marginBottom: 28,
        }}>
          <ActionButton
            icon={<ArrowDownToLine color={theme.colors.gold} size={20} />}
            label={t('wallet.deposit') || 'Depositar'}
            onPress={() => router.push('/deposit' as any)}
            testID="wallet-action-deposit"
          />
          <ActionButton
            icon={<ArrowUpFromLine color={theme.colors.gold} size={20} />}
            label={t('wallet.withdraw') || 'Levantar'}
            onPress={() => router.push('/(tabs)/' as any)}
            testID="wallet-action-withdraw"
          />
          <ActionButton
            icon={<ShoppingCart color={theme.colors.gold} size={20} />}
            label={t('wallet.buy') || 'Comprar'}
            onPress={() => router.push('/(tabs)/markets' as any)}
            testID="wallet-action-buy"
          />
          <ActionButton
            icon={<ArrowLeftRight color={theme.colors.gold} size={20} />}
            label={t('wallet.transactions') || 'Histórico'}
            onPress={() => router.push('/transactions' as any)}
            testID="wallet-action-history"
          />
        </View>

        {/* Hide-zero toggle */}
        {hasZeros && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => setHideZeros(!hideZeros)}
              activeOpacity={0.7}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              testID="wallet-toggle-zeros"
            >
              {hideZeros ? (
                <Eye color={theme.colors.textMuted} size={14} />
              ) : (
                <EyeOff color={theme.colors.textMuted} size={14} />
              )}
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {hideZeros
                  ? (t('wallet.showZeros') || 'Mostrar zeros')
                  : (t('wallet.hideZeros') || 'Esconder zeros')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fiat */}
        {fiatFiltered.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{
              color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5,
              marginBottom: 10, paddingHorizontal: 4,
            }}>
              {(t('wallet.fiatSection') || 'FIAT').toUpperCase()}
            </Text>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1, borderColor: theme.colors.border,
              overflow: 'hidden',
            }}>
              {fiatFiltered.map((w, idx) => (
                <FiatRow key={w.currency} wallet={w} showDivider={idx < fiatFiltered.length - 1} />
              ))}
            </View>
          </View>
        )}

        {/* Crypto */}
        {cryptoFiltered.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Text style={{
              color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5,
              marginBottom: 10, paddingHorizontal: 4,
            }}>
              {(t('wallet.cryptoSection') || 'CRYPTO').toUpperCase()}
            </Text>
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderWidth: 1, borderColor: theme.colors.border,
              overflow: 'hidden',
            }}>
              {cryptoFiltered.map((b, idx) => (
                <CryptoRow
                  key={b.fireblocks_asset_id || b.asset}
                  balance={b}
                  onPress={() => router.push(`/markets/${b.base}` as any)}
                  showDivider={idx < cryptoFiltered.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state when nothing visible */}
        {!loading && fiatFiltered.length === 0 && cryptoFiltered.length === 0 && (
          <View style={{ alignItems: 'center', paddingHorizontal: 32, marginTop: 40, gap: 12 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' }}>
              {hideZeros
                ? (t('wallet.allZerosHint') || 'Todos os ativos com saldo zero. Toque acima para mostrar.')
                : (t('wallet.empty') || 'Sem ativos. Faça o seu primeiro depósito.')}
            </Text>
          </View>
        )}

        <Text style={{
          color: theme.colors.textFaint, fontSize: 11,
          textAlign: 'center', marginTop: 24,
        }}>
          {t('wallet.liveData') || 'Dados em tempo real · puxe para atualizar'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Sub-components ----------

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  testID: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onPress, testID }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    testID={testID}
    style={{ alignItems: 'center', gap: 8, minWidth: 64 }}
  >
    <View style={{
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: theme.colors.surface,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.gold + '55',
    }}>
      {icon}
    </View>
    <Text style={{ color: theme.colors.text, fontSize: 11, fontWeight: '500' }}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface FiatRowProps {
  wallet: { currency: string; balance: number; iban?: string; bank_name?: string };
  showDivider: boolean;
}

const FiatRow: React.FC<FiatRowProps> = ({ wallet, showDivider }) => {
  const flag = FIAT_FLAGS[wallet.currency] || '💱';
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
      borderBottomWidth: showDivider ? 1 : 0, borderBottomColor: theme.colors.border,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.bg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.border,
      }}>
        <Text style={{ fontSize: 20 }}>{flag}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
          {wallet.currency}
        </Text>
        {wallet.bank_name ? (
          <Text style={{ color: theme.colors.textFaint, fontSize: 11 }} numberOfLines={1}>
            {wallet.bank_name}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
        {formatCurrency(wallet.balance, wallet.currency)}
      </Text>
    </View>
  );
};

interface CryptoRowProps {
  balance: {
    asset: string; base: string; network: string | null; total: number;
    value: number; displayName: string;
  };
  onPress: () => void;
  showDivider: boolean;
}

const CryptoRow: React.FC<CryptoRowProps> = ({ balance, onPress, showDivider }) => {
  const logo = CRYPTO_LOGOS[balance.base];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={`crypto-row-${balance.asset}`}
      style={{
        flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
        borderBottomWidth: showDivider ? 1 : 0, borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.bg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.gold + '33',
        overflow: 'hidden',
      }}>
        {logo ? (
          <Image source={{ uri: logo }} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="contain" />
        ) : (
          <Text style={{ color: theme.colors.gold, fontSize: 11, fontWeight: '600' }}>
            {balance.base.slice(0, 3)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
            {balance.base}
          </Text>
          {balance.network && (
            <View style={{
              paddingHorizontal: 6, paddingVertical: 1,
              backgroundColor: theme.colors.bg,
              borderRadius: 4,
              borderWidth: 1, borderColor: theme.colors.border,
            }}>
              <Text style={{ color: theme.colors.textMuted, fontSize: 9, letterSpacing: 0.3 }}>
                {balance.network}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
          {balance.displayName}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
          {balance.value > 0 ? formatCurrency(balance.value) : '—'}
        </Text>
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
          {formatCryptoAmount(balance.total)} {balance.base}
        </Text>
      </View>
      <ChevronRight color={theme.colors.textFaint} size={16} />
    </TouchableOpacity>
  );
};
