/**
 * RestEasy — TherapyScreen
 * 6 cognitive modules, unlocked week by week.
 * Locked modules show "Unlocked week X" label.
 * Completed modules show a sage checkmark.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Module {
  id: string;
  week: number;
  icon: string;
  duration: string;
}

const MODULES: Module[] = [
  { id: 's1_sleep_education', week: 1, icon: '🌙', duration: '8 min' },
  { id: 's2_sleep_restriction', week: 2, icon: '⏰', duration: '10 min' },
  { id: 's3_cognitive_restructuring', week: 3, icon: '🧠', duration: '12 min' },
  { id: 's4_stimulus_control', week: 4, icon: '🛏', duration: '8 min' },
  { id: 's5_relaxation', week: 5, icon: '🌊', duration: '15 min' },
  { id: 's6_relapse_prevention', week: 6, icon: '🛡', duration: '10 min' },
];

interface TherapyScreenProps {
  navigation: any;
  currentWeek?: number;
  completedModules?: string[];
}

export function TherapyScreen({
  navigation,
  currentWeek = 3,
  completedModules = ['s1_sleep_education', 's2_sleep_restriction'],
}: TherapyScreenProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('therapy.title')}</Text>
          <Text style={styles.subtitle}>{t('therapy.subtitle')}</Text>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedModules.length / 6) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {completedModules.length} / 6 modules complétés
          </Text>

          {/* Module list */}
          {MODULES.map((mod) => {
            const isUnlocked = mod.week <= currentWeek;
            const isCompleted = completedModules.includes(mod.id);
            const isCurrent = mod.week === currentWeek && !isCompleted;

            return (
              <TouchableOpacity
                key={mod.id}
                style={[
                  styles.moduleCard,
                  !isUnlocked && styles.moduleCardLocked,
                  isCurrent && styles.moduleCardCurrent,
                ]}
                disabled={!isUnlocked}
                activeOpacity={0.8}
                onPress={() => {
                  // Navigate to module detail (future screen)
                }}
              >
                {/* Left: icon */}
                <View style={[
                  styles.iconWrapper,
                  isCompleted && styles.iconCompleted,
                  !isUnlocked && styles.iconLocked,
                ]}>
                  <Text style={styles.moduleIcon}>
                    {isCompleted ? '✓' : !isUnlocked ? '🔒' : mod.icon}
                  </Text>
                </View>

                {/* Center: text */}
                <View style={styles.moduleText}>
                  <Text style={[
                    styles.moduleTitle,
                    !isUnlocked && styles.moduleTitleLocked,
                  ]}>
                    {t(`therapy.modules.${mod.id}.title`, { defaultValue: mod.id })}
                  </Text>
                  <Text style={styles.moduleDesc}>
                    {isCompleted
                      ? t('therapy.completed')
                      : !isUnlocked
                      ? t('therapy.locked', { week: mod.week })
                      : t(`therapy.modules.${mod.id}.description`, { defaultValue: '' })}
                  </Text>
                </View>

                {/* Right: duration or status */}
                <View style={styles.moduleRight}>
                  {isUnlocked && !isCompleted && (
                    <>
                      <Text style={styles.moduleDuration}>{mod.duration}</Text>
                      <Text style={[
                        styles.moduleAction,
                        isCurrent && styles.moduleActionCurrent,
                      ]}>
                        {isCurrent ? t('therapy.start') : t('therapy.continue')} →
                      </Text>
                    </>
                  )}
                  {isCompleted && (
                    <Text style={styles.completedBadge}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
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
  title: {
    ...typography.h1,
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(184, 169, 201, 0.15)',
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.mutedSage,
    borderRadius: 2,
  },
  progressLabel: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 20,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navyMid,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  moduleCardLocked: {
    opacity: 0.5,
  },
  moduleCardCurrent: {
    borderColor: 'rgba(245, 199, 169, 0.3)',
    backgroundColor: 'rgba(45, 58, 110, 0.8)',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(184, 169, 201, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCompleted: {
    backgroundColor: 'rgba(168, 197, 184, 0.2)',
  },
  iconLocked: {
    backgroundColor: 'rgba(184, 169, 201, 0.06)',
  },
  moduleIcon: {
    fontSize: 22,
  },
  moduleText: { flex: 1 },
  moduleTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  moduleTitleLocked: {
    color: colors.textMuted,
  },
  moduleDesc: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  moduleRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  moduleDuration: {
    ...typography.small,
    color: colors.textMuted,
  },
  moduleAction: {
    ...typography.smallMedium,
    color: colors.textSecondary,
  },
  moduleActionCurrent: {
    color: colors.warmPeach,
  },
  completedBadge: {
    fontSize: 18,
    color: colors.mutedSage,
  },
});
