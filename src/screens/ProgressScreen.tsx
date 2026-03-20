/**
 * RestEasy — ProgressScreen
 * Advanced 6-week progress charts:
 * - Sleep efficiency trend line
 * - Sleep onset latency evolution
 * - ISI score progression
 * - Week-over-week comparison
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useScreenTracking } from '../hooks/useAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 16, right: 16, bottom: 32, left: 40 };

interface WeeklyData {
  week: number;
  avg_efficiency: number | null;
  avg_onset_minutes: number | null;
  avg_wake_count: number | null;
  entry_count: number;
  isi_score: number | null;
}

// ─── Mini Line Chart ──────────────────────────────────────────────────────────

function LineChart({
  data,
  color,
  minY = 0,
  maxY = 100,
  unit = '%',
  label,
}: {
  data: (number | null)[];
  color: string;
  minY?: number;
  maxY?: number;
  unit?: string;
  label: string;
}) {
  const plotW = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const validPoints = data
    .map((v, i) => ({ v, i }))
    .filter(p => p.v !== null) as { v: number; i: number }[];

  if (validPoints.length < 2) {
    return (
      <View style={[chartStyles.container, { height: CHART_HEIGHT + 24 }]}>
        <Text style={chartStyles.label}>{label}</Text>
        <View style={chartStyles.noData}>
          <Text style={chartStyles.noDataText}>Données insuffisantes</Text>
        </View>
      </View>
    );
  }

  const xStep = plotW / (data.length - 1);
  const yScale = (v: number) =>
    CHART_PADDING.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

  const points = validPoints
    .map(p => `${CHART_PADDING.left + p.i * xStep},${yScale(p.v)}`)
    .join(' ');

  const yLines = [minY, (minY + maxY) / 2, maxY];

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>{label}</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Grid lines */}
        {yLines.map((y) => (
          <React.Fragment key={y}>
            <Line
              x1={CHART_PADDING.left}
              y1={yScale(y)}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={yScale(y)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText
              x={CHART_PADDING.left - 4}
              y={yScale(y) + 4}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="end"
            >
              {y}{unit}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X axis labels */}
        {data.map((_, i) => (
          <SvgText
            key={i}
            x={CHART_PADDING.left + i * xStep}
            y={CHART_HEIGHT - 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            S{i + 1}
          </SvgText>
        ))}

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {validPoints.map((p) => (
          <React.Fragment key={p.i}>
            <Circle
              cx={CHART_PADDING.left + p.i * xStep}
              cy={yScale(p.v)}
              r={5}
              fill={colors.deepNavy}
              stroke={color}
              strokeWidth={2}
            />
            <SvgText
              x={CHART_PADDING.left + p.i * xStep}
              y={yScale(p.v) - 10}
              fontSize={10}
              fill={color}
              textAnchor="middle"
              fontWeight="600"
            >
              {Math.round(p.v)}{unit}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function ProgressScreen() {
  const { i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);

  useScreenTracking('ProgressScreen');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [summaryRes, profileRes, isiRes] = await Promise.all([
        supabase
          .from('weekly_sleep_summary')
          .select('*')
          .eq('user_id', user.id)
          .order('program_week'),
        supabase
          .from('profiles')
          .select('program_week')
          .eq('id', user.id)
          .single(),
        supabase
          .from('isi_scores')
          .select('program_week, score')
          .eq('user_id', user.id)
          .order('program_week'),
      ]);

      const profile = profileRes.data;
      const summary = summaryRes.data ?? [];
      const isi = isiRes.data ?? [];

      setCurrentWeek(profile?.program_week ?? 1);

      // Build 6-week array
      const data: WeeklyData[] = Array.from({ length: 6 }, (_, i) => {
        const week = i + 1;
        const s = summary.find(r => r.program_week === week);
        const isiScore = isi.find(r => r.program_week === week);
        return {
          week,
          avg_efficiency: s?.avg_efficiency ?? null,
          avg_onset_minutes: s?.avg_onset_minutes ?? null,
          avg_wake_count: s?.avg_wake_count ?? null,
          entry_count: s?.entry_count ?? 0,
          isi_score: isiScore?.score ?? null,
        };
      });

      setWeeklyData(data);
    } finally {
      setLoading(false);
    }
  };

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  if (loading) {
    return (
      <View style={styles.loader}>
        <LinearGradient colors={[colors.deepNavy, '#0D2347']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={colors.softLavender} size="large" />
      </View>
    );
  }

  const efficiencyData = weeklyData.map(d => d.avg_efficiency);
  const onsetData = weeklyData.map(d => d.avg_onset_minutes);
  const isiData = weeklyData.map(d => d.isi_score);

  // Summary stats
  const completedWeeks = weeklyData.filter(d => d.entry_count > 0);
  const firstEfficiency = completedWeeks[0]?.avg_efficiency;
  const lastEfficiency = completedWeeks[completedWeeks.length - 1]?.avg_efficiency;
  const improvement = firstEfficiency && lastEfficiency
    ? Math.round(lastEfficiency - firstEfficiency)
    : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.deepNavy, '#0D2347']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('Ma progression', 'My Progress')}</Text>
          <Text style={styles.subtitle}>
            {t(`Programme — Semaine ${currentWeek} sur 6`, `Program — Week ${currentWeek} of 6`)}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Summary cards */}
          {improvement !== null && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>+{improvement}%</Text>
                <Text style={styles.summaryLabel}>
                  {t('Amélioration efficacité', 'Efficiency improvement')}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{completedWeeks.length}/6</Text>
                <Text style={styles.summaryLabel}>
                  {t('Semaines complétées', 'Weeks completed')}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {weeklyData.reduce((s, d) => s + d.entry_count, 0)}
                </Text>
                <Text style={styles.summaryLabel}>
                  {t('Nuits enregistrées', 'Nights logged')}
                </Text>
              </View>
            </View>
          )}

          {/* Efficiency chart */}
          <View style={styles.chartCard}>
            <LineChart
              data={efficiencyData}
              color={colors.softLavender}
              minY={60}
              maxY={100}
              unit="%"
              label={t('Efficacité du sommeil', 'Sleep Efficiency')}
            />
            <Text style={styles.chartNote}>
              {t('Objectif : ≥ 85%', 'Target: ≥ 85%')}
            </Text>
          </View>

          {/* Onset latency chart */}
          <View style={styles.chartCard}>
            <LineChart
              data={onsetData}
              color={colors.warmPeach}
              minY={0}
              maxY={60}
              unit=" min"
              label={t('Latence d\'endormissement', 'Sleep Onset Latency')}
            />
            <Text style={styles.chartNote}>
              {t('Objectif : ≤ 20 min', 'Target: ≤ 20 min')}
            </Text>
          </View>

          {/* ISI score chart */}
          <View style={styles.chartCard}>
            <LineChart
              data={isiData}
              color={colors.sage}
              minY={0}
              maxY={28}
              unit=""
              label={t('Score ISI (insomnie)', 'ISI Score (insomnia)')}
            />
            <Text style={styles.chartNote}>
              {t('Objectif : ≤ 7 (pas d\'insomnie)', 'Target: ≤ 7 (no insomnia)')}
            </Text>
          </View>

          {/* Week-by-week table */}
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>
              {t('Détail par semaine', 'Week-by-week detail')}
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                {t('Sem.', 'Week')}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                {t('Eff.', 'Eff.')}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                {t('Latence', 'Onset')}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>ISI</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                {t('Nuits', 'Nights')}
              </Text>
            </View>
            {weeklyData.map((d) => (
              <View key={d.week} style={[
                styles.tableRow,
                d.week === currentWeek && styles.tableRowCurrent,
              ]}>
                <Text style={styles.tableCell}>S{d.week}</Text>
                <Text style={[styles.tableCell, d.avg_efficiency && d.avg_efficiency >= 85
                  ? { color: colors.sage } : {}]}>
                  {d.avg_efficiency ? `${Math.round(d.avg_efficiency)}%` : '—'}
                </Text>
                <Text style={styles.tableCell}>
                  {d.avg_onset_minutes ? `${Math.round(d.avg_onset_minutes)}m` : '—'}
                </Text>
                <Text style={styles.tableCell}>
                  {d.isi_score !== null ? d.isi_score : '—'}
                </Text>
                <Text style={styles.tableCell}>{d.entry_count}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  loader: { flex: 1, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { ...typography.h1, color: colors.cream },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.navyMid,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: { ...typography.h2, color: colors.warmPeach },
  summaryLabel: { ...typography.tiny, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  chartCard: {
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  chartNote: { ...typography.small, color: colors.textMuted, marginTop: 8 },
  tableCard: {
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  tableTitle: { ...typography.bodyMedium, color: colors.cream, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', marginBottom: 8 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableRowCurrent: { backgroundColor: 'rgba(184, 169, 201, 0.08)' },
  tableCell: { flex: 1, ...typography.small, color: colors.textSecondary, textAlign: 'center' },
  tableCellHeader: { color: colors.textMuted, fontWeight: '600' },
});

const chartStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  label: { ...typography.bodyMedium, color: colors.cream, marginBottom: 8 },
  noData: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navyDark,
    borderRadius: 8,
  },
  noDataText: { ...typography.body, color: colors.textMuted },
});
