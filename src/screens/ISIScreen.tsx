/**
 * RestEasy — ISI Screen (Insomnia Severity Index)
 * Standardized 7-question clinical questionnaire.
 * Administered at baseline (Week 0) and after each week.
 * Score 0-7: No insomnia | 8-14: Subthreshold | 15-21: Moderate | 22-28: Severe
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Analytics } from '../lib/posthog';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { PeachButton } from '../components/PeachButton';
import { useScreenTracking } from '../hooks/useAnalytics';

interface ISIScreenProps {
  programWeek: number;
  onComplete: (score: number) => void;
  onSkip?: () => void;
}

const ISI_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7];

type TFunction = (key: string) => string;

function getISISeverity(score: number, t: TFunction): { label: string; color: string; description: string } {
  if (score <= 7) return {
    label: t('isi.severity_none_label'),
    color: colors.sage,
    description: t('isi.severity_none_desc'),
  };
  if (score <= 14) return {
    label: t('isi.severity_sub_label'),
    color: colors.warmPeach,
    description: t('isi.severity_sub_desc'),
  };
  if (score <= 21) return {
    label: t('isi.severity_moderate_label'),
    color: '#F5A623',
    description: t('isi.severity_moderate_desc'),
  };
  return {
    label: t('isi.severity_severe_label'),
    color: '#E05252',
    description: t('isi.severity_severe_desc'),
  };
}

export function ISIScreen({ programWeek, onComplete, onSkip }: ISIScreenProps) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ score: number } | null>(null);

  useScreenTracking('ISIScreen');

  const allAnswered = ISI_QUESTION_IDS.every(id => answers[id] !== undefined);
  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);

  const scaleLabels = [
    t('isi.scale_none'),
    t('isi.scale_mild'),
    t('isi.scale_moderate'),
    t('isi.scale_severe'),
    t('isi.scale_very_severe'),
  ];

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('isi_scores').upsert({
        user_id: user.id,
        program_week: programWeek,
        score: totalScore,
        answers: answers,
        scored_at: new Date().toISOString(),
      }, { onConflict: 'user_id,program_week' });

      Analytics.track('isi_completed', { week: programWeek, score: totalScore });
      setResult({ score: totalScore });
    } catch (error) {
      Alert.alert(t('common.error'), t('common.save_error'));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const severity = getISISeverity(result.score, t);
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.deepNavy, '#0D2347']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultEmoji}>📊</Text>
            <Text style={styles.resultTitle}>
              {t('isi.result_title', { score: result.score })}
            </Text>
            <View style={[styles.scoreBadge, { borderColor: severity.color }]}>
              <Text style={[styles.scoreNumber, { color: severity.color }]}>{result.score}</Text>
              <Text style={styles.scoreMax}>/28</Text>
            </View>
            <Text style={[styles.severityLabel, { color: severity.color }]}>{severity.label}</Text>
            <Text style={styles.severityDesc}>{severity.description}</Text>
            <PeachButton
              title={t('common.continue')}
              onPress={() => onComplete(result.score)}
              style={styles.continueBtn}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.deepNavy, '#0D2347']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('isi.title')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('isi.week_header', { week: programWeek })}
          </Text>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('isi.skip')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.instruction}>{t('isi.instruction')}</Text>

          {ISI_QUESTION_IDS.map((qId) => (
            <View key={qId} style={styles.questionCard}>
              <Text style={styles.questionNumber}>{`${qId}/7`}</Text>
              <Text style={styles.questionText}>{t(`isi.questions.q${qId}`)}</Text>
              <View style={styles.optionsRow}>
                {scaleLabels.map((label, index) => {
                  const isSelected = answers[qId] === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => setAnswers(prev => ({ ...prev, [qId]: index }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionScore, isSelected && styles.optionScoreSelected]}>
                        {index}
                      </Text>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
                        numberOfLines={2}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <PeachButton
            title={t('isi.save')}
            onPress={handleSubmit}
            disabled={!allAnswered || saving}
            loading={saving}
            style={styles.submitBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  safe: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { ...typography.h1, color: colors.cream },
  headerSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  skipBtn: { position: 'absolute', top: 16, right: 24 },
  skipText: { ...typography.body, color: colors.textMuted },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  instruction: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 8,
  },
  questionCard: {
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  questionNumber: { ...typography.small, color: colors.softLavender, marginBottom: 6 },
  questionText: { ...typography.bodyMedium, color: colors.cream, marginBottom: 16, lineHeight: 22 },
  optionsRow: { flexDirection: 'row', gap: 6 },
  option: {
    flex: 1,
    backgroundColor: colors.navyDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: 'rgba(184, 169, 201, 0.15)',
    borderColor: colors.softLavender,
  },
  optionScore: { ...typography.h2, color: colors.textMuted, marginBottom: 4 },
  optionScoreSelected: { color: colors.softLavender },
  optionLabel: { ...typography.tiny, color: colors.textMuted, textAlign: 'center' },
  optionLabelSelected: { color: colors.softLavender },
  submitBtn: { marginTop: 8 },
  // Result screen
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultEmoji: { fontSize: 56, marginBottom: 16 },
  resultTitle: { ...typography.h2, color: colors.cream, marginBottom: 20 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 16,
  },
  scoreNumber: { fontSize: 48, fontWeight: '700' },
  scoreMax: { ...typography.h2, color: colors.textMuted, marginLeft: 4 },
  severityLabel: { ...typography.h2, marginBottom: 12 },
  severityDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  continueBtn: { width: '100%' },
});
