/**
 * RestEasy — NightModeScreen
 * Ultra-dark interface for 3am use.
 * - Animated breathing circle (Soft Lavender glow, pulsing)
 * - "Breathe" label in center
 * - Two outlined peach buttons: "I can't sleep — Get up" | "Relaxation Exercise"
 * - Reminder text at bottom
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { PeachButton } from '../components/PeachButton';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { logNightModeSession } from '../lib/supabase';

const { width: W, height: H } = Dimensions.get('window');
const CIRCLE_SIZE = W * 0.65;

type BreathPhase = 'in' | 'hold' | 'out';

function useBreathingAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  const [phase, setPhase] = useState<BreathPhase>('in');

  useEffect(() => {
    let running = true;

    const cycle = () => {
      if (!running) return;

      // Inhale (4s)
      setPhase('in');
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.18, duration: 4000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 4000, useNativeDriver: true }),
      ]).start(() => {
        if (!running) return;
        // Hold (2s)
        setPhase('hold');
        setTimeout(() => {
          if (!running) return;
          // Exhale (6s)
          setPhase('out');
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 6000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.5, duration: 6000, useNativeDriver: true }),
          ]).start(() => {
            if (running) cycle();
          });
        }, 2000);
      });
    };

    cycle();
    return () => { running = false; };
  }, []);

  return { scale, opacity, phase };
}

interface NightModeScreenProps {
  navigation: any;
}

export function NightModeScreen({ navigation }: NightModeScreenProps) {
  const { t } = useTranslation();
  const { scale, opacity, phase } = useBreathingAnimation();
  const [showGetUp, setShowGetUp] = useState(false);

  const phaseLabel = {
    in: t('night.breathe_in'),
    hold: t('night.breathe_hold'),
    out: t('night.breathe_out'),
  }[phase];

  const handleGetUp = async () => {
    try { await logNightModeSession('get_up'); } catch {}
    setShowGetUp(true);
  };

  const handleRelaxation = async () => {
    try { await logNightModeSession('relaxation'); } catch {}
    // Could navigate to a relaxation exercise screen
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Breathing circle */}
        <View style={styles.circleWrapper}>
          {/* Outer glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                transform: [{ scale: Animated.multiply(scale, 1.12) }],
                opacity: Animated.multiply(opacity, 0.3),
              },
            ]}
          />
          {/* Main circle */}
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <Text style={styles.breatheLabel}>{phaseLabel}</Text>
          </Animated.View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <PeachButton
            title={`🪑  ${t('night.cant_sleep')}`}
            onPress={handleGetUp}
            variant="outline"
            style={styles.actionBtn}
          />
          <PeachButton
            title={`〰  ${t('night.relaxation')}`}
            onPress={handleRelaxation}
            variant="outline"
            style={styles.actionBtn}
          />
        </View>

        {/* Reminder */}
        <Text style={styles.reminder}>{t('night.reminder')}</Text>
      </SafeAreaView>

      {/* Get Up Modal */}
      <Modal visible={showGetUp} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('night.get_up_title')}</Text>
            <Text style={styles.modalText}>{t('night.get_up_text')}</Text>
            <PeachButton
              title={t('night.return_to_bed')}
              onPress={() => setShowGetUp(false)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060F1E', // Extra dark for night mode
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: 'rgba(184, 169, 201, 0.4)',
  },

  // Breathing circle
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.softLavender,
    shadowColor: colors.softLavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2.5,
    borderColor: colors.softLavender,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.softLavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  breatheLabel: {
    ...typography.h2,
    color: colors.cream,
    textAlign: 'center',
  },

  // Buttons
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 8,
  },
  actionBtn: {
    paddingVertical: 14,
  },

  // Reminder
  reminder: {
    ...typography.small,
    color: 'rgba(184, 169, 201, 0.45)',
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: 8,
  },

  // Get Up Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    backgroundColor: colors.navyMid,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.cream,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
