/**
 * RestEasy — WeeklyReviewScreen
 * - Bar chart (Soft Lavender bars) showing daily sleep efficiency %
 * - Average Sleep Efficiency card with sage arrow indicator
 * - New Module Unlocked card (Warm Peach)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48 - 32; // padding + card padding

interface DayData {
  day: string;
  efficiency: number;
}

const MOCK_DATA: DayData[] = [
  { day: 'Lun', efficiency: 78 },
  { day: 'Mar', efficiency: 82 },
  { day: 'Mer', efficiency: 85 },
  { day: 'Jeu', efficiency: 90 },
  { day: 'Ven', efficiency: 92 },
  { day: 'Sam', efficiency: 88 },
  { day: 'Dim', efficiency: 80 },
];

const MODULES = [
  { id: 's3_cognitive_restructuring', week: 3 },
  { id: 's4_stimulus_control', week: 4 },
];

interface WeeklyReviewScreenProps {
  navigation: any;
  currentWeek?: number;
  data?: DayData[];
  avgEfficiency?: number;
}

function BarChart({ data, avgEfficiency }: { data: DayData[]; avgEfficiency: number }) {
  const maxVal = 100;
  const minVal = 60;
  const range = maxVal - minVal;
  const barWidth = (CHART_WIDTH - (data.length - 1) * 8) / data.length;
  const chartHeight = 120;

  return (
    <View style={chartStyles.container}>
      {/* Y-axis labels */}
      <View style={chartStyles.yAxis}>
        {[100, 90, 80, 70].map(v => (
          <Text key={v} style={chartStyles.yLabel}>{v}%</Text>
        ))}
      </View>

      {/* Bars */}
      <View style={chartStyles.barsArea}>
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.67, 1].map((pos, i) => (
          <View
            key={i}
            style={[chartStyles.gridLine, { bottom: pos * chartHeight }]}
          />
        ))}

        <View style={chartStyles.bars}>
          {data.map((d, i) => {
            const heightPct = Math.max(0, (d.efficiency - minVal) / range);
            const barHeight = heightPct * chartHeight;
            const isHigh = d.efficiency >= 85;

            return (
              <View key={i} style={[chartStyles.barCol, { width: barWidth }]}>
                <Text style={chartStyles.barLabel}>{d.efficiency}%</Text>
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: barHeight,
                      width: barWidth,
                      backgroundColor: isHigh
                        ? colors.softLavender
                        : 'rgba(184, 169, 201, 0.55)',
                      borderRadius: barWidth / 3,
                    },
                  ]}
                />
                <Text style={chartStyles.dayLabel}>{d.day}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'flex-end',
  },
  yAxis: {
    width: 36,
    height: 120,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    marginBottom: 24,
  },
  yLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
  barsArea: {
    flex: 1,
    height: 180,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(184, 169, 201, 0.1)',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 120 + 24 + 20,
    paddingBottom: 24,
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  bar: {},
  barLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 10,
  },
  dayLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontSize: 11,
  },
});

export function WeeklyReviewScreen({
  navigation,
  currentWeek = 3,
  data = MOCK_DATA,
  avgEfficiency = 85,
}: WeeklyReviewScreenProps) {
  const { t } = useTranslation();

  const windowMessage = avgEfficiency >= 85
    ? t('weekly.window_same')
    : avgEfficiency >= 80
    ? t('weekly.window_extended')
    : t('weekly.window_reduced');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>{t('weekly.title', { week: currentWeek })}</Text>
          <Text style={styles.subtitle}>{t('weekly.subtitle')}</Text>

          {/* Bar Chart Card */}
          <View style={styles.card}>
            <BarChart data={data} avgEfficiency={avgEfficiency} />
          </View>

          {/* Average Efficiency Card */}
          <View style={[styles.card, styles.efficiencyCard]}>
            <View style={styles.efficiencyIcon}>
              <Text style={styles.arrowIcon}>↑</Text>
            </View>
            <View style={styles.efficiencyText}>
              <Text style={styles.efficiencyTitle}>
                {t('weekly.avg_efficiency', { value: avgEfficiency })}
              </Text>
              <Text style={styles.efficiencySubtitle}>{windowMessage}</Text>
            </View>
          </View>

          {/* New Module Unlocked */}
          <View style={[styles.card, styles.moduleCard]}>
            <Text style={styles.moduleBookIcon}>📖</Text>
            <View style={styles.moduleContent}>
              <Text style={styles.moduleUnlocked}>{t('weekly.module_unlocked')}</Text>
              <Text style={styles.moduleTitle}>
                {t(`therapy.modules.s${currentWeek}_cognitive_restructuring.title`, {
                  defaultValue: 'Restructuration cognitive : Lâcher prise sur l\'anxiété du sommeil',
                })}
              </Text>
              <Text style={styles.moduleDescription}>
                Apprenez des techniques pour recadrer vos pensées sur le sommeil.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Therapy')}>
                <Text style={styles.startModule}>{t('weekly.start_module')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  card: {
    backgroundColor: colors.navyMid,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  efficiencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  efficiencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 197, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.mutedSage,
    fontWeight: '700',
  },
  efficiencyText: { flex: 1 },
  efficiencyTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  efficiencySubtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  moduleCard: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  moduleBookIcon: {
    fontSize: 36,
    marginTop: 2,
  },
  moduleContent: { flex: 1 },
  moduleUnlocked: {
    ...typography.smallMedium,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moduleTitle: {
    ...typography.h3,
    color: colors.warmPeach,
    marginBottom: 8,
  },
  moduleDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  startModule: {
    ...typography.bodyMedium,
    color: colors.mutedSage,
  },
});
