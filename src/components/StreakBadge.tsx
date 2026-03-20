/**
 * RestEasy — StreakBadge Component
 * Displays current streak with flame animation on HomeScreen.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StreakBadgeProps {
  streak: number;
  isNew?: boolean; // Triggers celebration animation
}

export function StreakBadge({ streak, isNew = false }: StreakBadgeProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language.split('-')[0];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [isNew, streak]);

  if (streak === 0) return null;

  const getFlame = () => {
    if (streak >= 21) return '🔥🔥🔥';
    if (streak >= 7) return '🔥🔥';
    return '🔥';
  };

  const getLabel = () => {
    if (lang === 'fr') {
      return streak === 1 ? '1 jour' : `${streak} jours`;
    }
    return streak === 1 ? '1 day' : `${streak} days`;
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.flame}>{getFlame()}</Text>
      <View>
        <Text style={styles.count}>{getLabel()}</Text>
        <Text style={styles.label}>
          {lang === 'fr' ? 'de suite' : 'streak'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 199, 169, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 199, 169, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  flame: { fontSize: 20 },
  count: { ...typography.bodyMedium, color: colors.warmPeach },
  label: { ...typography.tiny, color: colors.textMuted },
});
