/**
 * RestEasy — Global Error Boundary
 * Wraps the entire app to catch unhandled JS errors.
 * Reports to Sentry and shows a friendly fallback screen.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureError } from '../lib/sentry';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? '' });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.deepNavy, '#0D2347']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.emoji}>🌙</Text>
        <Text style={styles.title}>Quelque chose s'est mal passé</Text>
        <Text style={styles.subtitle}>
          Une erreur inattendue s'est produite. Notre équipe a été notifiée automatiquement.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.deepNavy,
  },
  emoji: { fontSize: 56, marginBottom: 20 },
  title: {
    ...typography.h2,
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.warmPeach,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
  },
  buttonText: {
    ...typography.button,
    color: colors.deepNavy,
  },
});
