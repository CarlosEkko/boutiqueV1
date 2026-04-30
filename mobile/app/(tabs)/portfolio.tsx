import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Card, Row } from '@/components/ui';
import { useWallets } from '@/hooks/useWallets';
import { Briefcase } from 'lucide-react-native';

const formatCurrency = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

const formatCrypto = (n: number, asset: string) =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${asset}`;

export default function PortfolioScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const { fiat, crypto, totalEur, loading, refresh } = useWallets();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        <Card>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5 }}>
            {(t('home.portfolio_value') || 'TOTAL VALUE').toUpperCase()}
          </Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
          ) : (
            <Text style={{ color: theme.colors.gold, fontSize: 34, fontWeight: '300', marginTop: 6 }}>
              {formatCurrency(totalEur)}
            </Text>
          )}
        </Card>

        {/* Fiat */}
        <Card>
          <Text style={{ color: theme.colors.text, fontSize: 14, marginBottom: 12, fontWeight: '500' }}>
            {t('portfolio.fiat') || 'Fiat Wallets'}
          </Text>
          {fiat.length === 0 ? (
            <Text style={{ color: theme.colors.textFaint, fontSize: 13 }}>
              {t('home.no_wallets') || 'No fiat wallets yet'}
            </Text>
          ) : fiat.map((w) => (
            <Row key={w.currency} label={w.bank_name || w.currency} value={formatCurrency(w.balance, w.currency)} />
          ))}
        </Card>

        {/* Crypto */}
        <Card>
          <Text style={{ color: theme.colors.text, fontSize: 14, marginBottom: 12, fontWeight: '500' }}>
            {t('portfolio.crypto') || 'Crypto Holdings'}
          </Text>
          {crypto.length === 0 ? (
            <Text style={{ color: theme.colors.textFaint, fontSize: 13 }}>
              {t('home.no_crypto') || 'No crypto holdings'}
            </Text>
          ) : crypto.map((b) => (
            <Row key={b.fireblocks_asset_id} label={b.asset} value={formatCrypto(b.total, b.asset)} />
          ))}
        </Card>

        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <Briefcase color={theme.colors.textFaint} size={16} />
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 4 }}>
            {t('portfolio.live_data') || 'Live data · pull to refresh'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
