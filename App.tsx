/**
 * RestEasy — Root App
 * Auth flow:
 *   No session → WelcomeScreen (anonymous sign-in)
 *   Session + no display_name → OnboardingScreen
 *   Session + display_name → Main app (TabNavigator)
 */
import 'react-native-url-polyfill/auto';
import './src/utils/i18n';
import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppNavigator } from './src/navigation/TabNavigator';
import { useAuth } from './src/hooks/useAuth';
import { initRevenueCat } from './src/lib/revenuecat';
import { supabase } from './src/lib/supabase';
import { colors } from './src/theme/colors';

function AppContent() {
  const { user, loading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setHasProfile(null);
      return;
    }

    // Init RevenueCat with user ID
    initRevenueCat(user.id).catch(console.error);

    // Check if onboarding is complete
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setHasProfile(!!data?.display_name && data.display_name !== 'Utilisateur');
      })
      .catch(() => setHasProfile(false))
      .finally(() => setProfileLoading(false));
  }, [user]);

  if (loading || profileLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.softLavender} size="large" />
      </View>
    );
  }

  if (!user) {
    return <WelcomeScreen />;
  }

  if (!hasProfile) {
    return <OnboardingScreen onComplete={() => setHasProfile(true)} />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.softLavender} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.deepNavy} />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
