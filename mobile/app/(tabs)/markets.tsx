import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { Card } from '@/components/ui';
import { TrendingUp } from 'lucide-react-native';

export default function MarketsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <TrendingUp color={theme.colors.gold} size={32} />
            <Text style={{ color: theme.colors.text, fontSize: 18, marginTop: 12, fontWeight: '300' }}>
              {t('nav.markets') || 'Markets'}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 6 }}>
              Coming in M3 — Trading Terminal
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
