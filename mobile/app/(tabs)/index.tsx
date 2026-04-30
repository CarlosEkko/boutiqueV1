import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Dimensions, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight, ArrowDownRight, Plus, ArrowUp, ArrowDown, Activity,
} from 'lucide-react-native';
import { useAuth } from '@/auth/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { theme } from '@/theme';
import { Card, Row } from '@/components/ui';

const { width } = Dimensions.get('window');

const formatCurrency = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);

const formatCrypto = (n: number, asset: string) =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${asset}`;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, signedIn } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { fiat, crypto, transactions, totalEur, loading, refresh } = useWallets();
  usePushNotifications(signedIn);  // registers device on mount

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const displayName = (user?.full_name || user?.name || user?.email || '').split('@')[0];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />
        }
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, letterSpacing: 1 }}>
            {t('home.greeting') || 'Welcome back'}
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '300', marginTop: 4 }}>
            {displayName || 'Guest'}
          </Text>
        </View>

        {/* Hero balance card */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Card style={{ paddingVertical: 24 }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, letterSpacing: 1.5 }}>
              {(t('home.portfolio_value') || 'TOTAL BALANCE').toUpperCase()}
            </Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 16, alignSelf: 'flex-start' }} />
            ) : (
              <Text
                style={{
                  color: theme.colors.gold,
                  fontSize: 40,
                  fontWeight: '300',
                  marginTop: 8,
                  letterSpacing: -0.5,
                }}
                testID="home-total-balance"
              >
                {formatCurrency(totalEur)}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
              <ArrowUpRight color={theme.colors.success} size={14} />
              <Text style={{ color: theme.colors.success, fontSize: 13 }}>
                {fiat.length} {t('home.fiat_wallets') || 'fiat'} · {crypto.length} crypto
              </Text>
            </View>
          </Card>
        </View>

        {/* Quick actions widget */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            {[
              { icon: ArrowDown, label: t('home.deposit') || 'Deposit', onPress: () => router.push('/(tabs)/portfolio') },
              { icon: ArrowUp, label: t('home.withdraw') || 'Withdraw' },
              { icon: Plus, label: t('home.buy') || 'Buy', onPress: () => router.push('/(tabs)/markets') },
              { icon: Activity, label: t('home.trade') || 'Trade', onPress: () => router.push('/(tabs)/markets') },
            ].map(({ icon: Icon, label, onPress }, i) => (
              <TouchableOpacity
                key={i}
                onPress={onPress}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.bgElevated,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Icon size={18} color={theme.colors.gold} />
                <Text style={{ color: theme.colors.text, fontSize: 11, marginTop: 6, letterSpacing: 0.3 }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Swipeable section carousel */}
        <Text style={{
          color: theme.colors.textMuted, fontSize: 11, letterSpacing: 2,
          paddingHorizontal: 20, marginTop: 28, marginBottom: 10, textTransform: 'uppercase',
        }}>
          {t('home.overview') || 'Overview'}
        </Text>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {/* Fiat card */}
          <Card style={{ width: width - 40, marginRight: 4 }}>
            <Text style={{ color: theme.colors.gold, fontSize: 13, letterSpacing: 1.5, fontWeight: '500' }}>
              {(t('home.fiat_wallets') || 'FIAT WALLETS').toUpperCase()}
            </Text>
            <View style={{ marginTop: 16, gap: 4 }}>
              {fiat.length === 0 ? (
                <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
                  {t('home.no_wallets') || 'No fiat wallets yet'}
                </Text>
              ) : (
                fiat.slice(0, 5).map((w) => (
                  <Row key={w.currency} label={w.currency} value={formatCurrency(w.balance, w.currency)} />
                ))
              )}
            </View>
          </Card>

          {/* Crypto card */}
          <Card style={{ width: width - 40, marginRight: 4 }}>
            <Text style={{ color: theme.colors.gold, fontSize: 13, letterSpacing: 1.5, fontWeight: '500' }}>
              CRYPTO
            </Text>
            <View style={{ marginTop: 16, gap: 4 }}>
              {crypto.length === 0 ? (
                <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
                  {t('home.no_crypto') || 'No crypto holdings'}
                </Text>
              ) : (
                crypto.slice(0, 5).map((b) => (
                  <Row key={b.fireblocks_asset_id} label={b.asset} value={formatCrypto(b.total, b.asset)} />
                ))
              )}
            </View>
          </Card>

          {/* OTC placeholder */}
          <Card style={{ width: width - 40, marginRight: 4 }}>
            <Text style={{ color: theme.colors.gold, fontSize: 13, letterSpacing: 1.5, fontWeight: '500' }}>
              OTC DESK
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {t('home.otc_sub') || 'Block trades · Private deals'}
            </Text>
            <View style={{ marginTop: 16, gap: 4 }}>
              <Row label="Status" value={t('home.coming_m4') || 'Coming in M4'} color={theme.colors.textFaint} />
            </View>
          </Card>
        </ScrollView>

        {/* Recent activity */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{
              color: theme.colors.textMuted, fontSize: 11, letterSpacing: 2,
              textTransform: 'uppercase',
            }}>
              {t('home.recent_activity') || 'Recent Activity'}
            </Text>
            {transactions.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/transactions' as any)}>
                <Text style={{ color: theme.colors.gold, fontSize: 11, letterSpacing: 1 }}>
                  {t('home.view_all') || 'See all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Card>
            {transactions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ArrowDownRight color={theme.colors.textFaint} size={20} />
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 8 }}>
                  {t('home.no_activity') || 'No recent activity'}
                </Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <View
                  key={tx.id}
                  style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {tx.direction === 'incoming' ? (
                      <ArrowDownRight color={theme.colors.success} size={16} />
                    ) : (
                      <ArrowUpRight color={theme.colors.warning} size={16} />
                    )}
                    <View>
                      <Text style={{ color: theme.colors.text, fontSize: 13 }}>{tx.asset}</Text>
                      <Text style={{ color: theme.colors.textFaint, fontSize: 10 }}>
                        {tx.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.text, fontSize: 13 }}>
                    {formatCrypto(tx.amount, tx.asset)}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
