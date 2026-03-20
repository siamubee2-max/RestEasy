/**
 * RestEasy — HomeScreen (Dashboard)
 * - Contextual greeting ("Good evening, Sarah")
 * - Central progress ring (Week 3 of 6) with starry background
 * - Sleep Window card (11:30 PM – 6:00 AM)
 * - Two action buttons: Morning Journal + Night Mode
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ProgressRing } from '../components/ProgressRing';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const STARS_BG = {
  uri: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663144691943/KeM4cPFcdXg2oxRYScUCPs/resteasy-stars-bg-cTGfEoh6vJuezNjkhUoP85.webp',
};

interface HomeScreenProps {
  navigation: any;
  userName?: string;
  currentWeek?: number;
  sleepWindowStart?: string;
  sleepWindowEnd?: string;
}

function getGreeting(name: string, t: any): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t('home.greeting_morning', { name });
  if (hour >= 12 && hour < 17) return t('home.greeting_afternoon', { name });
  if (hour >= 17 && hour < 21) return t('home.greeting_evening', { name });
  return t('home.greeting_night', { name });
}

function formatWindowTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function HomeScreen({
  navigation,
  userName = 'Sarah',
  currentWeek = 3,
  sleepWindowStart = '23:30',
  sleepWindowEnd = '06:00',
}: HomeScreenProps) {
  const { t } = useTranslation();
  const greeting = useMemo(() => getGreeting(userName, t), [userName, t]);

  return (
    <View style={styles.container}>
      <ImageBackground source={STARS_BG} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={['rgba(11,29,58,0.3)', colors.deepNavy]}
          style={StyleSheet.absoluteFill}
          locations={[0, 0.7]}
        />

        <SafeAreaView style={styles.safe}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Greeting */}
            <Text style={styles.greeting}>{greeting}</Text>

            {/* Progress Ring */}
            <View style={styles.ringWrapper}>
              <ProgressRing currentWeek={currentWeek} size={220} />
            </View>

            {/* Sleep Window Card */}
            <View style={styles.windowCard}>
              <Text style={styles.windowLabel}>{t('home.sleep_window')}</Text>
              <Text style={styles.windowTime}>
                {formatWindowTime(sleepWindowStart)} — {formatWindowTime(sleepWindowEnd)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('Journal')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>☀️</Text>
                <Text style={styles.actionLabel}>{t('home.morning_journal')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate('Night')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>🌙</Text>
                <Text style={styles.actionLabel}>{t('home.night_mode')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  bg: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },

  greeting: {
    ...typography.h1,
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 28,
  },

  ringWrapper: {
    marginBottom: 28,
    // Subtle glow behind ring
    shadowColor: colors.softLavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },

  windowCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 47, 84, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  windowLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  windowTime: {
    ...typography.h2,
    color: colors.warmPeach,
    letterSpacing: 1,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 47, 84, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
