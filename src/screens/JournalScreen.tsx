/**
 * RestEasy — JournalScreen (Morning Journal)
 * 5 fields on Navy Mid cards:
 * 1. Bedtime (time picker)
 * 2. Fall asleep duration (slider, 0–120 min)
 * 3. Wake-up count (stepper, 0–10)
 * 4. Wake time (time picker)
 * 5. Out of bed time (time picker)
 * CTA: "Save Entry" (Warm Peach)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { TimePickerCard } from '../components/TimePickerCard';
import { PeachButton } from '../components/PeachButton';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface JournalScreenProps {
  navigation: any;
  currentWeek?: number;
  onSave?: (entry: any) => Promise<void>;
}

export function JournalScreen({ navigation, currentWeek = 3, onSave }: JournalScreenProps) {
  const { t } = useTranslation();
  const [bedTime, setBedTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('06:15');
  const [outOfBedTime, setOutOfBedTime] = useState('06:30');
  const [fallAsleepMin, setFallAsleepMin] = useState(25);
  const [wakeUps, setWakeUps] = useState(2);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const entry = {
        entry_date: new Date().toISOString().split('T')[0],
        bedtime: new Date(`1970-01-01T${bedTime}:00`).toISOString(),
        sleep_onset_minutes: fallAsleepMin,
        wake_count: wakeUps,
        waso_minutes: wakeUps * 15,
        wake_time: new Date(`1970-01-01T${wakeTime}:00`).toISOString(),
        out_of_bed_time: new Date(`1970-01-01T${outOfBedTime}:00`).toISOString(),
        program_week: currentWeek,
      };
      if (onSave) await onSave(entry);
      Alert.alert('✓', t('journal.saved'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.title}>{t('journal.title')}</Text>
          <Text style={styles.subtitle}>{t('journal.subtitle')}</Text>

          {/* 1. Bedtime */}
          <TimePickerCard
            label={t('journal.bedtime_question')}
            value={bedTime}
            onChange={setBedTime}
          />

          {/* 2. Fall asleep slider */}
          <View style={styles.sliderCard}>
            <Text style={styles.cardLabel}>{t('journal.fall_asleep_question')}</Text>
            <Text style={styles.sliderValue}>{fallAsleepMin} min</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={120}
              step={5}
              value={fallAsleepMin}
              onValueChange={setFallAsleepMin}
              minimumTrackTintColor={colors.warmPeach}
              maximumTrackTintColor="rgba(184, 169, 201, 0.25)"
              thumbTintColor={colors.warmPeach}
            />
          </View>

          {/* 3. Wake-up count stepper */}
          <View style={styles.stepperCard}>
            <Text style={styles.cardLabel}>{t('journal.wakeups_question')}</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setWakeUps(Math.max(0, wakeUps - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{wakeUps}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setWakeUps(Math.min(10, wakeUps + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 4. Wake time */}
          <TimePickerCard
            label={t('journal.wake_time_question')}
            value={wakeTime}
            onChange={setWakeTime}
          />

          {/* 5. Out of bed time */}
          <TimePickerCard
            label={t('journal.out_of_bed_question')}
            value={outOfBedTime}
            onChange={setOutOfBedTime}
          />

          {/* Save CTA */}
          <View style={styles.ctaWrapper}>
            <PeachButton
              title={t('journal.save')}
              onPress={handleSave}
              loading={saving}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: 24,
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
    color: colors.softLavender,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Slider card
  sliderCard: {
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sliderValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 36,
  },

  // Stepper card
  stepperCard: {
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 169, 201, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 22,
    color: colors.warmPeach,
    lineHeight: 26,
  },
  stepValue: {
    ...typography.h2,
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },

  ctaWrapper: {
    marginTop: 24,
  },
});
