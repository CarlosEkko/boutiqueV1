import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, TouchableOpacity,
  ActivityIndicator, Alert as RNAlert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Bell, BellOff, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react-native';
import { theme } from '@/theme';
import { Button } from '@/components/ui';
import { fetchMyAlerts, deleteAlert, type PriceAlert } from '@/api/alerts';

const formatPrice = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

export default function AlertsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyAlerts(true);
      setAlerts(data);
    } catch {
      // fail soft
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onDelete = useCallback((id: string, asset: string) => {
    RNAlert.alert(
      t('alerts.deleteConfirmTitle') || 'Eliminar Alerta',
      t('alerts.deleteConfirmMsg', { asset }) || `Eliminar alerta ${asset}?`,
      [
        { text: t('commonModal.cancel') || 'Cancelar', style: 'cancel' },
        {
          text: t('commonModal.delete') || 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteAlert(id);
            await load();
          },
        },
      ]
    );
  }, [load, t]);

  const active = alerts.filter(a => a.is_active);
  const triggered = alerts.filter(a => !a.is_active && a.triggered_at);

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
          {t('alerts.title') || 'Alertas de Preço'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.gold} />}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 32 }} />
        ) : alerts.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 64, gap: 12 }}>
            <Bell color={theme.colors.textFaint} size={42} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' }}>
              {t('alerts.empty') || 'Sem alertas configurados'}
            </Text>
            <Text style={{ color: theme.colors.textFaint, fontSize: 12, textAlign: 'center', marginHorizontal: 24 }}>
              {t('alerts.emptyHint') || 'Abra um mercado e toque em "Definir Alerta" para receber notificação push quando o preço atingir o seu objetivo.'}
            </Text>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>
                  {(t('alerts.sectionActive') || 'ACTIVE').toUpperCase()} · {active.length}
                </Text>
                {active.map((a) => (
                  <AlertRow key={a.id} alert={a} onDelete={onDelete} />
                ))}
              </>
            )}

            {triggered.length > 0 && (
              <>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginTop: 24, marginBottom: 12 }}>
                  {(t('alerts.sectionTriggered') || 'TRIGGERED').toUpperCase()} · {triggered.length}
                </Text>
                {triggered.map((a) => (
                  <AlertRow key={a.id} alert={a} onDelete={onDelete} triggered />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
        <Button
          label={t('alerts.openMarkets') || 'Explorar Mercados'}
          variant="ghost"
          onPress={() => router.push('/(tabs)/markets' as any)}
          testID="alerts-open-markets-btn"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

interface RowProps {
  alert: PriceAlert;
  onDelete: (id: string, asset: string) => void;
  triggered?: boolean;
}

const AlertRow: React.FC<RowProps> = ({ alert, onDelete, triggered }) => {
  const isUp = alert.direction === 'above';
  const accent = triggered ? theme.colors.success : (isUp ? theme.colors.gold : theme.colors.gold);
  return (
    <View
      testID={`alert-row-${alert.id}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: triggered ? theme.colors.border : theme.colors.gold + '33',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: theme.colors.bg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: accent,
      }}>
        {triggered ? (
          <CheckCircle2 color={theme.colors.success} size={18} />
        ) : isUp ? (
          <ArrowUp color={theme.colors.gold} size={18} />
        ) : (
          <ArrowDown color={theme.colors.gold} size={18} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
          {alert.asset} {isUp ? '≥' : '≤'} {formatPrice(alert.target_price, alert.currency)}
        </Text>
        {triggered && alert.triggered_price !== null && (
          <Text style={{ color: theme.colors.success, fontSize: 11, marginTop: 2 }}>
            ✓ Disparado a {formatPrice(alert.triggered_price, alert.currency)}
            {alert.triggered_at ? ` · ${formatDate(alert.triggered_at)}` : ''}
          </Text>
        )}
        {!triggered && alert.note && (
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            {alert.note}
          </Text>
        )}
        {!triggered && !alert.note && (
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
            {formatDate(alert.created_at)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onDelete(alert.id, alert.asset)}
        hitSlop={10}
        testID={`alert-delete-${alert.id}`}
      >
        {triggered ? (
          <Trash2 color={theme.colors.textFaint} size={18} />
        ) : (
          <BellOff color={theme.colors.textFaint} size={18} />
        )}
      </TouchableOpacity>
    </View>
  );
};
