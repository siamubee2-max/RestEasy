/**
 * RestEasy — RevenueCat Integration
 * Handles purchases, entitlements, and localized paywalls.
 * Integrates with PostHog for purchase analytics and Sentry for error tracking.
 *
 * Products:
 *   - program_full   : Programme complet 6 semaines (49,99€)
 *   - tools_pack     : Pack outils post-programme (19,99€)
 *   - booster        : Programme booster 2 semaines (14,99€)
 *
 * Entitlement: "pro" → unlocks all weeks
 */
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { Analytics } from './posthog';
import { captureError } from './sentry';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ENTITLEMENTS = {
  PRO: 'pro',
  TOOLS: 'tools',
  BOOSTER: 'booster',
} as const;

export const PRODUCT_IDS = {
  PROGRAM_FULL: 'program_full',
  TOOLS_PACK: 'tools_pack',
  BOOSTER: 'booster',
} as const;

export const OFFERINGS = {
  DEFAULT: 'default',
  PROMO: 'promo_launch',
  EXPERIMENT_A: 'paywall_experiment_a',  // Price: 49.99€ — control
  EXPERIMENT_B: 'paywall_experiment_b',  // Price: 39.99€ — challenger
  FREE_TRIAL: 'free_trial_7_days',
} as const;

// ─── Free Trial (7 days) ──────────────────────────────────────────────────────

const FREE_TRIAL_DAYS = 7;

export function isInFreeTrial(installDate: Date): boolean {
  const diffDays = (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= FREE_TRIAL_DAYS;
}

export function getFreeTrialDaysRemaining(installDate: Date): number {
  const diffDays = (Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(FREE_TRIAL_DAYS - diffDays));
}

// ─── A/B Test Paywall ─────────────────────────────────────────────────────────

export async function getPaywallOfferingForVariant(
  variant?: 'A' | 'B'
): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (variant === 'A' && offerings.all[OFFERINGS.EXPERIMENT_A]) {
      return offerings.all[OFFERINGS.EXPERIMENT_A];
    }
    if (variant === 'B' && offerings.all[OFFERINGS.EXPERIMENT_B]) {
      return offerings.all[OFFERINGS.EXPERIMENT_B];
    }
    return offerings.current ?? null;
  } catch (error) {
    captureError(error as Error, { context: 'getPaywallOfferingForVariant' });
    return null;
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────

export async function initRevenueCat(userId?: string): Promise<void> {
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    } else {
      Purchases.setLogLevel(LOG_LEVEL.ERROR);
    }

    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? '',
      android: process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? '',
    }) ?? '';

    if (!apiKey) {
      console.warn('[RevenueCat] API key not configured');
      return;
    }

    await Purchases.configure({ apiKey });

    if (userId) {
      await Purchases.logIn(userId);
      // Sync PostHog distinct ID for attribution
      await Purchases.setAttributes({ posthog_distinct_id: userId });
    }
  } catch (error) {
    captureError(error as Error, { context: 'initRevenueCat' });
  }
}

// ─── Identify user ────────────────────────────────────────────────────────────

export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    await Purchases.setAttributes({ posthog_distinct_id: userId });
  } catch (error) {
    captureError(error as Error, { context: 'identifyUser' });
  }
}

// ─── Customer info ────────────────────────────────────────────────────────────

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    captureError(error as Error, { context: 'getCustomerInfo' });
    return null;
  }
}

export async function checkEntitlement(entitlement: string): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return entitlement in customerInfo.entitlements.active;
  } catch {
    return false;
  }
}

export async function hasProAccess(): Promise<boolean> {
  return checkEntitlement(ENTITLEMENTS.PRO);
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function getOfferings(
  offeringId: string = OFFERINGS.DEFAULT
): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.all[offeringId] ?? offerings.current ?? null;
  } catch (error) {
    captureError(error as Error, { context: 'getOfferings', offeringId });
    return null;
  }
}

export async function getPackages(): Promise<PurchasesPackage[]> {
  const offering = await getOfferings();
  if (!offering) return [];
  return offering.availablePackages.sort(
    (a, b) => (a.product.price ?? 0) - (b.product.price ?? 0)
  );
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
  try {
    Analytics.purchaseStarted(pkg.product.identifier);

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isProNow = !!customerInfo.entitlements.active[ENTITLEMENTS.PRO];

    if (isProNow) {
      Analytics.purchaseCompleted(
        pkg.product.identifier,
        pkg.product.price ?? 0,
        pkg.product.currencyCode ?? 'EUR'
      );
    }

    return { success: isProNow, customerInfo };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    Analytics.purchaseFailed(pkg.product.identifier, error?.code ?? 'unknown');
    captureError(error as Error, {
      context: 'purchasePackage',
      product: pkg.product.identifier,
    });
    return { success: false, error: error?.message ?? 'unknown_error' };
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isProNow = !!customerInfo.entitlements.active[ENTITLEMENTS.PRO];
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    Analytics.purchaseRestored(activeEntitlements);
    return { success: true, isPro: isProNow };
  } catch (error: any) {
    captureError(error as Error, { context: 'restorePurchases' });
    return { success: false, isPro: false, error: error?.message };
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch {
    // Ignore logout errors
  }
}

// ─── Localised paywall copy ───────────────────────────────────────────────────

export interface PaywallCopy {
  title: string;
  subtitle: string;
  badge: string;
  features: string[];
  cta: string;
  restoreText: string;
  legalText: string;
}

export const PAYWALL_COPY: Record<string, PaywallCopy> = {
  fr: {
    title: 'Débloquer RestEasy',
    subtitle: 'Un programme cliniquement prouvé pour retrouver le sommeil',
    badge: 'Le plus populaire',
    features: [
      '6 semaines de programme TCC-I complet',
      'Ajustement automatique de votre fenêtre de sommeil',
      'Modules cognitifs débloqués semaine par semaine',
      'Mode nuit avec exercices de respiration',
      'Graphiques de progression détaillés',
      'Accès à vie, mises à jour incluses',
    ],
    cta: 'Commencer maintenant',
    restoreText: 'Restaurer mes achats',
    legalText: 'Paiement unique, aucun abonnement. Conformément aux CGV.',
  },
  en: {
    title: 'Unlock RestEasy',
    subtitle: 'A clinically proven program to help you sleep again',
    badge: 'Most popular',
    features: [
      '6-week complete CBT-I program',
      'Automatic sleep window adjustment',
      'Cognitive modules unlocked week by week',
      'Night mode with breathing exercises',
      'Detailed progress charts',
      'Lifetime access, updates included',
    ],
    cta: 'Start now',
    restoreText: 'Restore purchases',
    legalText: 'One-time payment, no subscription. Subject to Terms of Service.',
  },
  es: {
    title: 'Desbloquear RestEasy',
    subtitle: 'Un programa clínicamente probado para volver a dormir',
    badge: 'Más popular',
    features: [
      'Programa completo de TCC-I de 6 semanas',
      'Ajuste automático de tu ventana de sueño',
      'Módulos cognitivos desbloqueados semana a semana',
      'Modo nocturno con ejercicios de respiración',
      'Gráficos de progreso detallados',
      'Acceso de por vida, actualizaciones incluidas',
    ],
    cta: 'Empezar ahora',
    restoreText: 'Restaurar compras',
    legalText: 'Pago único, sin suscripción. Sujeto a los Términos de Servicio.',
  },
  de: {
    title: 'RestEasy freischalten',
    subtitle: 'Ein klinisch erprobtes Programm, das Ihnen hilft, wieder zu schlafen',
    badge: 'Am beliebtesten',
    features: [
      '6-wöchiges vollständiges KVT-I-Programm',
      'Automatische Anpassung Ihres Schlaffensters',
      'Kognitive Module werden Woche für Woche freigeschaltet',
      'Nachtmodus mit Atemübungen',
      'Detaillierte Fortschrittsdiagramme',
      'Lebenslanger Zugang, Updates inklusive',
    ],
    cta: 'Jetzt starten',
    restoreText: 'Käufe wiederherstellen',
    legalText: 'Einmalige Zahlung, kein Abonnement. Gemäß den Nutzungsbedingungen.',
  },
  pt: {
    title: 'Desbloquear RestEasy',
    subtitle: 'Um programa clinicamente comprovado para você dormir novamente',
    badge: 'Mais popular',
    features: [
      'Programa completo de TCC-I de 6 semanas',
      'Ajuste automático da sua janela de sono',
      'Módulos cognitivos desbloqueados semana a semana',
      'Modo noturno com exercícios de respiração',
      'Gráficos de progresso detalhados',
      'Acesso vitalício, atualizações incluídas',
    ],
    cta: 'Começar agora',
    restoreText: 'Restaurar compras',
    legalText: 'Pagamento único, sem assinatura. Sujeito aos Termos de Serviço.',
  },
  it: {
    title: 'Sblocca RestEasy',
    subtitle: 'Un programma clinicamente provato per aiutarti a dormire di nuovo',
    badge: 'Il più popolare',
    features: [
      'Programma completo CBT-I di 6 settimane',
      'Regolazione automatica della tua finestra del sonno',
      'Moduli cognitivi sbloccati settimana per settimana',
      'Modalità notte con esercizi di respirazione',
      'Grafici di progresso dettagliati',
      'Accesso a vita, aggiornamenti inclusi',
    ],
    cta: 'Inizia ora',
    restoreText: 'Ripristina acquisti',
    legalText: 'Pagamento unico, nessun abbonamento. Soggetto ai Termini di Servizio.',
  },
};

export function getPaywallCopy(locale: string): PaywallCopy {
  const lang = locale.split('-')[0].toLowerCase();
  return PAYWALL_COPY[lang] ?? PAYWALL_COPY['en'];
}

// ─── Referral Codes ───────────────────────────────────────────────────────────

export async function applyReferralCode(code: string): Promise<boolean> {
  try {
    await Purchases.setAttributes({ referral_code: code.toUpperCase() });
    Analytics.track('referral_code_applied', { code: code.toUpperCase() });
    return true;
  } catch (error) {
    captureError(error as Error, { context: 'applyReferralCode' });
    return false;
  }
}
