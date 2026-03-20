/**
 * RestEasy — ProfileScreen
 * Program progress, settings, language, notifications, sign out.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { signOut } from '../lib/supabase';

interface ProfileScreenProps {
  navigation: any;
  userName?: string;
  currentWeek?: number;
  programStartDate?: string;
}

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, value, onPress, danger }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={[styles.settingLabel, danger && styles.settingDanger]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {!danger && <Text style={styles.settingChevron}>›</Text>}
    </TouchableOpacity>
  );
}

export function ProfileScreen({
  navigation,
  userName = 'Sarah',
  currentWeek = 3,
  programStartDate,
}: ProfileScreenProps) {
  const { t, i18n } = useTranslation();

  const handleSignOut = () => {
    Alert.alert(
      t('profile.sign_out'),
      'Êtes-vous sûr(e) de vouloir vous déconnecter ?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.sign_out'),
          style: 'destructive',
          onPress: async () => {
            try { await signOut(); } catch {}
          },
        },
      ]
    );
  };

  const handleLanguage = () => {
    Alert.alert('Langue', 'Choisissez votre langue', [
      { text: 'Français', onPress: () => i18n.changeLanguage('fr') },
      { text: 'English', onPress: () => i18n.changeLanguage('en') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const weekProgress = (currentWeek / 6) * 100;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar & name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            {programStartDate && (
              <Text style={styles.startedDate}>
                {t('profile.started', { date: programStartDate })}
              </Text>
            )}
          </View>

          {/* Program Progress */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.program_progress')}</Text>
            <Text style={styles.weekLabel}>
              {t('profile.week_of', { current: currentWeek, total: 6 })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${weekProgress}%` }]} />
            </View>
            <View style={styles.weekDots}>
              {[1, 2, 3, 4, 5, 6].map(w => (
                <View
                  key={w}
                  style={[
                    styles.weekDot,
                    w <= currentWeek && styles.weekDotActive,
                    w === currentWeek && styles.weekDotCurrent,
                  ]}
                >
                  <Text style={[
                    styles.weekDotLabel,
                    w <= currentWeek && styles.weekDotLabelActive,
                  ]}>
                    {w}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Settings */}
          <View style={styles.card}>
            <SettingRow
              icon="🔔"
              label={t('profile.notifications')}
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🌐"
              label={t('profile.language')}
              value={i18n.language === 'fr' ? 'Français' : 'English'}
              onPress={handleLanguage}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🔒"
              label={t('profile.privacy')}
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="💬"
              label={t('profile.support')}
              onPress={() => {}}
            />
          </View>

          {/* Sign out */}
          <View style={styles.card}>
            <SettingRow
              icon="↩"
              label={t('profile.sign_out')}
              onPress={handleSignOut}
              danger
            />
          </View>

          <Text style={styles.version}>
            {t('profile.version', { version: '1.0.0' })}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(184, 169, 201, 0.2)',
    borderWidth: 2,
    borderColor: colors.softLavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    ...typography.h1,
    color: colors.softLavender,
  },
  userName: {
    ...typography.h2,
    color: colors.cream,
    marginBottom: 4,
  },
  startedDate: {
    ...typography.small,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.navyMid,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.smallMedium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  weekLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(184, 169, 201, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.softLavender,
    borderRadius: 3,
  },
  weekDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(184, 169, 201, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotActive: {
    backgroundColor: 'rgba(184, 169, 201, 0.25)',
  },
  weekDotCurrent: {
    backgroundColor: 'rgba(245, 199, 169, 0.25)',
    borderWidth: 1.5,
    borderColor: colors.warmPeach,
  },
  weekDotLabel: {
    ...typography.smallMedium,
    color: colors.textMuted,
    fontSize: 12,
  },
  weekDotLabelActive: {
    color: colors.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  settingIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  settingLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  settingDanger: {
    color: colors.error,
  },
  settingValue: {
    ...typography.small,
    color: colors.textSecondary,
  },
  settingChevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  version: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
