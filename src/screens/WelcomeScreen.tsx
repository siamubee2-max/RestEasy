/**
 * RestEasy — WelcomeScreen
 * Full-screen night sky illustration, moon + clouds, bold serif title,
 * warm peach CTA. Matches mockup exactly.
 * On CTA press: creates anonymous Supabase session and enters app.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { PeachButton } from '../components/PeachButton';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useAuth } from '../hooks/useAuth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Moon + clouds illustration (generated asset)
const HERO_IMAGE = {
  uri: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663144691943/KeM4cPFcdXg2oxRYScUCPs/resteasy-welcome-hero-frQSAikHkWzEWQDTajFNAn.webp',
};

export function WelcomeScreen() {
  const { t } = useTranslation();
  const { startAnonymousSession } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBegin = async () => {
    setLoading(true);
    await startAnonymousSession();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.deepNavy} />

      {/* Hero illustration — top 55% */}
      <View style={styles.heroContainer}>
        <Image source={HERO_IMAGE} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', colors.deepNavy]}
          style={styles.heroGradient}
        />
      </View>

      {/* Content */}
      <SafeAreaView style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{t('welcome.title')}</Text>
          <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        </View>

        <View style={styles.ctaBlock}>
          <PeachButton
            title={t('welcome.cta')}
            onPress={handleBegin}
            loading={loading}
          />
          <Text style={styles.disclaimer}>{t('welcome.disclaimer')}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepNavy,
  },
  heroContainer: {
    height: SCREEN_HEIGHT * 0.52,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  textBlock: {
    alignItems: 'center',
    paddingTop: 8,
  },
  title: {
    ...typography.display,
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(245, 240, 232, 0.75)',
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaBlock: {
    gap: 16,
    alignItems: 'center',
  },
  disclaimer: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
