import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import ErrorBoundary from '../components/ErrorBoundary';
import DevToolsBlocker from '../components/DevToolsBlocker';
import SecurityShield from '../components/SecurityShield';
import { api } from '../api';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [blockReason, setBlockReason] = useState<'devtools' | 'vpn' | 'abuse' | null>(null);
  const [blockDetails, setBlockDetails] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Run client-side VPN/timezone checks on load
    const checkVpn = async () => {
      try {
        const res = await api.checkVpnTimezone();
        if (res.vpnDetected) {
          setBlockReason('vpn');
          setBlockDetails(res.reason);
        }
      } catch (err) {
        console.error('Timezone check failed:', err);
      }
    };
    checkVpn();
  }, []);

  // Expose a window event listener or global helper for child screens to trigger a block (e.g., on 403 API responses)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSecurityBlock = (e: Event & { detail?: { reason: 'vpn' | 'abuse'; details?: string } }) => {
        if (e.detail) {
          setBlockReason(e.detail.reason);
          setBlockDetails(e.detail.details);
        }
      };
      window.addEventListener('vibematch-security-block', handleSecurityBlock as any);
      return () => {
        window.removeEventListener('vibematch-security-block', handleSecurityBlock as any);
      };
    }
  }, []);

  if (blockReason) {
    return (
      <SecurityShield reason={blockReason} details={blockDetails} />
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DevToolsBlocker onBlocked={(reason) => setBlockReason(reason)} />
        <View style={styles.container}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0915', // Root cyberpunk dark theme background
  },
});
export { RootLayout };
