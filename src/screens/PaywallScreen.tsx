/**
 * RestEasy — PaywallScreen
 * Multilingual paywall with RevenueCat packages.
 * Triggered when user tries to access a locked module (week 2+).
 * Supports FR, EN, ES, DE, PT, IT.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PurchasesPackage } from 'react-native-purchases';
import { useTranslation } from 'react-i18next';
import {
  getPackages,
  purchasePackage,
  restorePurchases,
  getPaywallCopy,
  PRODUCT_IDS,
} from '../lib/revenuecat';
import { Analytics } from '../lib/posthog';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { PeachButton } from '../components/PeachButton';
import { useScreenTracking } from '../hooks/useAnalytics';

interface PaywallScreenProps {
  trigger?: string;
  programWeek?: number;
  onSuccess: () => void;
  onDismiss: () => void;
}

const FEATURE_ICONS = ['🎯', '📊', '🧠', '🌙', '📈', '♾️'];

export function PaywallScreen({
  trigger = 'manual',
  programWeek = 1,
  onSuccess,
  onDismiss,
}: PaywallScreenProps) {
  const { i18n, t } = useTranslation();
  const copy = getPaywallCopy(i18n.language);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useScreenTracking('PaywallScreen');

  useEffect(() => {
    Analytics.paywallShown(trigger, programWeek);
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setLoading(true);
    const pkgs = await getPackages();
    setPackages(pkgs);
    // Auto-select the main product (program_full)
    const main = pkgs.find(p => p.product.identifier === PRODUCT_IDS.PROGRAM_FULL);
    setSelectedPkg(main ?? pkgs[0] ?? null);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    const result = await purchasePackage(selectedPkg);
    setPurchasing(false);

    if (result.success) {
      onSuccess();
    } else if (result.error && result.error !== 'cancelled') {
      Alert.alert(
        t('common.error'),
        t('common.payment_error'),
        [{ text: 'OK' }]
      );
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.isPro) {
      onSuccess();
    } else {
      Alert.alert(
        t('common.no_purchases_title'),
        t('common.no_purchases'),
        [{ text: 'OK' }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <LinearGradient colors={[colors.deepNavy, '#0D2347']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={colors.softLavender} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.deepNavy, '#0D2347', '#162040']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Text style={styles.heroEmoji}>🌙</Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          {/* Features */}
          <View style={styles.featuresCard}>
            {copy.features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{FEATURE_ICONS[i]}</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Packages */}
          <View style={styles.packages}>
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.identifier === pkg.identifier;
              const isMain = pkg.product.identifier === PRODUCT_IDS.PROGRAM_FULL;

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                  onPress={() => setSelectedPkg(pkg)}
                  activeOpacity={0.8}
                >
                  {isMain && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{copy.badge}</Text>
                    </View>
                  )}
                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageName, isSelected && styles.packageNameSelected]}>
                      {pkg.product.title || pkg.product.identifier}
                    </Text>
                    <Text style={[styles.packageDesc, isSelected && styles.packageDescSelected]}>
                      {pkg.product.description}
                    </Text>
                  </View>
                  <View style={styles.packagePriceBlock}>
                    <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                      {pkg.product.priceString}
                    </Text>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* CTA */}
          <PeachButton
            title={purchasing ? '...' : copy.cta}
            onPress={handlePurchase}
            disabled={!selectedPkg || purchasing}
            loading={purchasing}
            style={styles.cta}
          />

          {/* Restore */}
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
            {restoring
              ? <ActivityIndicator color={colors.textSecondary} size="small" />
              : <Text style={styles.restoreText}>{copy.restoreText}</Text>
            }
          </TouchableOpacity>

          {/* Legal */}
          <Text style={styles.legalText}>{copy.legalText}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy },
  loader: { flex: 1, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center' },
  safe: { flex: 1 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: colors.textSecondary, fontSize: 16 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  title: { ...typography.h1, color: colors.cream, textAlign: 'center', marginBottom: 10 },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  featuresCard: {
    width: '100%',
    backgroundColor: colors.navyMid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 14,
    marginBottom: 24,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 20, width: 28 },
  featureText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  packages: { width: '100%', gap: 12, marginBottom: 24 },
  packageCard: {
    width: '100%',
    backgroundColor: colors.navyMid,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageCardSelected: {
    borderColor: colors.warmPeach,
    backgroundColor: 'rgba(245, 199, 169, 0.08)',
  },
  badge: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: colors.warmPeach,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { ...typography.small, color: colors.deepNavy, fontWeight: '700' },
  packageInfo: { flex: 1, paddingRight: 12 },
  packageName: { ...typography.bodyMedium, color: colors.textSecondary },
  packageNameSelected: { color: colors.cream },
  packageDesc: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  packageDescSelected: { color: colors.textSecondary },
  packagePriceBlock: { alignItems: 'flex-end', gap: 8 },
  packagePrice: { ...typography.h2, color: colors.textSecondary },
  packagePriceSelected: { color: colors.warmPeach },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.warmPeach },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warmPeach,
  },
  cta: { width: '100%', marginBottom: 16 },
  restoreBtn: { paddingVertical: 12, marginBottom: 12 },
  restoreText: { ...typography.body, color: colors.textSecondary, textDecorationLine: 'underline' },
  legalText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
