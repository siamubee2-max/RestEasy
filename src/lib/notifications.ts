/**
 * RestEasy — Notifications Library
 * Personalized push notifications based on each user's sleep window.
 * - Morning reminder: 30 min after wake_time
 * - Bedtime reminder: 30 min before sleep_window_start
 * - Weekly review: Sunday at 09:00 local time
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { captureError } from './sentry';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Permission & Token ───────────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'RestEasy',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B8A9C9',
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await savePushToken(token);
    return token;
  } catch (error) {
    captureError(error as Error, { context: 'registerForPushNotifications' });
    return null;
  }
}

async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ push_token: token, push_token_updated_at: new Date().toISOString() })
    .eq('id', user.id);
}

// ─── Schedule Personalized Notifications ─────────────────────────────────────

interface SleepWindow {
  start_hour: number;   // e.g. 23
  start_minute: number; // e.g. 30
  wake_hour: number;    // e.g. 6
  wake_minute: number;  // e.g. 0
}

export async function schedulePersonalizedNotifications(
  window: SleepWindow,
  locale: string
): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const lang = locale.split('-')[0];

  // ── Morning Journal Reminder ─────────────────────────────────────────────
  // 30 minutes after wake time
  let morningHour = window.wake_hour;
  let morningMinute = window.wake_minute + 30;
  if (morningMinute >= 60) {
    morningHour += 1;
    morningMinute -= 60;
  }
  morningHour = morningHour % 24;

  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-journal',
    content: {
      title: getMorningTitle(lang),
      body: getMorningBody(lang),
      data: { screen: 'Journal', type: 'morning_reminder' },
      sound: 'default',
    },
    trigger: {
      hour: morningHour,
      minute: morningMinute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });

  // ── Bedtime Reminder ─────────────────────────────────────────────────────
  // 30 minutes before sleep window start
  let bedtimeHour = window.start_hour;
  let bedtimeMinute = window.start_minute - 30;
  if (bedtimeMinute < 0) {
    bedtimeHour -= 1;
    bedtimeMinute += 60;
  }
  if (bedtimeHour < 0) bedtimeHour += 24;

  await Notifications.scheduleNotificationAsync({
    identifier: 'bedtime-reminder',
    content: {
      title: getBedtimeTitle(lang),
      body: getBedtimeBody(lang, window.start_hour, window.start_minute),
      data: { screen: 'NightMode', type: 'bedtime_reminder' },
      sound: 'default',
    },
    trigger: {
      hour: bedtimeHour,
      minute: bedtimeMinute,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });

  // ── Weekly Review Reminder ────────────────────────────────────────────────
  // Every Sunday at 09:00
  await Notifications.scheduleNotificationAsync({
    identifier: 'weekly-review',
    content: {
      title: getWeeklyTitle(lang),
      body: getWeeklyBody(lang),
      data: { screen: 'WeeklyReview', type: 'weekly_review' },
      sound: 'default',
    },
    trigger: {
      weekday: 1, // Sunday
      hour: 9,
      minute: 0,
      repeats: true,
    } as Notifications.WeeklyTriggerInput,
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Notification Content ─────────────────────────────────────────────────────

function getMorningTitle(lang: string): string {
  const titles: Record<string, string> = {
    fr: '☀️ Journal du matin',
    en: '☀️ Morning Journal',
    es: '☀️ Diario matutino',
    de: '☀️ Morgentagebuch',
    pt: '☀️ Diário matinal',
    it: '☀️ Diario mattutino',
  };
  return titles[lang] ?? titles.en;
}

function getMorningBody(lang: string): string {
  const bodies: Record<string, string> = {
    fr: 'Comment s\'était votre nuit ? Remplissez votre journal en 60 secondes.',
    en: 'How was your night? Fill in your journal in 60 seconds.',
    es: '¿Cómo fue tu noche? Rellena tu diario en 60 segundos.',
    de: 'Wie war Ihre Nacht? Füllen Sie Ihr Tagebuch in 60 Sekunden aus.',
    pt: 'Como foi a sua noite? Preencha o seu diário em 60 segundos.',
    it: 'Com\'è andata la notte? Compila il tuo diario in 60 secondi.',
  };
  return bodies[lang] ?? bodies.en;
}

function getBedtimeTitle(lang: string): string {
  const titles: Record<string, string> = {
    fr: '🌙 Préparez-vous à dormir',
    en: '🌙 Time to wind down',
    es: '🌙 Hora de prepararse para dormir',
    de: '🌙 Zeit zum Entspannen',
    pt: '🌙 Hora de se preparar para dormir',
    it: '🌙 È ora di prepararsi a dormire',
  };
  return titles[lang] ?? titles.en;
}

function getBedtimeBody(lang: string, hour: number, minute: string | number): string {
  const time = `${hour}:${String(minute).padStart(2, '0')}`;
  const bodies: Record<string, string> = {
    fr: `Votre fenêtre de sommeil commence à ${time}. Commencez à vous détendre.`,
    en: `Your sleep window starts at ${time}. Start winding down.`,
    es: `Tu ventana de sueño comienza a las ${time}. Empieza a relajarte.`,
    de: `Ihr Schlaffenster beginnt um ${time}. Beginnen Sie sich zu entspannen.`,
    pt: `A sua janela de sono começa às ${time}. Comece a relaxar.`,
    it: `La tua finestra del sonno inizia alle ${time}. Inizia a rilassarti.`,
  };
  return bodies[lang] ?? bodies.en;
}

function getWeeklyTitle(lang: string): string {
  const titles: Record<string, string> = {
    fr: '📊 Bilan de la semaine',
    en: '📊 Weekly Review',
    es: '📊 Revisión semanal',
    de: '📊 Wöchentliche Überprüfung',
    pt: '📊 Revisão semanal',
    it: '📊 Revisione settimanale',
  };
  return titles[lang] ?? titles.en;
}

function getWeeklyBody(lang: string): string {
  const bodies: Record<string, string> = {
    fr: 'Votre bilan hebdomadaire est prêt. Découvrez votre progression !',
    en: 'Your weekly review is ready. See your progress!',
    es: '¡Tu revisión semanal está lista. Mira tu progreso!',
    de: 'Ihre wöchentliche Überprüfung ist fertig. Sehen Sie Ihren Fortschritt!',
    pt: 'A sua revisão semanal está pronta. Veja o seu progresso!',
    it: 'La tua revisione settimanale è pronta. Guarda i tuoi progressi!',
  };
  return bodies[lang] ?? bodies.en;
}
