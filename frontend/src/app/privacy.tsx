import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.badge}>DATA PROTECTION</Text>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.version}>Version 1.0 • Effective June 30, 2026</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Data We Process</Text>
          <Text style={styles.paragraph}>
            VibeMatch is built on privacy-first and data-minimization principles under the **Digital Personal Data Protection (DPDP) Act, 2023** of India. We do not require or collect emails, passwords, phone numbers, or real identities. We process only:
          </Text>
          <Text style={styles.bullet}>• **Temporary Nicknames**: Provided by you to identify you in the lobby.</Text>
          <Text style={styles.bullet}>• **Security Network Logs (IP Address)**: Processed strictly to detect and block VPN/Proxy bypasses and mitigate rate-limiting abuse (blocking malicious bots).</Text>
          <Text style={styles.bullet}>• **Preference Inputs**: Your chosen availability times, budget level, and natural language vibe description.</Text>
          <Text style={styles.bullet}>• **Timezone Offsets**: Used to compare browser clocks against Geolocation coordinates to verify VPN usage.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Purpose of Collection</Text>
          <Text style={styles.paragraph}>
            All processed data is utilized strictly to:
          </Text>
          <Text style={styles.bullet}>1. Calculate the optimal overlapping group plan using our matching algorithm.</Text>
          <Text style={styles.bullet}>2. Maintain system security (blocking developer tools, malicious scripts, and VPN spoofs).</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Strict 10-Minute Erasure Policy</Text>
          <Text style={styles.paragraph}>
            In compliance with Section 6 of the DPDP Act, 2023, data is retained only as long as necessary to fulfill the purpose of matching. 
          </Text>
          <Text style={styles.paragraph}>
            **All active room logs, lobby nick sessions, and preferences are automatically expired 10 minutes after room creation.** Once expired, this data is locked, cannot be queried, and is systematically deleted from the database.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Intermediary Compliance & Security</Text>
          <Text style={styles.paragraph}>
            We execute reasonable security practices and procedures as mandated under Section 43A of the **Information Technology Act, 2000** to prevent unauthorized access or disclosure of temporary lobby logs.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about your privacy rights or wish to exercise your rights as a data principal in India, please contact our support team at:
            <Text style={styles.contactEmail}> privacy@vibematch.in</Text>.
          </Text>
        </View>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>ACCEPT AND RETURN</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 50,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    fontSize: 10,
    color: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  version: {
    fontSize: 11,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    marginVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    paddingLeft: 12,
    marginBottom: 4,
  },
  contactEmail: {
    color: '#0284C7',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
export { PrivacyScreen };
