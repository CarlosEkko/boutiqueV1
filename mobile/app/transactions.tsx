import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Activity } from 'lucide-react-native';
import { theme } from '@/theme';
import { Card } from '@/components/ui';
import { useWallets } from '@/hooks/useWallets';

const formatCrypto = (n: number, asset: string) =>
  `${n.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${asset}`;

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { transactions, loading, refresh } = useWallets();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft color={theme.colors.gold} size={22} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.gold, fontSize: 18, letterSpacing: 1.5, fontWeight: '300' }}>
          {t('transactions.title') || 'Transactions'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.gold} />
        ) : transactions.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Activity color={theme.colors.textFaint} size={28} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 10 }}>
                {t('transactions.empty') || 'No transactions yet'}
              </Text>
            </View>
          </Card>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} style={{ paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: tx.direction === 'incoming' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tx.direction === 'incoming' ? (
                      <ArrowDownRight color={theme.colors.success} size={18} />
                    ) : (
                      <ArrowUpRight color={theme.colors.warning} size={18} />
                    )}
                  </View>
                  <View>
                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
                      {tx.asset_name || tx.asset}
                    </Text>
                    <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
                      {formatDate(tx.created_at)} · {tx.status}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
                    {formatCrypto(tx.amount, tx.asset)}
                  </Text>
                  {!!tx.amount_usd && (
                    <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
                      ≈ ${tx.amount_usd.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
