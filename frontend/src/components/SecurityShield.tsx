import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';

interface SecurityShieldProps {
  reason: 'devtools' | 'vpn' | 'abuse';
  details?: string;
}

export default function SecurityShield({ reason, details }: SecurityShieldProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const getInfo = () => {
    switch (reason) {
      case 'devtools':
        return {
          title: 'DEVELOPER MODE DETECTED',
          message: 'Access Denied. For app security, inspect elements and developer tools are strictly blocked.',
          color: '#EF4444', // Red
        };
      case 'vpn':
        return {
          title: 'VPN OR PROXY DETECTED',
          message: details || 'Access Denied. To prevent spoofing and ensure room integrity, VPNs/proxies are blocked.',
          color: '#0284C7', // Sky Blue
        };
      case 'abuse':
        return {
          title: 'RATE LIMIT / ABUSE DETECTED',
          message: details || 'Access Denied. Multiple room creations detected from your IP. Flagged for security check.',
          color: '#F59E0B', // Amber
        };
    }
  };

  const info = getInfo();

  const containerBg = isDark ? '#0F172A' : '#F8FAFC';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const messageColor = isDark ? '#CBD5E1' : '#475569';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: info.color }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: info.color }]}>{info.title}</Text>
        </View>
        
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: `${info.color}10`, borderColor: info.color }]}>
            <Text style={[styles.badgeText, { color: info.color }]}>SECURE LOCK</Text>
          </View>
        </View>

        <Text style={[styles.message, { color: messageColor }]}>{info.message}</Text>
        
        <Text style={styles.footer}>
          VIBEMATCH ACCESS CONTROL • PROTOCOL SHIELD V1.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 2,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  badgeContainer: {
    marginBottom: 25,
  },
  badge: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 30,
  },
  footer: {
    color: '#94A3B8',
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
