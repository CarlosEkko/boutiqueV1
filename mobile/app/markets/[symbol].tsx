import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, TrendingDown, ShoppingCart, ArrowDownToLine } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { theme } from '@/theme';
import { Button, Card, Row } from '@/components/ui';
import { fetchPriceQuote, type PriceQuote } from '@/api/trading';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 40;
const CHART_H = 160;

// Generate a synthetic 24h price-trend curve from current price (until backend candles are wired).
function generateTrend(price: number, points = 30): number[] {
  const arr: number[] = [];
  let v = price * 0.97;
  for (let i = 0; i < points; i++) {
    v = v * (1 + (Math.random() - 0.49) * 0.012);
    arr.push(v);
  }
  arr[arr.length - 1] = price;
  return arr;
}

function buildPath(points: number[], width: number, height: number): { line: string; area: string } {
  if (points.length === 0) return { line: '', area: '' };
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: height - ((p - min) / range) * height * 0.9 - 5,
  }));

  const line = coords.reduce((acc, { x, y }, i) =>
    acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`), '');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return { line, area };
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

export default function MarketDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetchPriceQuote(symbol, 'EUR')
      .then(setQuote)
      .finally(() => setLoading(false));
  }, [symbol]);

  const trend = useMemo(() => quote ? generateTrend(quote.price) : [], [quote]);
  const path = useMemo(() => buildPath(trend, CHART_W, CHART_H), [trend]);
  const trendUp = trend.length > 1 && trend[trend.length - 1] >= trend[0];
  const stroke = trendUp ? theme.colors.success : theme.colors.danger;

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
          {symbol}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {loading || !quote ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Hero price */}
            <Card>
              <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5 }}>
                {(t('markets.currentPrice') || 'CURRENT PRICE').toUpperCase()}
              </Text>
              <Text style={{
                color: theme.colors.gold,
                fontSize: 38, fontWeight: '300',
                marginTop: 6, letterSpacing: -0.5,
              }} testID="quote-price">
                {formatPrice(quote.price)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {trendUp ? (
                  <TrendingUp color={theme.colors.success} size={12} />
                ) : (
                  <TrendingDown color={theme.colors.danger} size={12} />
                )}
                <Text style={{ color: stroke, fontSize: 11 }}>
                  {t('markets.simulated_trend') || 'Simulated 24h trend'}
                </Text>
              </View>
            </Card>

            {/* Chart */}
            <Card style={{ paddingHorizontal: 0, paddingTop: 12, paddingBottom: 0 }}>
              <Svg width={CHART_W} height={CHART_H}>
                <Defs>
                  <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={stroke} stopOpacity="0.35" />
                    <Stop offset="1" stopColor={stroke} stopOpacity="0" />
                  </SvgGradient>
                </Defs>
                <Path d={path.area} fill="url(#grad)" />
                <Path d={path.line} stroke={stroke} strokeWidth={2} fill="none" />
              </Svg>
            </Card>

            {/* Buy / Sell quote */}
            <Card>
              <Row label={t('markets.buyPrice') || 'Buy at'}
                   value={formatPrice(quote.price_buy)}
                   color={theme.colors.success} />
              <Row label={t('markets.sellPrice') || 'Sell at'}
                   value={formatPrice(quote.price_sell)}
                   color={theme.colors.warning} />
              <Row label={t('markets.spread') || 'Spread'}
                   value={`${(((quote.price_buy - quote.price_sell) / quote.price) * 100).toFixed(2)}%`} />
            </Card>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={t('markets.buy') || 'Buy'}
                  onPress={() => router.push(`/trade/${symbol}?side=buy` as any)}
                  testID="action-buy"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/trade/${symbol}?side=sell` as any)}
                  activeOpacity={0.8}
                  testID="action-sell"
                  style={{
                    backgroundColor: theme.colors.surface,
                    paddingVertical: 14,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.borderStrong,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowDownToLine size={14} color={theme.colors.text} />
                  <Text style={{ color: theme.colors.text, fontWeight: '600', fontSize: 15 }}>
                    {t('markets.sell') || 'Sell'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 }}>
              <ShoppingCart color={theme.colors.textFaint} size={12} />
              <Text style={{ color: theme.colors.textFaint, fontSize: 11 }}>
                {t('markets.note_quote') || 'Quote refreshes on screen open'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
