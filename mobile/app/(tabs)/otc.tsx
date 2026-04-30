import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Handshake, MessageCircle, ChevronRight } from 'lucide-react-native';
import { theme } from '@/theme';
import { fetchMyOtcDeals, type OtcDealSummary } from '@/api/otcChat';

const formatCurrency = (n?: number) => {
  if (n === undefined || n === null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

const formatRelative = (iso?: string | null) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'agora';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h`;
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
};

export default function OTCScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [deals, setDeals] = useState<OtcDealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyOtcDeals();
      setDeals(data);
    } catch {
      // fail-soft
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: theme.colors.gold, fontSize: 22, fontWeight: '300', letterSpacing: 1.5 }}>
          {t('otcChat.title') || 'OTC Desk'}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
          {t('otcChat.subtitle') || 'Mensagens diretas com a sua mesa OTC'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 48 }} />
        ) : deals.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 64, paddingHorizontal: 24, gap: 14 }}>
            <Handshake color={theme.colors.textFaint} size={42} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' }}>
              {t('otcChat.empty') || 'Sem deals OTC ativos'}
            </Text>
            <Text style={{ color: theme.colors.textFaint, fontSize: 12, textAlign: 'center' }}>
              {t('otcChat.emptyHint') || 'Quando a mesa OTC abrir um deal seu, vai aparecer aqui para conversar diretamente.'}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            {deals.map((d) => (
              <DealRow
                key={d.id}
                deal={d}
                onPress={() => router.push(`/otc/${d.id}` as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const DealRow: React.FC<{ deal: OtcDealSummary; onPress: () => void }> = ({ deal, onPress }) => {
  const isBuy = deal.deal_type === 'buy';
  const sideColor = isBuy ? theme.colors.success : theme.colors.warning;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={`otc-deal-${deal.id}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: deal.unread_count > 0 ? theme.colors.gold + '55' : theme.colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.bg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.gold + '55',
      }}>
        <MessageCircle color={theme.colors.gold} size={20} />
        {deal.unread_count > 0 && (
          <View style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 18, height: 18, borderRadius: 9,
            backgroundColor: theme.colors.gold,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 4,
          }}>
            <Text style={{ color: '#0a0a0a', fontSize: 10, fontWeight: '700' }}>
              {deal.unread_count}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
            {deal.deal_number || deal.id.slice(0, 8)}
          </Text>
          {deal.deal_type && (
            <Text style={{ color: sideColor, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
              {deal.deal_type.toUpperCase()}
            </Text>
          )}
          {deal.asset && (
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              · {deal.quantity} {deal.asset}
            </Text>
          )}
        </View>
        {deal.last_message_preview ? (
          <Text style={{ color: theme.colors.textFaint, fontSize: 12 }} numberOfLines={1}>
            {deal.last_message_preview}
          </Text>
        ) : (
          <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
            {deal.client_name} · {formatCurrency(deal.total_value)}
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ color: theme.colors.textFaint, fontSize: 10 }}>
          {formatRelative(deal.last_message_at)}
        </Text>
        <ChevronRight color={theme.colors.textFaint} size={14} />
      </View>
    </TouchableOpacity>
  );
};
