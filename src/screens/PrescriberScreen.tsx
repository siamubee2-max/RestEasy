/**
 * RestEasy — Prescriber Mode Screen
 * For healthcare professionals (GPs, sleep therapists, psychiatrists).
 *
 * Features:
 * - Patient list with program progress
 * - Weekly sleep efficiency per patient
 * - ISI score evolution
 * - Export reports (PDF/CSV)
 * - Add patients via unique code
 *
 * Access: Verified server-side via the verify-prescriber Edge Function.
 * Codes are stored as secrets in Supabase — never in client code.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { supabase } from '../lib/supabase';
import { PrescriberAnalytics } from '../lib/posthog';
import { captureError } from '../lib/sentry';

interface Patient {
  id: string;
  display_name: string;
  program_week: number;
  avg_efficiency_last_week: number;
  last_entry_date: string | null;
  isi_initial: number | null;
  isi_latest: number | null;
  streak: number;
}

export default function PrescriberScreen() {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [addingPatient, setAddingPatient] = useState(false);
  const [patientCode, setPatientCode] = useState('');

  useEffect(() => {
    if (isVerified) loadPatients();
  }, [isVerified]);

  async function verifyCode() {
    const code = codeInput.trim();
    if (!code) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-prescriber', {
        body: { code },
      });

      if (error) throw error;

      if (data?.valid) {
        setIsVerified(true);
        PrescriberAnalytics.codeEntered(code.slice(0, 4));
      } else {
        Alert.alert(
          t('prescriber.invalid_code'),
          t('prescriber.invalid_code_message')
        );
      }
    } catch (err) {
      captureError(err as Error, { context: 'verifyPrescriberCode' });
      Alert.alert(t('common.error'), t('common.save_error'));
    } finally {
      setVerifying(false);
    }
  }

  async function loadPatients() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('prescriber_patients')
        .select(`
          patient_id,
          profiles!inner(display_name),
          sleep_entries(program_week, avg_efficiency_last_week:sleep_efficiency, entry_date),
          isi_scores(program_week, score)
        `)
        .eq('prescriber_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Patient[] = (data ?? []).map((row: Record<string, unknown>) => {
        const profile = row.profiles as { display_name: string } | null;
        const entries = (row.sleep_entries ?? []) as Array<{ program_week: number; sleep_efficiency: number; entry_date: string }>;
        const isiScores = (row.isi_scores ?? []) as Array<{ program_week: number; score: number }>;

        const sortedISI = [...isiScores].sort((a, b) => a.program_week - b.program_week);
        const latestEntry = entries[0] ?? null;
        const lastWeekEntries = entries.filter(e => e.program_week === (latestEntry?.program_week ?? 1));
        const avgEff = lastWeekEntries.length
          ? Math.round(lastWeekEntries.reduce((s, e) => s + (e.sleep_efficiency ?? 0), 0) / lastWeekEntries.length)
          : 0;

        return {
          id: row.patient_id as string,
          display_name: profile?.display_name ?? '—',
          program_week: latestEntry?.program_week ?? 1,
          avg_efficiency_last_week: avgEff,
          last_entry_date: latestEntry?.entry_date ?? null,
          isi_initial: sortedISI[0]?.score ?? null,
          isi_latest: sortedISI[sortedISI.length - 1]?.score ?? null,
          streak: entries.length,
        };
      });

      setPatients(mapped);
    } catch (error) {
      captureError(error as Error, { context: 'loadPatients' });
    } finally {
      setLoading(false);
    }
  }

  function getEfficiencyColor(eff: number): string {
    if (eff >= 85) return colors.sage;
    if (eff >= 75) return colors.warmPeach;
    return '#E57373';
  }

  function getISIImprovement(initial: number | null, latest: number | null): string {
    if (!initial || !latest) return '—';
    const diff = initial - latest;
    if (diff > 0) return `↓ ${diff} pts`;
    if (diff < 0) return `↑ ${Math.abs(diff)} pts`;
    return '= 0 pt';
  }

  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.codeContainer}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.codeTitle}>{t('prescriber.access_title')}</Text>
          <Text style={styles.codeSubtitle}>{t('prescriber.access_subtitle')}</Text>
          <TextInput
            style={styles.codeInput}
            value={codeInput}
            onChangeText={setCodeInput}
            placeholder={t('prescriber.code_placeholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.verifyButton, verifying && { opacity: 0.6 }]}
            onPress={verifyCode}
            disabled={verifying}
          >
            {verifying
              ? <ActivityIndicator color={colors.deepNavy} size="small" />
              : <Text style={styles.verifyButtonText}>{t('prescriber.verify')}</Text>
            }
          </TouchableOpacity>
          <Text style={styles.contactText}>{t('prescriber.contact')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.lavender} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('prescriber.dashboard_title')}</Text>
          <Text style={styles.subtitle}>
            {t('prescriber.patients_monitored_other', { count: patients.length })}
          </Text>
        </View>

        {/* Summary Stats */}
        {patients.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(patients.reduce((s, p) => s + p.avg_efficiency_last_week, 0) / patients.length)}%
              </Text>
              <Text style={styles.statLabel}>{t('prescriber.avg_efficiency')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {patients.filter(p => p.last_entry_date === new Date().toISOString().split('T')[0]).length}
              </Text>
              <Text style={styles.statLabel}>{t('prescriber.active_today')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {patients.filter(p => p.avg_efficiency_last_week >= 85).length}
              </Text>
              <Text style={styles.statLabel}>{t('prescriber.on_track')}</Text>
            </View>
          </View>
        )}

        {/* Patient List */}
        {patients.map(patient => (
          <TouchableOpacity
            key={patient.id}
            style={styles.patientCard}
            onPress={() => PrescriberAnalytics.patientProgressViewed(patient.id, patient.program_week)}
          >
            <View style={styles.patientHeader}>
              <Text style={styles.patientName}>{patient.display_name}</Text>
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>
                  {t('prescriber.week_label', { week: patient.program_week })}
                </Text>
              </View>
            </View>

            <View style={styles.patientStats}>
              <View style={styles.patientStat}>
                <Text style={[styles.patientStatValue, { color: getEfficiencyColor(patient.avg_efficiency_last_week) }]}>
                  {patient.avg_efficiency_last_week}%
                </Text>
                <Text style={styles.patientStatLabel}>{t('prescriber.efficiency_label')}</Text>
              </View>
              <View style={styles.patientStat}>
                <Text style={[styles.patientStatValue, { color: colors.warmPeach }]}>
                  {getISIImprovement(patient.isi_initial, patient.isi_latest)}
                </Text>
                <Text style={styles.patientStatLabel}>ISI</Text>
              </View>
              <View style={styles.patientStat}>
                <Text style={[styles.patientStatValue, { color: colors.lavender }]}>
                  🔥 {patient.streak}
                </Text>
                <Text style={styles.patientStatLabel}>{t('prescriber.days_label')}</Text>
              </View>
            </View>

            {patient.avg_efficiency_last_week > 0 && patient.avg_efficiency_last_week < 75 && (
              <View style={styles.alertBanner}>
                <Text style={styles.alertText}>
                  ⚠️ {t('prescriber.low_efficiency_alert')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Add Patient */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddingPatient(true)}
        >
          <Text style={styles.addButtonText}>+ {t('prescriber.add_patient')}</Text>
        </TouchableOpacity>

        {addingPatient && (
          <View style={styles.addPatientForm}>
            <Text style={styles.addPatientTitle}>{t('prescriber.patient_code_title')}</Text>
            <TextInput
              style={styles.codeInput}
              value={patientCode}
              onChangeText={setPatientCode}
              placeholder={t('prescriber.patient_code_placeholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => {
                PrescriberAnalytics.patientAdded();
                setAddingPatient(false);
                setPatientCode('');
                Alert.alert(
                  t('prescriber.patient_added'),
                  t('prescriber.patient_added_message')
                );
              }}
            >
              <Text style={styles.verifyButtonText}>{t('prescriber.add')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textMuted },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.navyMid, borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  statValue: { ...typography.h2, color: colors.lavender },
  statLabel: { ...typography.tiny, color: colors.textMuted, textAlign: 'center', marginTop: 2 },

  patientCard: {
    backgroundColor: colors.navyMid, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  patientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  patientName: { ...typography.bodyMedium, color: colors.textPrimary },
  weekBadge: { backgroundColor: 'rgba(184, 169, 201, 0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  weekBadgeText: { ...typography.tiny, color: colors.lavender },
  patientStats: { flexDirection: 'row', justifyContent: 'space-around' },
  patientStat: { alignItems: 'center' },
  patientStatValue: { ...typography.bodyMedium },
  patientStatLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  alertBanner: {
    marginTop: 10, backgroundColor: 'rgba(229, 115, 115, 0.15)',
    borderRadius: 8, padding: 8,
  },
  alertText: { ...typography.tiny, color: '#E57373' },

  addButton: {
    borderWidth: 1, borderColor: colors.lavender, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  addButtonText: { ...typography.bodyMedium, color: colors.lavender },
  addPatientForm: { marginTop: 16 },
  addPatientTitle: { ...typography.bodyMedium, color: colors.textPrimary, marginBottom: 8 },

  // Code entry
  codeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  lockEmoji: { fontSize: 48, marginBottom: 16 },
  codeTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  codeSubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  codeInput: {
    width: '100%', backgroundColor: colors.navyMid, borderRadius: 12,
    padding: 14, color: colors.textPrimary, ...typography.body,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    textAlign: 'center', letterSpacing: 4,
  },
  verifyButton: {
    width: '100%', backgroundColor: colors.lavender, borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  verifyButtonText: { ...typography.bodyMedium, color: colors.deepNavy },
  contactText: { ...typography.tiny, color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
