import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Home, TrendingUp, Briefcase, User, Handshake } from 'lucide-react-native';
import { theme } from '@/theme';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.gold,
        headerTitleStyle: { letterSpacing: 2, fontWeight: '300' },
        tabBarStyle: {
          backgroundColor: theme.colors.bgElevated,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: theme.colors.gold,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home') || 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size - 2} />,
          headerTitle: 'KBEX',
        }}
      />
      <Tabs.Screen
        name="markets"
        options={{
          title: t('nav.markets') || 'Markets',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="otc"
        options={{
          title: 'OTC',
          tabBarIcon: ({ color, size }) => <Handshake color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: t('nav.wallet') || 'Carteira',
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size - 2} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile') || 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
