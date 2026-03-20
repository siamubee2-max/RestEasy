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

interface ISIQuestion {
  id: number;
  fr: string;
  en: string;
  es: string;
  de: string;
  labels_fr: string[];
  labels_en: string[];
}

const ISI_QUESTIONS: ISIQuestion[] = [
  {
    id: 1,
    fr: "Difficulté à vous endormir",
    en: "Difficulty falling asleep",
    es: "Dificultad para conciliar el sueño",
    de: "Schwierigkeiten beim Einschlafen",
    labels_fr: ["Aucune", "Légère", "Modérée", "Sévère", "Très sévère"],
    labels_en: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  },
  {
    id: 2,
    fr: "Difficulté à rester endormi(e)",
    en: "Difficulty staying asleep",
    es: "Dificultad para mantener el sueño",
    de: "Schwierigkeiten beim Durchschlafen",
    labels_fr: ["Aucune", "Légère", "Modérée", "Sévère", "Très sévère"],
    labels_en: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  },
  {
    id: 3,
    fr: "Problème de réveil trop tôt",
    en: "Problem waking up too early",
    es: "Problema de despertar demasiado temprano",
    de: "Problem des zu frühen Aufwachens",
    labels_fr: ["Aucun", "Léger", "Modéré", "Sévère", "Très sévère"],
    labels_en: ["None", "Mild", "Moderate", "Severe", "Very severe"],
  },
  {
    id: 4,
    fr: "Satisfaction par rapport à votre sommeil actuel",
    en: "Satisfaction with your current sleep pattern",
    es: "Satisfacción con su patrón de sueño actual",
    de: "Zufriedenheit mit Ihrem aktuellen Schlafmuster",
    labels_fr: ["Très satisfait(e)", "Satisfait(e)", "Neutre", "Insatisfait(e)", "Très insatisfait(e)"],
    labels_en: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"],
  },
  {
    id: 5,
    fr: "Dans quelle mesure vos problèmes de sommeil perturbent-ils votre fonctionnement quotidien ?",
    en: "How much do your sleep problems interfere with your daily functioning?",
    es: "¿En qué medida sus problemas de sueño interfieren con su funcionamiento diario?",
    de: "Wie sehr beeinträchtigen Ihre Schlafprobleme Ihr tägliches Funktionieren?",
    labels_fr: ["Pas du tout", "Un peu", "Modérément", "Beaucoup", "Énormément"],
    labels_en: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  },
  {
    id: 6,
    fr: "Dans quelle mesure vos problèmes de sommeil sont-ils visibles pour les autres ?",
    en: "How noticeable to others do you think your sleep problem is?",
    es: "¿En qué medida cree que su problema de sueño es notable para los demás?",
    de: "Wie auffällig ist Ihr Schlafproblem für andere?",
    labels_fr: ["Pas du tout", "Un peu", "Modérément", "Beaucoup", "Énormément"],
    labels_en: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  },
  {
    id: 7,
    fr: "Dans quelle mesure êtes-vous préoccupé(e) par vos problèmes de sommeil ?",
    en: "How worried/distressed are you about your current sleep problem?",
    es: "¿Cuánto le preocupan sus problemas de sueño actuales?",
    de: "Wie besorgt/belastet sind Sie durch Ihr aktuelles Schlafproblem?",
    labels_fr: ["Pas du tout", "Un peu", "Modérément", "Beaucoup", "Énormément"],
    labels_en: ["Not at all", "A little", "Somewhat", "Much", "Very much"],
  },
];

function getISISeverity(score: number, lang: string): { label: string; color: string; description: string } {
  if (score <= 7) return {
    label: lang === 'fr' ? 'Pas d\'insomnie' : 'No insomnia',
    color: colors.sage,
    description: lang === 'fr'
      ? 'Votre sommeil est dans la norme clinique.'
      : 'Your sleep is within clinical norms.',
  };
  if (score <= 14) return {
    label: lang === 'fr' ? 'Insomnie légère' : 'Subthreshold insomnia',
    color: colors.warmPeach,
    description: lang === 'fr'
      ? 'Quelques difficultés de sommeil, mais gérables.'
      : 'Some sleep difficulties, but manageable.',
  };
  if (score <= 21) return {
    label: lang === 'fr' ? 'Insomnie modérée' : 'Moderate insomnia',
    color: '#F5A623',
    description: lang === 'fr'
      ? 'Le programme TCC-I est particulièrement adapté à votre situation.'
      : 'The CBT-I program is particularly suited to your situation.',
  };
  return {
    label: lang === 'fr' ? 'Insomnie sévère' : 'Severe insomnia',
    color: '#E05252',
    description: lang === 'fr'
      ? 'Insomnie sévère. Le programme peut vous aider significativement.'
      : 'Severe insomnia. The program can help you significantly.',
  };
}

export function ISIScreen({ programWeek, onComplete, onSkip }: ISIScreenProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ score: number } | null>(null);

  useScreenTracking('ISIScreen');

  const allAnswered = ISI_QUESTIONS.every(q => answers[q.id] !== undefined);
  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);

  const getQuestion = (q: ISIQuestion): string => {
    if (lang === 'fr') return q.fr;
    if (lang === 'es') return q.es;
    if (lang === 'de') return q.de;
    return q.en;
  };

  const getLabels = (q: ISIQuestion): string[] => {
    if (lang === 'fr') return q.labels_fr;
    return q.labels_en;
  };

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
      Alert.alert('Erreur', 'Impossible de sauvegarder le questionnaire.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const severity = getISISeverity(result.score, lang);
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.deepNavy, '#0D2347']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultEmoji}>📊</Text>
            <Text style={styles.resultTitle}>
              {lang === 'fr' ? 'Votre score ISI' : 'Your ISI Score'}
            </Text>
            <View style={[styles.scoreBadge, { borderColor: severity.color }]}>
              <Text style={[styles.scoreNumber, { color: severity.color }]}>{result.score}</Text>
              <Text style={styles.scoreMax}>/28</Text>
            </View>
            <Text style={[styles.severityLabel, { color: severity.color }]}>{severity.label}</Text>
            <Text style={styles.severityDesc}>{severity.description}</Text>
            <PeachButton
              title={lang === 'fr' ? 'Continuer' : 'Continue'}
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
          <Text style={styles.headerTitle}>
            {lang === 'fr' ? 'Questionnaire ISI' : 'ISI Questionnaire'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {lang === 'fr'
              ? `Semaine ${programWeek} — 7 questions`
              : `Week ${programWeek} — 7 questions`}
          </Text>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{lang === 'fr' ? 'Passer' : 'Skip'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.instruction}>
            {lang === 'fr'
              ? 'Pour chaque question, indiquez la sévérité de vos problèmes de sommeil au cours des deux dernières semaines.'
              : 'For each question, indicate the severity of your sleep problems over the past two weeks.'}
          </Text>

          {ISI_QUESTIONS.map((question) => (
            <View key={question.id} style={styles.questionCard}>
              <Text style={styles.questionNumber}>
                {lang === 'fr' ? `Question ${question.id}` : `Question ${question.id}`}
              </Text>
              <Text style={styles.questionText}>{getQuestion(question)}</Text>
              <View style={styles.optionsRow}>
                {getLabels(question).map((label, index) => {
                  const isSelected = answers[question.id] === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => setAnswers(prev => ({ ...prev, [question.id]: index }))}
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
            title={saving ? '...' : (lang === 'fr' ? 'Voir mes résultats' : 'See my results')}
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
