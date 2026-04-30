import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, TrendingDown } from 'lucide-react-native';
import { theme } from '@/theme';
import { useMarkets } from '@/hooks/useMarkets';

const formatPrice = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const formatPct = (n?: number) => {
  if (n === undefined || n === null || isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
};

export default function MarketsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const { markets, loading, refresh } = useMarkets('EUR');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter((m) =>
      m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [markets, query]);

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          paddingHorizontal: 12, paddingVertical: 10,
          borderWidth: 1, borderColor: theme.colors.border,
        }}>
          <Search color={theme.colors.textFaint} size={16} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('markets.searchPh') || 'Search asset…'}
            placeholderTextColor={theme.colors.textFaint}
            autoCapitalize="characters"
            style={{ flex: 1, color: theme.colors.text, fontSize: 14 }}
            testID="markets-search-input"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ color: theme.colors.textFaint, textAlign: 'center', marginTop: 32 }}>
            {t('markets.empty') || 'No markets available'}
          </Text>
        ) : (
          filtered.map((m) => {
            const change = m.change_24h_pct;
            const isUp = (change ?? 0) >= 0;
            return (
              <TouchableOpacity
                key={m.symbol}
                activeOpacity={0.7}
                onPress={() => router.push(`/markets/${m.symbol}` as any)}
                style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
                }}
                testID={`market-row-${m.symbol}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: theme.colors.border,
                  }}>
                    <Text style={{ color: theme.colors.gold, fontSize: 11, fontWeight: '600' }}>
                      {m.symbol.slice(0, 3)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
                      {m.symbol}
                    </Text>
                    <Text style={{ color: theme.colors.textFaint, fontSize: 11 }} numberOfLines={1}>
                      {m.name}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
                    {formatPrice(m.price)}
                  </Text>
                  {change !== undefined && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      {isUp ? (
                        <TrendingUp color={theme.colors.success} size={11} />
                      ) : (
                        <TrendingDown color={theme.colors.danger} size={11} />
                      )}
                      <Text style={{
                        color: isUp ? theme.colors.success : theme.colors.danger,
                        fontSize: 11, fontWeight: '500',
                      }}>
                        {formatPct(change)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
