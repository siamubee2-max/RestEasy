/**
 * RestEasy — TimePickerCard
 * Card with question label and time display (hour:minute AM/PM).
 * Tapping opens a modal wheel picker.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface TimePickerCardProps {
  label: string;
  value: string; // "23:30"
  onChange: (time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, '0')} : ${String(m).padStart(2, '0')} ${period}`;
}

export function TimePickerCard({ label, value, onChange }: TimePickerCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tempH, setTempH] = useState(() => parseInt(value.split(':')[0]));
  const [tempM, setTempM] = useState(() => parseInt(value.split(':')[1]));

  const confirm = () => {
    onChange(formatTime(tempH, tempM));
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setTempH(parseInt(value.split(':')[0]));
          setTempM(parseInt(value.split(':')[1]));
          setOpen(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatDisplay(value)}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={styles.confirmText}>OK</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerRow}>
              {/* Hours */}
              <ScrollView
                style={styles.pickerColumn}
                showsVerticalScrollIndicator={false}
                snapToInterval={48}
                decelerationRate="fast"
              >
                {HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.pickerItem, tempH === h && styles.pickerItemActive]}
                    onPress={() => setTempH(h)}
                  >
                    <Text style={[styles.pickerText, tempH === h && styles.pickerTextActive]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.pickerSeparator}>:</Text>

              {/* Minutes */}
              <ScrollView
                style={styles.pickerColumn}
                showsVerticalScrollIndicator={false}
                snapToInterval={48}
                decelerationRate="fast"
              >
                {MINUTES.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, tempM === m && styles.pickerItemActive]}
                    onPress={() => setTempM(m)}
                  >
                    <Text style={[styles.pickerText, tempM === m && styles.pickerTextActive]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timeContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 29, 58, 0.6)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  timeText: {
    ...typography.timeDisplay,
    color: colors.warmPeach,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.navyMid,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  confirmText: {
    ...typography.bodyMedium,
    color: colors.warmPeach,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    paddingHorizontal: 40,
  },
  pickerColumn: {
    flex: 1,
    height: 200,
  },
  pickerItem: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(245, 199, 169, 0.15)',
  },
  pickerText: {
    ...typography.h2,
    color: colors.textMuted,
  },
  pickerTextActive: {
    color: colors.warmPeach,
  },
  pickerSeparator: {
    ...typography.h1,
    color: colors.textSecondary,
    paddingHorizontal: 8,
  },
});
