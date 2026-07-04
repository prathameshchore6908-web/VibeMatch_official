import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.badge}>LEGAL COMPLIANCE</Text>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.version}>Version 1.0 • Effective June 30, 2026</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Operating Framework & Consent</Text>
          <Text style={styles.paragraph}>
            Welcome to VibeMatch ("the Application"). By creating or joining a Vibe Room, you explicitly agree to these Terms and Conditions. The Application operates in India and is governed by the laws of India, including the **Information Technology Act, 2000** and the **Digital Personal Data Protection (DPDP) Act, 2023**.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. User Conduct & Content Guidelines</Text>
          <Text style={styles.paragraph}>
            VibeMatch is designed to coordinate group activities with friends. You agree to use the Application responsibly. You are strictly prohibited from submitting, sharing, or propagating any content that:
          </Text>
          <Text style={styles.bullet}>• Harasses, abuses, defames, or intimidates any individual or group.</Text>
          <Text style={styles.bullet}>• Promotes hate speech, violence, racism, or discrimination.</Text>
          <Text style={styles.bullet}>• Contains illegal, obscene, pornographic, or offensive materials.</Text>
          <Text style={styles.bullet}>• Infringes on third-party intellectual property or privacy rights.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Intermediary Status & Disclaimer of Liability</Text>
          <Text style={styles.paragraph}>
            The Application functions strictly as an intermediary under Section 79 of the **Information Technology Act, 2000**. We do not verify or control user-generated suggestions, availability inputs, or natural language "vibe descriptions".
          </Text>
          <Text style={styles.paragraph}>
            We disclaim all liability for any interactions, events, or outcomes resulting from live coordinate meetings, matches generated, or activities conducted. The final plan outputted is determined algorithmically based on participant inputs and is used at the participants' sole risk.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Erasure & Lifecycle</Text>
          <Text style={styles.paragraph}>
            In compliance with the data minimization and storage limitation principles of the **DPDP Act, 2023**, all rooms, lobby records, nicknames, and inputs are temporary. Room data is locked 10 minutes after room creation and is systematically deactivated/expired.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Grievance Officer</Text>
          <Text style={styles.paragraph}>
            Under the provisions of the Information Technology Rules, 2011 and the DPDP Act, 2023, if you have any questions, concerns, or grievances regarding content or data processing, you can reach out to our Grievance Officer:
          </Text>
          <View style={styles.officerBox}>
            <Text style={styles.officerLabel}>Name: <Text style={styles.officerValue}>Grievance Redressal Officer</Text></Text>
            <Text style={styles.officerLabel}>Email: <Text style={styles.officerValue}>grievance@vibematch.in</Text></Text>
            <Text style={styles.officerLabel}>Address: <Text style={styles.officerValue}>Bangalore, Karnataka, India</Text></Text>
          </View>
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
  officerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
    padding: 14,
    marginTop: 8,
  },
  officerLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  officerValue: {
    color: '#0F172A',
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
export { TermsScreen };
