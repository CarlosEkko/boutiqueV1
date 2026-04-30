import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingCart, ArrowDownToLine } from 'lucide-react-native';
import { theme } from '@/theme';
import { Card } from '@/components/ui';
import { useOrders } from '@/hooks/useMarkets';

const formatPrice = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const STATUS_COLOR: Record<string, string> = {
  pending: theme.colors.warning,
  processing: theme.colors.warning,
  completed: theme.colors.success,
  filled: theme.colors.success,
  cancelled: theme.colors.danger,
  rejected: theme.colors.danger,
  failed: theme.colors.danger,
};

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { orders, loading, refresh } = useOrders();

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
          {t('orders.title') || 'Orders'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.gold} />
        ) : orders.length === 0 ? (
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <ShoppingCart color={theme.colors.textFaint} size={28} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 10 }}>
                {t('orders.empty') || 'No orders yet'}
              </Text>
            </View>
          </Card>
        ) : (
          orders.map((o) => {
            const statusColor = STATUS_COLOR[o.status?.toLowerCase()] || theme.colors.textMuted;
            const isBuy = o.type === 'buy';
            return (
              <Card key={o.id} style={{ paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: isBuy ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isBuy ? (
                        <ShoppingCart color={theme.colors.success} size={14} />
                      ) : (
                        <ArrowDownToLine color={theme.colors.warning} size={14} />
                      )}
                    </View>
                    <View>
                      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '500' }}>
                        {o.type.toUpperCase()} · {o.asset}
                      </Text>
                      <Text style={{ color: theme.colors.textFaint, fontSize: 10, marginTop: 2 }}>
                        {formatDate(o.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '500' }}>
                      {o.fiat_amount ? formatPrice(o.fiat_amount, o.fiat_currency || 'EUR') : `${o.amount} ${o.asset}`}
                    </Text>
                    <Text style={{ color: statusColor, fontSize: 10, marginTop: 2, fontWeight: '500' }}>
                      {o.status}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
