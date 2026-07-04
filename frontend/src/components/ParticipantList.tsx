import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Participant } from '../api';

interface ParticipantListProps {
  participants: Participant[];
}

export default function ParticipantList({ participants }: ParticipantListProps) {
  const isDark = true; // Force dark theme permanently
  
  const submittedCount = participants.filter(p => p.has_submitted).length;

  const cardBg = 'rgba(29, 24, 69, 0.75)'; // Semi-transparent glassmorphic card background
  const borderColor = '#3B2E7C';  // Violet border
  const textColor = '#F5F3FF';
  const labelColor = '#A78BFA';
  const itemBg = '#120E2E';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: '#8B5CF6' }]}>THE SQUAD LOBBY 👾</Text>
        <Text style={[styles.counter, { color: labelColor }]}>
          {submittedCount} / {participants.length} READY
        </Text>
      </View>

      {participants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Waiting for the squad to link up...</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {participants.map((p, idx) => (
            <View key={p.nickname + idx} style={[styles.participantItem, { backgroundColor: itemBg, borderColor }]}>
              <View style={[
                styles.statusDot, 
                p.has_submitted ? styles.statusReady : styles.statusPending
              ]} />
              <Text style={[
                styles.nickname, 
                { color: p.has_submitted ? textColor : '#94A3B8' }
              ]} numberOfLines={1}>
                {p.nickname}
              </Text>
              <Text style={styles.statusLabel}>
                {p.has_submitted ? 'LOCKED 🔒' : 'TYPING... ✍️'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32, // Bubbly claymorphism
    borderWidth: 4, // Thick clay border
    padding: 24,
    borderColor: '#4C3D9A', // Lighter purple clay border highlight
    backgroundColor: '#1D1845',
    width: '100%',
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(155, 120, 246, 0.1)',
    paddingBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  counter: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14, // Rounded
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexGrow: 1,
    minWidth: '45%',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusReady: {
    backgroundColor: '#10B981', // Joyful Green for ready
  },
  statusPending: {
    backgroundColor: '#F59E0B', // Sunny Yellow for pending
  },
  nickname: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  statusLabel: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});
