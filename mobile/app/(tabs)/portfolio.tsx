import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Card, Row } from '@/components/ui';
import { Briefcase } from 'lucide-react-native';

export default function PortfolioScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5 }}>
            {(t('home.portfolio_value') || 'TOTAL VALUE').toUpperCase()}
          </Text>
          <Text style={{ color: theme.colors.gold, fontSize: 34, fontWeight: '300', marginTop: 6 }}>
            €0.00
          </Text>
        </Card>
        <Card>
          <Text style={{ color: theme.colors.text, fontSize: 14, marginBottom: 12, fontWeight: '500' }}>
            {t('portfolio.holdings') || 'Holdings'}
          </Text>
          <Row label="BTC" value="0.00" />
          <Row label="ETH" value="0.00" />
          <Row label="USDT" value="0.00" />
          <Row label="EUR" value="€0.00" />
        </Card>
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Briefcase color={theme.colors.textFaint} size={20} />
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 6 }}>
            Coming in M2 — Live wallet balances
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
