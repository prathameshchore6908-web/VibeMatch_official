import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { playClickSound } from '../utils/sound';

interface UserLocation {
  city: string;
  state: string;
  country: string;
  currency: string;
}

const fetchUserLocation = async (): Promise<UserLocation> => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return {
      city: data.city || 'Mumbai',
      state: data.region || 'Maharashtra',
      country: data.country_name || 'India',
      currency: data.currency || 'INR'
    };
  } catch (err) {
    console.warn('Geolocation lookup failed, using fallbacks:', err);
    return {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      currency: 'INR'
    };
  }
};

const getLocalCurrencyConfig = (currencyCode: string) => {
  const configs: Record<string, { symbol: string; values: number[] }> = {
    INR: { symbol: '₹', values: [150, 400, 900, 2500] },
    USD: { symbol: '$', values: [10, 25, 55, 120] },
    EUR: { symbol: '€', values: [8, 20, 45, 100] },
    GBP: { symbol: '£', values: [7, 18, 40, 90] },
    JPY: { symbol: '¥', values: [1500, 3800, 8000, 18000] },
    AUD: { symbol: 'A$', values: [15, 35, 75, 160] },
    CAD: { symbol: 'C$', values: [14, 30, 70, 150] }
  };
  return configs[currencyCode] || configs['INR']; // Default to INR/India
};

interface RoomFormProps {
  nickname: string;
  submitting: boolean;
  onSubmit: (
    availability: '9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight',
    budget: number,
    vibeText: string
  ) => void;
}

export default function RoomForm({ nickname, submitting, onSubmit }: RoomFormProps) {
  const isDark = true; // Force dark theme permanently

  const [availability, setAvailability] = useState<'9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight' | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [vibeText, setVibeText] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation>({
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    currency: 'INR'
  });

  React.useEffect(() => {
    fetchUserLocation().then(loc => {
      setUserLocation(loc);
    });
  }, []);

  const MAX_CHAR_LIMIT = 200;

  const handleSubmit = () => {
    if (!availability || !budget) return;
    onSubmit(availability, budget, vibeText);
  };

  const isFormValid = availability !== null && budget !== null;

  // Adaptive styles
  const cardBg = 'rgba(29, 24, 69, 0.75)'; // Semi-transparent glassmorphic card background
  const borderColor = '#3B2E7C';
  const textColor = '#F5F3FF';
  const labelColor = '#A78BFA';
  const inputBg = '#120E2E';
  const blueprintBg = 'rgba(139, 92, 246, 0.05)';
  const blueprintBorder = 'rgba(139, 92, 246, 0.15)';

  return (
    <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>
      <Text style={[styles.sectionTitle, { color: '#8B5CF6' }]}>DROP YOUR VIBE 🎤</Text>
      <Text style={styles.subtitle}>Representing: <Text style={styles.nicknameText}>{nickname}</Text></Text>

      {/* 1. Availability Selector (Timeline UI) */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: labelColor }]}>1. When are we linking up?</Text>
        <View style={styles.timelineRow}>
          {(['9AM-1PM', '1PM-5PM', '5PM-8PM', '8PM-11PM', 'AfterMidnight'] as const).map((slot) => {
            const isSelected = availability === slot;
            const displayLabel = 
              slot === '9AM-1PM' ? 'Morning ☕' :
              slot === '1PM-5PM' ? 'Afternoon ☀️' :
              slot === '5PM-8PM' ? 'Evening 🌇' :
              slot === '8PM-11PM' ? 'Night Out 🌃' :
              'Midnight Crew 🌙';
            return (
              <Pressable
                key={slot}
                onPress={() => {
                  playClickSound();
                  setAvailability(slot);
                }}
                style={[
                  styles.timelineButton,
                  { borderColor: isSelected ? '#8B5CF6' : borderColor },
                  isSelected && styles.timelineButtonSelected,
                ]}
              >
                <Text style={[
                  styles.timelineText,
                  { color: isSelected ? '#8B5CF6' : labelColor },
                  isSelected && styles.timelineTextSelected
                ]}>
                  {displayLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Budget Tier Selector */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: labelColor }]}>2. Budget Vibe (Max Tier)</Text>
        <View style={styles.budgetRow}>
          {([1, 2, 3, 4] as const).map((tier) => {
            const isSelected = budget === tier;
            const config = getLocalCurrencyConfig(userLocation.currency);
            const amount = config.values[tier - 1];
            
            // Format currency code to symbol representation
            const displayAmount = new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: userLocation.currency,
              maximumFractionDigits: 0
            }).format(amount);

            const label = tier === 1 ? 'Cheap & Chill 💸' : tier === 2 ? 'Average 🍔' : tier === 3 ? 'Fancy 💅' : 'Rich Mode 💎';
            return (
              <Pressable
                key={tier}
                onPress={() => {
                  playClickSound();
                  setBudget(tier);
                }}
                style={[
                  styles.budgetButton,
                  { borderColor: isSelected ? '#8B5CF6' : borderColor },
                  isSelected && styles.budgetButtonSelected,
                ]}
              >
                <Text style={[
                  styles.budgetText,
                  { color: isSelected ? '#8B5CF6' : labelColor },
                  isSelected && styles.budgetTextSelected
                ]}>
                  {displayAmount}
                </Text>
                <Text style={[
                  styles.budgetLabel,
                  { color: isSelected ? '#8B5CF6' : '#94A3B8' }
                ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 3. Vibe Blueprint Helper Box */}
      <View style={[styles.blueprintBox, { backgroundColor: blueprintBg, borderColor: blueprintBorder }]}>
        <Text style={styles.blueprintTitle}>💡 VIBE FORMAT</Text>
        <Text style={styles.blueprintText}>
          Format: <Text style={styles.boldText}>I want [X] but avoid [Y]</Text> (Write as many lines as you want!)
        </Text>
        <Text style={styles.blueprintExample}>
          e.g., "I want a cozy cafe or gaming zone,{"\n"}but avoid loud places and no sushi."
        </Text>
      </View>

      {/* 4. Vibe Text Input */}
      <View style={styles.fieldGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: labelColor }]}>4. What's the vibe?</Text>
          <Text style={[styles.charCounter, vibeText.length >= MAX_CHAR_LIMIT && styles.charCounterMax]}>
            {vibeText.length}/{MAX_CHAR_LIMIT}
          </Text>
        </View>
        <TextInput
          style={[styles.textArea, { backgroundColor: inputBg, borderColor, color: textColor }]}
          multiline
          numberOfLines={4}
          maxLength={MAX_CHAR_LIMIT}
          placeholder="e.g., 'aesthetic cafe with board games, no spicy food'..."
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={vibeText}
          onChangeText={setVibeText}
        />
        <Text style={styles.inputTip}>Our parser handles what you love and what you want to avoid automatically.</Text>
      </View>

      {/* Submit Action */}
      <Pressable
        onPress={() => {
          playClickSound();
          handleSubmit();
        }}
        disabled={!isFormValid || submitting}
        style={[
          styles.submitButton,
          (!isFormValid || submitting) && styles.submitButtonDisabled,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={styles.submitButtonText}>LOCK IT IN 🔒</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 20,
  },
  nicknameText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  charCounter: {
    color: '#94A3B8',
    fontSize: 10,
  },
  charCounterMax: {
    color: '#EF4444',
  },
  timelineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineButton: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 105,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 18, // Pill-ish bubbly buttons
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineButtonSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  timelineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timelineTextSelected: {
    fontWeight: 'bold',
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 18, // Bubbly buttons
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetButtonSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  budgetText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  budgetTextSelected: {
    color: '#8B5CF6',
  },
  budgetLabel: {
    fontSize: 8,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  blueprintBox: {
    borderWidth: 1.5,
    borderRadius: 18, // Rounded helper box
    padding: 14,
    marginBottom: 20,
  },
  blueprintTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginBottom: 4,
  },
  blueprintText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  blueprintExample: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  textArea: {
    borderWidth: 2,
    borderRadius: 14, // Rounded text area
    padding: 12,
    fontSize: 13.5,
    height: 90,
    textAlignVertical: 'top',
  },
  inputTip: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 32, // Rounded clay pill
    borderWidth: 3,
    borderColor: '#A78BFA', // Highlight
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A081F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
