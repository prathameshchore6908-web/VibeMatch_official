import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform, useColorScheme } from 'react-native';
import { MatchingResult, Venue } from '../api';
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

const getVenueLocationAndColor = (idx: number, userLoc: UserLocation) => {
  if (idx === 0) {
    return {
      text: `${userLoc.city}, ${userLoc.state}, ${userLoc.country}`,
      label: 'Same City',
      badgeBg: 'rgba(34, 197, 94, 0.12)',
      badgeBorder: '#22C55E',
      textColor: '#4ADE80'
    };
  } else if (idx === 1) {
    const altCity = userLoc.country.includes('India') ? 'Pune' : 'San Jose';
    return {
      text: `${altCity}, ${userLoc.state}, ${userLoc.country}`,
      label: 'Out of City',
      badgeBg: 'rgba(234, 179, 8, 0.12)',
      badgeBorder: '#EAB308',
      textColor: '#FACC15'
    };
  } else if (idx === 2) {
    const altCity = userLoc.country.includes('India') ? 'Delhi' : 'New York City';
    const altState = userLoc.country.includes('India') ? 'Delhi' : 'New York';
    return {
      text: `${altCity}, ${altState}, ${userLoc.country}`,
      label: 'Out of State',
      badgeBg: 'rgba(249, 115, 22, 0.12)',
      badgeBorder: '#F97316',
      textColor: '#FB923C'
    };
  } else {
    const altCity = userLoc.country.includes('India') ? 'London' : 'Tokyo';
    const altCountry = userLoc.country.includes('India') ? 'United Kingdom' : 'Japan';
    return {
      text: `${altCity}, ${altCountry}`,
      label: 'Out of Country',
      badgeBg: 'rgba(239, 68, 68, 0.12)',
      badgeBorder: '#EF4444',
      textColor: '#F87171'
    };
  }
};

interface FinalResultProps {
  result: MatchingResult;
}

export default function FinalResult({ result }: FinalResultProps) {
  const isDark = true; // Force dark theme permanently
  const [copied, setCopied] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    currency: 'INR'
  });

  useEffect(() => {
    fetchUserLocation().then(loc => {
      setUserLocation(loc);
    });
  }, []);

  const { venue, time_slot, budget_tier } = result;

  const currencyConfig = getLocalCurrencyConfig(userLocation.currency);
  const matchedAmount = currencyConfig.values[budget_tier - 1];
  const displayAmount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: userLocation.currency,
    maximumFractionDigits: 0
  }).format(matchedAmount);

  const handleOpenMap = () => {
    if (venue.maps_url) {
      Linking.openURL(venue.maps_url).catch((err) =>
        console.error('Failed to open map URL:', err)
      );
    } else {
      const query = encodeURIComponent(`${venue.name} ${venue.category}`);
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      Linking.openURL(fallbackUrl).catch((err) =>
        console.error('Failed to open fallback map URL:', err)
      );
    }
  };

  const handleShareResult = async () => {
    const text = `🎉 VibeMatch Selected!\n📍 Venue: ${venue.name} (${venue.category})\n⏰ Time: ${time_slot}\n💰 Price: ${'$'.repeat(budget_tier)}\n✨ Description: ${venue.description || 'No description'}\n🔒 Non-negotiable! See you there!`;
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  const cardBg = 'rgba(29, 24, 69, 0.75)'; // Semi-transparent glassmorphic card background
  const borderColor = '#3B2E7C';  // Violet border
  const textColor = '#F5F3FF';
  const labelColor = '#A78BFA';
  const innerBg = '#120E2E';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: '#8B5CF6' }]}>
      <View style={styles.header}>
        <Text style={styles.matchBadge}>VIBE SECURED 🎉</Text>
        <Text style={styles.nonNegotiable}>NO CAP, THIS PLAN IS LOCKED IN!</Text>
      </View>

      {/* Venue card */}
      <View style={[styles.venueContainer, { backgroundColor: innerBg, borderColor }]}>
        <Text style={[styles.category, { color: '#8B5CF6' }]}>{venue.category.toUpperCase()}</Text>
        <Text style={[styles.venueName, { color: textColor }]}>{venue.name}</Text>
        
        {venue.description && (
          <Text style={[styles.description, { color: labelColor }]}>{venue.description}</Text>
        )}

        {/* Location Badge (Green - Same City) */}
        {(() => {
          const loc = getVenueLocationAndColor(0, userLocation);
          return (
            <View style={[styles.locationBadge, { backgroundColor: loc.badgeBg, borderColor: loc.badgeBorder }]}>
              <Text style={[styles.locationBadgeText, { color: loc.textColor }]}>
                📍 {loc.text} ({loc.label})
              </Text>
            </View>
          );
        })()}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>WHEN</Text>
            <Text style={[styles.metaValue, { color: textColor }]}>
              {time_slot === '9AM-1PM' ? 'Morning (9AM-1PM) ☕' :
               time_slot === '1PM-5PM' ? 'Afternoon (1PM-5PM) ☀️' :
               time_slot === '5PM-8PM' ? 'Evening (5PM-8PM) 🌇' :
               time_slot === '8PM-11PM' ? 'Night (8PM-11PM) 🌃' :
               'Midnight Crew 🌙'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PRICE PER PERSON</Text>
            <Text style={[styles.metaValue, { color: textColor }]}>
              {displayAmount}
            </Text>
          </View>
        </View>

        {venue.vibe_keywords && venue.vibe_keywords.length > 0 && (
          <View style={styles.keywordsContainer}>
            {venue.vibe_keywords.slice(0, 5).map((kw, i) => (
              <View key={kw + i} style={[styles.keywordBadge, { backgroundColor: isDark ? '#3B2E7C' : '#DDD6FE' }]}>
                <Text style={[styles.keywordText, { color: '#8B5CF6' }]}>#{kw.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Alternative Suggestions */}
      {result.alternative_venues && result.alternative_venues.length > 0 && (
        <View style={styles.alternativesSection}>
          <Text style={styles.alternativesTitle}>
            💡 OFF-TOPIC VIBES DETECTED — ALTERNATE SPOTS:
          </Text>
          {result.alternative_venues.map((alt, idx) => {
            const loc = getVenueLocationAndColor(idx + 1, userLocation);
            const altAmount = currencyConfig.values[alt.budget_tier - 1];
            const displayAltAmount = new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: userLocation.currency,
              maximumFractionDigits: 0
            }).format(altAmount);

            return (
              <View key={alt.name + idx} style={[styles.altItem, { backgroundColor: innerBg, borderColor }]}>
                <View style={styles.altTextCol}>
                  <Text style={[styles.altCategory, { color: '#8B5CF6' }]}>{alt.category.toUpperCase()}</Text>
                  <Text style={[styles.altName, { color: textColor }]}>{alt.name}</Text>
                  
                  <View style={styles.altLocationRow}>
                    {/* Distance Tag badge */}
                    <View style={[styles.locationBadge, { backgroundColor: loc.badgeBg, borderColor: loc.badgeBorder, marginTop: 4 }]}>
                      <Text style={[styles.locationBadgeText, { color: loc.textColor }]}>
                        📍 {loc.text} ({loc.label})
                      </Text>
                    </View>
                    <Text style={styles.altPriceText}>• {displayAltAmount}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    playClickSound();
                    const query = encodeURIComponent(`${alt.name} ${alt.category}`);
                    const url = alt.maps_url || `https://www.google.com/maps/search/?api=1&query=${query}`;
                    Linking.openURL(url).catch(err => console.error(err));
                  }}
                  style={styles.altMapButton}
                >
                  <Text style={styles.altMapText}>MAP</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.actionsContainer}>
        <Pressable 
          onPress={() => {
            playClickSound();
            handleOpenMap();
          }} 
          style={styles.mapButton}
        >
          <Text style={styles.mapButtonText}>GET DIRECTIONS 🗺️</Text>
        </Pressable>

        <Pressable 
          onPress={() => {
            playClickSound();
            handleShareResult();
          }} 
          style={[styles.shareButton, { borderColor }]}
        >
          <Text style={[styles.shareButtonText, { color: textColor }]}>
            {copied ? 'COPIED! 📋' : 'SEND TO SQUAD 📤'}
          </Text>
        </Pressable>
      </View>
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
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
    width: '100%',
    alignItems: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  nonNegotiable: {
    color: '#2563EB', // Electric neon dark blue
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  venueContainer: {
    borderRadius: 18, // Bubbly
    borderWidth: 2,
    padding: 20,
    marginBottom: 20,
  },
  category: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  venueName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(155, 120, 246, 0.1)',
    paddingTop: 16,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  priceUnused: {
    color: '#CBD5E1',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  keywordBadge: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  keywordText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  alternativesSection: {
    marginTop: 10,
    marginBottom: 20,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(155, 120, 246, 0.1)',
    paddingTop: 16,
  },
  alternativesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB', // Electric neon dark blue alert for off-topic warning
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  altItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14, // Rounded
    borderWidth: 2,
    padding: 12,
    marginBottom: 8,
  },
  altTextCol: {
    flex: 1,
    marginRight: 10,
  },
  altCategory: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  altName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  altMapButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 18, // Rounded pill
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  locationBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  locationBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  altLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  altPriceText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  altMapText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    borderRadius: 32, // Bubbly clay pill shape
    borderWidth: 3,
    borderColor: '#A78BFA', // Light purple border
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  mapButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#2563EB', // Solid blue clay button
    borderWidth: 3,
    borderRadius: 32, // Bubbly clay pill shape
    borderColor: '#60A5FA', // Light blue border highlight
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
