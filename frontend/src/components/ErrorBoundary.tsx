import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in VibeMatch component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (Platform.OS === 'web') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>SYSTEM GLITCH</Text>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>FATAL_UI_EXCEPTION</Text>
            </View>

            <Text style={styles.message}>
              VibeMatch encountered an unexpected rendering error. This could be due to malformed input, emojis, or network failure.
            </Text>

            {this.state.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
              </View>
            )}

            <Pressable onPress={this.handleReset} style={styles.button}>
              <Text style={styles.buttonText}>RELOAD APPLICATION</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  badgeText: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  message: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    maxHeight: 120,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'var(--font-mono)' : 'monospace',
  },
  button: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
