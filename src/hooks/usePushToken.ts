/**
 * RestEasy — usePushToken Hook
 * Handles push notification registration and deep link navigation.
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { registerForPushNotifications } from '../lib/notifications';
import { Analytics } from '../lib/posthog';

export function usePushToken() {
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register and save token
    registerForPushNotifications().then(token => {
      if (token) {
        Analytics.track('push_token_registered', { token_prefix: token.slice(0, 20) });
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      Analytics.track('push_notification_received', {
        type: notification.request.content.data?.type,
      });
    });

    // Handle notification tap — navigate to relevant screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      Analytics.track('push_notification_tapped', { type: data?.type, screen: data?.screen });

      if (data?.screen) {
        setTimeout(() => {
          navigation.navigate(data.screen);
        }, 500);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);
}
