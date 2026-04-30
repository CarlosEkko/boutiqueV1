import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '@/theme';
import { Button, Card, Row } from '@/components/ui';
import { fetchPriceQuote, placeBuyOrder, placeSellOrder, type PriceQuote } from '@/api/trading';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

export default function TradeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { symbol, side } = useLocalSearchParams<{ symbol: string; side: 'buy' | 'sell' }>();
  const isBuy = side === 'buy';

  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [amount, setAmount] = useState(''); // EUR for buy, asset units for sell
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    fetchPriceQuote(symbol, 'EUR').then(setQuote);
  }, [symbol]);

  const numAmount = parseFloat(amount) || 0;
  const previewAsset = quote && numAmount > 0 ? (numAmount / quote.price_buy) : 0;
  const previewFiat = quote && numAmount > 0 ? (numAmount * quote.price_sell) : 0;

  const onSubmit = async () => {
    if (!quote || !numAmount) return;
    setSubmitting(true);
    try {
      if (isBuy) {
        await placeBuyOrder({ asset: symbol, fiat_currency: 'EUR', fiat_amount: numAmount });
      } else {
        await placeSellOrder({ asset: symbol, fiat_currency: 'EUR', amount: numAmount });
      }
      Alert.alert(
        t('trade.successTitle') || 'Order Placed',
        t('trade.successMsg') || 'Your order has been submitted.',
        [{ text: 'OK', onPress: () => router.replace('/orders' as any) }]
      );
    } catch (err: any) {
      Alert.alert(
        t('trade.errorTitle') || 'Order Failed',
        err?.response?.data?.detail || err?.message || 'Unknown error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!quote) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.gold} />
      </SafeAreaView>
    );
  }

  const cta = isBuy
    ? (t('trade.buyCta') || `Buy ${symbol}`)
    : (t('trade.sellCta') || `Sell ${symbol}`);

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
          {isBuy ? (t('trade.buyTitle') || 'Buy') : (t('trade.sellTitle') || 'Sell')} {symbol}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card>
          <Row label={t('markets.currentPrice') || 'Price'} value={formatPrice(quote.price)} color={theme.colors.gold} />
          <Row label={t('markets.buyPrice') || 'Buy at'} value={formatPrice(quote.price_buy)} />
          <Row label={t('markets.sellPrice') || 'Sell at'} value={formatPrice(quote.price_sell)} />
        </Card>

        <Card>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 }}>
            {(isBuy
              ? (t('trade.amountInEur') || 'AMOUNT (EUR)')
              : (t('trade.amountInAsset') || `AMOUNT (${symbol})`)
            ).toUpperCase()}
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={isBuy ? '100' : '0.01'}
            placeholderTextColor={theme.colors.textFaint}
            style={{
              color: theme.colors.gold,
              fontSize: 28,
              fontWeight: '300',
              paddingVertical: 8,
            }}
            testID="trade-amount-input"
          />
          {numAmount > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
              {isBuy ? (
                <Row label={t('trade.youReceive') || 'You receive'}
                     value={`${previewAsset.toFixed(8)} ${symbol}`}
                     color={theme.colors.success} />
              ) : (
                <Row label={t('trade.youReceive') || 'You receive'}
                     value={formatPrice(previewFiat)}
                     color={theme.colors.success} />
              )}
            </View>
          )}
        </Card>

        <Button
          label={submitting ? (t('commonModal.submitting') || 'Submitting…') : cta}
          onPress={onSubmit}
          loading={submitting}
          disabled={!numAmount || submitting}
          testID="trade-submit-btn"
        />
        <Text style={{ color: theme.colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
          {t('trade.disclaimer') || 'Order is sent to KBEX desk for confirmation.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
