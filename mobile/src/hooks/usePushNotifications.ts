import { useEffect, useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api } from '@/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Route a push notification tap to the correct in-app screen.
 * Safe to call from cold-start (initial) or warm-start (response listener) paths.
 */
export function routeFromNotificationData(data: Record<string, any> | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  const type = typeof data.type === 'string' ? data.type : '';
  try {
    switch (type) {
      case 'price_alert':
        router.push('/alerts' as any);
        return true;
      case 'otc_chat': {
        const dealId = data.deal_id;
        if (dealId) router.push(`/otc/${dealId}` as any);
        else router.push('/(tabs)/otc' as any);
        return true;
      }
      case 'order_filled':
        router.push('/transactions' as any);
        return true;
      case 'withdrawal_approved':
      case 'withdrawal_rejected':
        router.push('/transactions' as any);
        return true;
      default:
        return false;
    }
  } catch (err) {
     
    console.warn('[push] deep-link failed:', err);
    return false;
  }
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens require a real device — Expo Go on simulators won't get one.
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#D4AF37',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    (Constants.easConfig as any)?.projectId;
  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch (err) {
    // Expo Go on iOS without an EAS projectId throws here — that's expected and harmless.
     
    console.warn('[push] could not get Expo push token:', err);
    return null;
  }
}

async function syncTokenWithBackend(token: string) {
  try {
    await api.post('/auth/push-token', { token, platform: Platform.OS });
  } catch {
    // Backend route is optional in M2 — we silently ignore until M2.5 wires it up.
  }
}

interface PushState {
  token: string | null;
  permissionGranted: boolean;
  lastNotification: Notifications.Notification | null;
}

export const usePushNotifications = (signedIn: boolean): PushState => {
  const [token, setToken] = useState<string | null>(null);
  const [permissionGranted, setPermission] = useState(false);
  const [lastNotification, setLast] = useState<Notifications.Notification | null>(null);

  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;
    registerForPushNotifications().then((tok) => {
      if (cancelled) return;
      setPermission(!!tok);
      setToken(tok);
      if (tok) syncTokenWithBackend(tok);
    });

    receivedListener.current = Notifications.addNotificationReceivedListener(
      (notification) => setLast(notification)
    );
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        routeFromNotificationData(response.notification.request.content.data);
      }
    );

    // Cold-start case: app was launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (cancelled || !resp) return;
      // Give Expo Router a tick so the root layout is mounted before we push.
      setTimeout(() => {
        routeFromNotificationData(resp.notification.request.content.data);
      }, 300);
    });

    return () => {
      cancelled = true;
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [signedIn]);

  return { token, permissionGranted, lastNotification };
};

export const sendLocalTestNotification = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: req } = await Notifications.requestPermissionsAsync();
    if (req !== 'granted') {
      Alert.alert('Notifications', 'Permission denied');
      return;
    }
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'KBEX',
      body: 'Push pipeline working ✓',
      data: { test: true },
    },
    trigger: null,
  });
};
