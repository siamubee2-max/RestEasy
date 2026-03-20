/**
 * RestEasy — ProgressRing
 * Circular progress indicator in Soft Lavender with glow effect.
 * Used on Home screen to show week progression (e.g. Week 3 of 6).
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface ProgressRingProps {
  currentWeek: number;
  totalWeeks?: number;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({ currentWeek, totalWeeks = 6, size = 220 }: ProgressRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = currentWeek / totalWeeks;

  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="rgba(184, 169, 201, 0.18)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress fill */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.softLavender}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        {/* Moon icon */}
        <Text style={styles.moonIcon}>🌙</Text>
        <Text style={styles.weekText}>
          Semaine {currentWeek} sur {totalWeeks}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  weekText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
