import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { Button, Card, Row } from '@/components/ui';
import { theme } from '@/theme';
import { changeLanguage, SUPPORTED_LANGUAGES } from '@/i18n';
import i18n from '@/i18n';
import { Globe, LogOut, Bell } from 'lucide-react-native';
import { sendLocalTestNotification } from '@/hooks/usePushNotifications';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const confirmLogout = () => {
    Alert.alert(
      t('nav.logout') || 'Logout',
      t('auth.logoutConfirm') || 'Sign out of your account?',
      [
        { text: t('commonModal.cancel') || 'Cancel', style: 'cancel' },
        { text: t('nav.logout') || 'Logout', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5 }}>
            {(t('commonModal.email') || 'EMAIL').toUpperCase()}
          </Text>
          <Text style={{ color: theme.colors.text, fontSize: 16, marginTop: 6 }}>
            {user?.email || '—'}
          </Text>
          <View style={{ height: 12 }} />
          <Row label={t('commonModal.name') || 'Name'} value={user?.full_name || user?.name || '—'} />
          {user?.membership_level && (
            <Row label="Tier" value={String(user.membership_level)} color={theme.colors.gold} />
          )}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Globe color={theme.colors.gold} size={16} />
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
              {t('profile.language') || 'Language'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SUPPORTED_LANGUAGES.map((lng) => {
              const active = i18n.language === lng;
              return (
                <TouchableOpacity
                  key={lng}
                  onPress={() => changeLanguage(lng)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.gold : theme.colors.border,
                    backgroundColor: active ? 'rgba(212,175,55,0.1)' : 'transparent',
                  }}
                  testID={`lang-${lng}`}
                >
                  <Text style={{
                    color: active ? theme.colors.gold : theme.colors.text,
                    fontSize: 12,
                    letterSpacing: 1,
                    fontWeight: active ? '600' : '400',
                  }}>
                    {lng.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bell color={theme.colors.gold} size={16} />
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '500' }}>
              {t('profile.notifications') || 'Notifications'}
            </Text>
          </View>
          <Button
            label={t('profile.test_push') || 'Send test notification'}
            onPress={sendLocalTestNotification}
            variant="ghost"
            testID="test-push-btn"
          />
        </Card>

        <Card>
          <Button
            label={t('profile.my_orders') || 'My Orders'}
            onPress={() => (require('expo-router').router.push('/orders'))}
            variant="ghost"
            testID="my-orders-btn"
          />
        </Card>

        <View style={{ marginTop: 8 }}>
          <Button
            label={t('nav.logout') || 'Logout'}
            onPress={confirmLogout}
            variant="ghost"
            testID="logout-btn"
          />
          <View style={{ alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <LogOut color={theme.colors.textFaint} size={12} />
            <Text style={{ color: theme.colors.textFaint, fontSize: 11 }}>KBEX · v0.1.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
