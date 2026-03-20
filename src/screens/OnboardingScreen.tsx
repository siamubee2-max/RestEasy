/**
 * RestEasy — OnboardingScreen
 * 3-step onboarding after first sign-in:
 * 1. Prénom
 * 2. Heure de lever habituelle
 * 3. Durée habituelle au lit
 * Sets up the initial sleep window and profile.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { PeachButton } from '../components/PeachButton';
import { TimePickerCard } from '../components/TimePickerCard';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../lib/supabase';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const STEPS = 3;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [timeInBed, setTimeInBed] = useState(7); // hours
  const [saving, setSaving] = useState(false);

  // Compute initial bedtime from wake time and time in bed
  const computeBedtime = () => {
    const [h, m] = wakeTime.split(':').map(Number);
    const wakeMinutes = h * 60 + m;
    const bedMinutes = ((wakeMinutes - timeInBed * 60) + 1440) % 1440;
    const bH = Math.floor(bedMinutes / 60);
    const bM = bedMinutes % 60;
    return `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;
  };

  const handleNext = async () => {
    if (step < STEPS - 1) {
      setStep(s => s + 1);
      return;
    }

    // Final step: save profile
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bedtime = computeBedtime();

      await Promise.all([
        supabase.from('profiles').update({
          display_name: name.trim() || 'Utilisateur',
          updated_at: new Date().toISOString(),
        }).eq('id', user.id),

        supabase.from('sleep_windows').upsert({
          user_id: user.id,
          program_week: 1,
          prescribed_bedtime: bedtime,
          prescribed_wake_time: wakeTime,
        }, { onConflict: 'user_id,program_week' }),
      ]);

      onComplete();
    } catch (e) {
      console.error('Onboarding save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const canContinue = step === 0 ? name.trim().length > 0 : true;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.deepNavy, '#0D2347']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Progress dots */}
            <View style={styles.dots}>
              {Array.from({ length: STEPS }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i <= step && styles.dotActive]}
                />
              ))}
            </View>

            {/* Step 0: Name */}
            {step === 0 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepEmoji}>👋</Text>
                <Text style={styles.stepTitle}>Bienvenue !</Text>
                <Text style={styles.stepSubtitle}>
                  Comment souhaitez-vous être appelé(e) ?
                </Text>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Votre prénom"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                  maxLength={30}
                />
              </View>
            )}

            {/* Step 1: Wake time */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepEmoji}>⏰</Text>
                <Text style={styles.stepTitle}>Votre heure de lever</Text>
                <Text style={styles.stepSubtitle}>
                  À quelle heure vous levez-vous habituellement ?{'\n'}
                  Essayez de la maintenir même le week-end.
                </Text>
                <TimePickerCard
                  label="Heure de lever habituelle"
                  value={wakeTime}
                  onChange={setWakeTime}
                />
                <View style={styles.tipCard}>
                  <Text style={styles.tipText}>
                    💡 Une heure de lever fixe est la règle la plus importante de la TCC-I.
                  </Text>
                </View>
              </View>
            )}

            {/* Step 2: Time in bed */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepEmoji}>🛏</Text>
                <Text style={styles.stepTitle}>Votre temps au lit</Text>
                <Text style={styles.stepSubtitle}>
                  Combien d'heures passez-vous habituellement au lit ?
                </Text>
                <View style={styles.stepperCard}>
                  <View style={styles.stepper}>
                    <View
                      style={styles.stepBtn}
                      onTouchEnd={() => setTimeInBed(Math.max(4, timeInBed - 0.5))}
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </View>
                    <View style={styles.stepValueBlock}>
                      <Text style={styles.stepValue}>{timeInBed}h</Text>
                      <Text style={styles.stepValueSub}>
                        Coucher : {computeBedtime()}
                      </Text>
                    </View>
                    <View
                      style={styles.stepBtn}
                      onTouchEnd={() => setTimeInBed(Math.min(12, timeInBed + 0.5))}
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tipCard}>
                  <Text style={styles.tipText}>
                    💡 La TCC-I commence avec une fenêtre de sommeil légèrement restreinte pour consolider votre sommeil.
                  </Text>
                </View>
              </View>
            )}

            {/* CTA */}
            <PeachButton
              title={step < STEPS - 1 ? 'Continuer →' : 'Commencer le programme'}
              onPress={handleNext}
              disabled={!canContinue}
              loading={saving}
              style={styles.cta}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(184, 169, 201, 0.2)',
  },
  dotActive: {
    backgroundColor: colors.softLavender,
    width: 24,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  stepEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  stepTitle: {
    ...typography.h1,
    color: colors.cream,
    textAlign: 'center',
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  nameInput: {
    width: '100%',
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  tipCard: {
    width: '100%',
    backgroundColor: 'rgba(168, 197, 184, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 197, 184, 0.2)',
    padding: 14,
  },
  tipText: {
    ...typography.small,
    color: colors.mutedSage,
    lineHeight: 20,
    textAlign: 'center',
  },
  stepperCard: {
    width: '100%',
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 169, 201, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 24,
    color: colors.warmPeach,
    lineHeight: 28,
  },
  stepValueBlock: {
    alignItems: 'center',
  },
  stepValue: {
    ...typography.h1,
    color: colors.warmPeach,
  },
  stepValueSub: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cta: {},
});
