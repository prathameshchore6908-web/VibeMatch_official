import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, Platform, useColorScheme, Image, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { api, getLocalRoomCount } from '../api';
import { playClickSound } from '../utils/sound';

export default function HomeScreen() {
  const router = useRouter();
  const isDark = true; // Force dark theme permanently

  const pathAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(pathAnim, {
        toValue: 1,
        duration: 6000, // Speed of the running lights loop
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, [pathAnim]);

  // Path 1: Top-Left to Center
  const leftX = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['4%', '12%', '20%', '28%', '38%'],
  });
  const leftY = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['23%', '38%', '43%', '45%', '45%'],
  });

  // Path 2: Top-Right to Center
  const rightX = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['96%', '82%', '74%', '68%', '52%'],
  });
  const rightY = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['18%', '28%', '36%', '52%', '48%'],
  });

  // Path 3: Bottom-Left to Center
  const bottomLeftX = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['18%', '22%', '27%', '32%', '42%'],
  });
  const bottomLeftY = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['72%', '78%', '89%', '80%', '65%'],
  });

  // Path 4: Bottom-Right to Center
  const bottomRightX = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['82%', '78%', '73%', '68%', '58%'],
  });
  const bottomRightY = pathAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['72%', '78%', '89%', '80%', '65%'],
  });

  const dotOpacity = pathAnim.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  const [loading, setLoading] = useState(false);
  const [roomCount, setRoomCount] = useState(0);
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [adModalVisible, setAdModalVisible] = useState(false);
  const [adStage, setAdStage] = useState<'idle' | 'ad1' | 'ad2' | 'completed'>('idle');
  const [adTimer, setAdTimer] = useState(5);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setRoomCount(getLocalRoomCount());
  }, []);

  const triggerSecurityBlock = (reason: 'vpn' | 'abuse', details?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('vibematch-security-block', {
        detail: { reason, details }
      });
      window.dispatchEvent(event);
    }
  };

  const handleApiError = (err: any) => {
    try {
      const errObj = JSON.parse(err.message);
      if (errObj.error === 'VPN_DETECTED') {
        triggerSecurityBlock('vpn', errObj.reason);
        return;
      }
      if (errObj.error === 'IP_ABUSE_BLOCKED') {
        triggerSecurityBlock('abuse', errObj.reason);
        return;
      }
      setErrorText(errObj.reason || 'Failed to complete request');
    } catch {
      setErrorText('Server communication failed. Please check connection.');
    }
  };

  const handleCreateRoom = async () => {
    if (!agreeConsent) return;
    setErrorText(null);

    // Limit check: 2 rooms per day
    if (roomCount >= 2) {
      setAdModalVisible(true);
      setAdStage('ad1');
      setAdTimer(5);
      return;
    }

    setLoading(true);
    try {
      const consentDate = new Date().toISOString();
      const termsVersion = 'v1.0';
      const res = await api.createRoom(consentDate, termsVersion);
      setRoomCount(getLocalRoomCount());
      router.push(`/room/${res.room.id}`);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomCount >= 2 && !adModalVisible && adStage === 'idle') {
      // Do nothing, user has to trigger ad explicitly via button
    }
  }, [roomCount]);

  useEffect(() => {
    let interval: any;
    if (adModalVisible && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    } else if (adModalVisible && adTimer === 0) {
      if (adStage === 'ad1') {
        setAdStage('ad2');
        setAdTimer(5);
      } else if (adStage === 'ad2') {
        setAdStage('completed');
      }
    }
    return () => clearInterval(interval);
  }, [adModalVisible, adTimer, adStage]);

  const handleClaimReward = () => {
    if (Platform.OS === 'web') {
      localStorage.setItem('vibematch_created_rooms', JSON.stringify([]));
    }
    setRoomCount(0);
    setAdModalVisible(false);
    setAdStage('idle');
  };

  // Adaptive styles - Joyful WePlay Palette
  const containerBg = '#120E2E'; // Deep night-space purple
  const cardBg = 'rgba(29, 24, 69, 0.75)'; // Semi-transparent glassmorphic card background
  const borderColor = '#3B2E7C';  // Glow-violet border
  const textColor = '#F5F3FF';    // Soft lilac-white text
  const labelColor = '#A78BFA';   // Pastel violet
  const subtextColor = '#818CF8'; // Indigo VS Energetic Royal Purple

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <Image 
        source={require('../../assets/images/planning_destination_bg.png')} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.4,
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
      />

      {/* Path 1: Top-Left Street Neon Pulse */}
      <Animated.View 
        style={{
          position: 'absolute',
          left: leftX,
          top: leftY,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#8B5CF6',
          opacity: dotOpacity,
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 10,
        }}
      />

      {/* Path 2: Top-Right Street Neon Pulse */}
      <Animated.View 
        style={{
          position: 'absolute',
          left: rightX,
          top: rightY,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#2563EB',
          opacity: dotOpacity,
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 10,
        }}
      />

      {/* Path 3: Bottom-Left Street Neon Pulse */}
      <Animated.View 
        style={{
          position: 'absolute',
          left: bottomLeftX,
          top: bottomLeftY,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#2563EB',
          opacity: dotOpacity,
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 10,
        }}
      />

      {/* Path 4: Bottom-Right Street Neon Pulse */}
      <Animated.View 
        style={{
          position: 'absolute',
          left: bottomRightX,
          top: bottomRightY,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#8B5CF6',
          opacity: dotOpacity,
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 10,
        }}
      />
      <View style={styles.scrollWrapper}>
        <View style={styles.heroSection}>
          <View style={styles.logoBadgeContainer}>
            <Text style={[styles.logoBadge, { color: '#8B5CF6', borderColor: '#8B5CF6', backgroundColor: isDark ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF' }]}>
              VIBEMATCH V1.0 ⚡
            </Text>
          </View>

          <Text style={[styles.title, { color: textColor }]}>
            Vibe<Text style={styles.titleBlue}>Match</Text>
          </Text>
          
          <Text style={[styles.tagline, { color: subtextColor }]}>
            Stop arguing in the group chat. Drop your availability, budget, and vibe to lock in the perfect hangout spot. No cap.
          </Text>
        </View>

        <View style={[styles.actionCard, { backgroundColor: cardBg, borderColor }]}>
          {errorText && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}

          {/* Consent Checkbox */}
          <View style={styles.consentRow}>
            <Pressable 
              onPress={() => {
                playClickSound();
                setAgreeConsent(!agreeConsent);
              }} 
              style={[
                styles.checkbox, 
                { borderColor: agreeConsent ? '#8B5CF6' : '#94A3B8' },
                agreeConsent && styles.checkboxChecked
              ]}
            >
              {agreeConsent && <View style={styles.checkboxInner} />}
            </Pressable>
            <Text style={[styles.consentText, { color: labelColor }]}>
              I agree to the{' '}
              <Text 
                onPress={() => {
                  playClickSound();
                  router.push('/terms');
                }} 
                style={styles.consentLink}
              >
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text 
                onPress={() => {
                  playClickSound();
                  router.push('/privacy');
                }} 
                style={styles.consentLink}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <Pressable
            onPress={() => {
              playClickSound();
              handleCreateRoom();
            }}
            disabled={loading || !agreeConsent}
            style={[
              styles.createButton, 
              (loading || !agreeConsent) && styles.buttonDisabled,
              { backgroundColor: agreeConsent ? '#8B5CF6' : '#94A3B8' }
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.createButtonText}>
                {roomCount >= 2 ? 'WATCH ADS TO UNLOCK ⚡' : 'SPIN UP A LOBBY'}
              </Text>
            )}
          </Pressable>

          <View style={styles.limitStatusContainer}>
            <Text style={[styles.limitStatusText, { color: labelColor }]}>
              Free Lobbies Left: <Text style={styles.limitValue}>{Math.max(0, 2 - roomCount)} / 2 left</Text>
            </Text>
            <Text style={styles.limitNote}>
              Lobbies expire in exactly 10 minutes.
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.infoTitle, { color: '#8B5CF6' }]}>HOW WE PLAY</Text>
          
          <View style={styles.stepItem}>
            <Text style={styles.stepNumber}>01</Text>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: textColor }]}>Start a Lobby</Text>
              <Text style={[styles.stepDesc, { color: subtextColor }]}>Spin up a lobby and send the invite link to the squad.</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <Text style={styles.stepNumber}>02</Text>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: textColor }]}>Drop Your Vibes</Text>
              <Text style={[styles.stepDesc, { color: subtextColor }]}>Everyone enters their timing, budget, and vibe (e.g., 'no pizza').</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <Text style={styles.stepNumber}>03</Text>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: textColor }]}>Hangout Locked</Text>
              <Text style={[styles.stepDesc, { color: subtextColor }]}>Our algorithm runs the math and locks in the perfect spot. No arguments.</Text>
            </View>
          </View>
        </View>

        {/* Legal Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            VibeMatch © 2026 •{' '}
            <Text 
              onPress={() => {
                playClickSound();
                router.push('/terms');
              }} 
              style={styles.footerLink}
            >
              Terms & Conditions
            </Text>
            {' '}•{' '}
            <Text 
              onPress={() => {
                playClickSound();
                router.push('/privacy');
              }} 
              style={styles.footerLink}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>

      {/* Simulated AdMob Ads Modal */}
      <Modal
        visible={adModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.adModalContainer}>
          <View style={[styles.adCard, { backgroundColor: cardBg, borderColor: '#0284C7' }]}>
            {adStage === 'ad1' && (
              <View style={styles.adContent}>
                <Text style={styles.adHeader}>Google AdMob Sponsored Ad 1/2</Text>
                <View style={[styles.adBannerMock, { backgroundColor: containerBg, borderColor }]}>
                  <Text style={[styles.adBannerTitle, { color: textColor }]}>⚡ CLEAN ENERGY DRINKS ⚡</Text>
                  <Text style={[styles.adBannerText, { color: subtextColor }]}>Sugar-free fuel for developers and creatives. Organic ingredients. Order online.</Text>
                  <Text style={styles.adLearnMore}>Learn More at FuelUp.com</Text>
                </View>
                <Text style={styles.adTimerText}>Ad closing in {adTimer}s...</Text>
              </View>
            )}

            {adStage === 'ad2' && (
              <View style={styles.adContent}>
                <Text style={styles.adHeader}>Google AdMob Sponsored Ad 2/2</Text>
                <View style={[styles.adBannerMock, { backgroundColor: containerBg, borderColor }]}>
                  <Text style={[styles.adBannerTitle, { color: textColor }]}>✈️ ESCAPE APARTMENTS ✈️</Text>
                  <Text style={[styles.adBannerText, { color: subtextColor }]}>Weekend getaways for friends. Premium spaces. Fully coordinated itineraries.</Text>
                  <Text style={styles.adLearnMore}>Book Now on EscapeApp</Text>
                </View>
                <Text style={styles.adTimerText}>Ad closing in {adTimer}s...</Text>
              </View>
            )}

            {adStage === 'completed' && (
              <View style={styles.adContent}>
                <Text style={styles.adSuccessTitle}>ADS COMPLETED!</Text>
                <Text style={[styles.adSuccessDesc, { color: subtextColor }]}>
                  Thank you for supporting VibeMatch. Your room limit has been reset. You can now host 2 more rooms!
                </Text>
                <Pressable 
                  onPress={() => {
                    playClickSound();
                    handleClaimReward();
                  }} 
                  style={styles.claimButton}
                >
                  <Text style={styles.claimButtonText}>UNLOCK ROOM CREATION</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollWrapper: {
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignItems: 'stretch',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoBadgeContainer: {
    marginBottom: 10,
  },
  logoBadge: {
    fontSize: 9,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    borderColor: '#8B5CF6',
    color: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  titleBlue: {
    color: '#2563EB', // Electric neon dark blue logo text accent
  },
  tagline: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionCard: {
    borderRadius: 32, // Bubbly claymorphism
    borderWidth: 4, // Thick clay shell border
    padding: 24,
    marginBottom: 24,
    borderColor: '#4C3D9A', // Lighter purple clay border highlight
    backgroundColor: '#1D1845', // Solid clay night-purple volume
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2.5,
    borderRadius: 6, // Bubbly checkbox
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  consentText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  consentLink: {
    color: '#8B5CF6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  createButton: {
    borderRadius: 32, // Rounded clay pill shape
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#A78BFA', // Soft highlight on purple button
    shadowColor: '#0A081F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    shadowOpacity: 0,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  limitStatusContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  limitStatusText: {
    fontSize: 12.5,
  },
  limitValue: {
    color: '#2563EB', // Electric neon dark blue counter text
    fontWeight: 'bold',
  },
  limitNote: {
    color: '#94A3B8',
    fontSize: 9.5,
    marginTop: 3,
  },
  infoCard: {
    borderRadius: 32, // Bubbly claymorphism
    borderWidth: 4, // Thick clay border
    padding: 24,
    marginBottom: 30,
    borderColor: '#1D4ED8', // Lighter blue clay border highlight
    backgroundColor: '#1D1845', // Solid clay night-purple volume
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 16,
    color: '#8B5CF6',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    color: '#8B5CF6',
    opacity: 0.4,
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 14,
    lineHeight: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  footerLink: {
    color: '#8B5CF6',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    textAlign: 'center',
  },
  adModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(18, 14, 46, 0.75)', // Deep space purple backdrop
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  adCard: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 2.5,
    borderRadius: 24, // Bubbly corners
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  adContent: {
    width: '100%',
    alignItems: 'center',
  },
  adHeader: {
    color: '#A78BFA',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  adBannerMock: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  adBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  adBannerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  adLearnMore: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  adTimerText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adSuccessTitle: {
    color: '#8B5CF6',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  adSuccessDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  claimButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 24, // Pill
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
export { HomeScreen };
