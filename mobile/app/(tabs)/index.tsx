import React, { useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownRight, Plus, ArrowUp, ArrowDown, Activity } from 'lucide-react-native';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/theme';
import { Card, Row } from '@/components/ui';

const { width } = Dimensions.get('window');

/**
 * Home screen — combines:
 *  - Hero balance card
 *  - Quick-action widget (Depositar / Levantar / Comprar / Vender)
 *  - Swipeable carousel of sections (Visão Geral / Mercados / Portfólio)
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

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
              €0.00
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
              <ArrowUpRight color={theme.colors.success} size={14} />
              <Text style={{ color: theme.colors.success, fontSize: 13 }}>0.00%</Text>
              <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>· 24h</Text>
            </View>
          </Card>
        </View>

        {/* Quick actions widget */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            {[
              { icon: ArrowDown, label: t('home.deposit') || 'Deposit' },
              { icon: ArrowUp, label: t('home.withdraw') || 'Withdraw' },
              { icon: Plus, label: t('home.buy') || 'Buy' },
              { icon: Activity, label: t('home.trade') || 'Trade' },
            ].map(({ icon: Icon, label }, i) => (
              <View
                key={i}
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
              </View>
            ))}
          </View>
        </View>

        {/* Swipeable section carousel (3 pages) */}
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
          {[
            { title: t('nav.markets') || 'Markets', subtitle: t('home.markets_sub') || 'Top movers · 24h', },
            { title: t('dashboard.portfolio') || 'Portfolio', subtitle: t('home.portfolio_sub') || 'Your holdings', },
            { title: 'OTC', subtitle: t('home.otc_sub') || 'Block trades · Private deals', },
          ].map((section, i) => (
            <Card key={i} style={{ width: width - 40, marginRight: 4 }}>
              <Text style={{ color: theme.colors.gold, fontSize: 13, letterSpacing: 1.5, fontWeight: '500' }}>
                {section.title.toUpperCase()}
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>
                {section.subtitle}
              </Text>
              <View style={{ marginTop: 16, gap: 4 }}>
                <Row label="BTC/USD" value="—" />
                <Row label="ETH/USD" value="—" />
                <Row label="USDT/USD" value="—" />
              </View>
            </Card>
          ))}
        </ScrollView>

        {/* Recent activity placeholder */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text style={{
            color: theme.colors.textMuted, fontSize: 11, letterSpacing: 2,
            marginBottom: 10, textTransform: 'uppercase',
          }}>
            {t('home.recent_activity') || 'Recent Activity'}
          </Text>
          <Card>
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ArrowDownRight color={theme.colors.textFaint} size={20} />
              <Text style={{ color: theme.colors.textMuted, fontSize: 13, marginTop: 8 }}>
                {t('home.no_activity') || 'No recent activity'}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
