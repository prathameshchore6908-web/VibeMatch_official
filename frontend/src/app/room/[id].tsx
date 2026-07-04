import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform, ScrollView, useColorScheme, Image, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Room, Participant, getOrCreateHostId } from '../../api';
import { playClickSound } from '../../utils/sound';
import RoomForm from '../../components/RoomForm';
import ParticipantList from '../../components/ParticipantList';
import FinalResult from '../../components/FinalResult';

export default function RoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isDark = true; // Force dark theme permanently

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [submittingVibe, setSubmittingVibe] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [nickname, setNickname] = useState('');
  const [savedNickname, setSavedNickname] = useState<string | null>(null);
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes

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

  const isHost = room?.host_id === getOrCreateHostId();

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
      setErrorText(errObj.reason || 'Failed to complete action');
    } catch {
      setErrorText('Server communication failed.');
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && roomId) {
      const saved = localStorage.getItem(`vibematch_nick_${roomId}`);
      if (saved) {
        setSavedNickname(saved);
      }
    }
  }, [roomId]);

  // Poll Room State
  useEffect(() => {
    if (!roomId) return;

    const fetchState = async () => {
      try {
        const res = await api.getRoomState(roomId);
        setRoom(res.room);
        setParticipants(res.participants);
        
        if (res.room.elapsed_seconds !== undefined) {
          const limit = res.room.time_limit_seconds || 600;
          const remaining = Math.max(0, limit - res.room.elapsed_seconds);
          setTimeLeft(remaining);
        }
        setErrorText(null);
      } catch (err: any) {
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [roomId]);

  // Countdown timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleJoin = async () => {
    if (!roomId || nickname.trim().length === 0 || !agreeConsent) return;
    setJoining(true);
    setErrorText(null);
    try {
      const consentDate = new Date().toISOString();
      const termsVersion = 'v1.0';
      const res = await api.joinRoom(roomId, nickname, consentDate, termsVersion);
      const joinedName = res.participant.nickname;
      setSavedNickname(joinedName);
      if (Platform.OS === 'web') {
        localStorage.setItem(`vibematch_nick_${roomId}`, joinedName);
      }
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setJoining(false);
    }
  };

  const handleSubmitPreferences = async (
    availability: '9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight',
    budget: number,
    vibeText: string
  ) => {
    if (!roomId || !savedNickname) return;
    setSubmittingVibe(true);
    setErrorText(null);
    try {
      await api.submitPreferences(roomId, savedNickname, availability, budget, vibeText);
      const res = await api.getRoomState(roomId);
      setRoom(res.room);
      setParticipants(res.participants);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setSubmittingVibe(false);
    }
  };

  const handleCalculateMatch = async () => {
    if (!roomId) return;
    setCalculating(true);
    setErrorText(null);
    try {
      await api.calculateMatch(roomId);
      const res = await api.getRoomState(roomId);
      setRoom(res.room);
      setParticipants(res.participants);
    } catch (err: any) {
      handleApiError(err);
    } finally {
      setCalculating(false);
    }
  };

  const handleCopyLink = async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (err) {
        console.error('Failed to copy room link:', err);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Adaptive Styles - Joyful WePlay Palette
  const containerBg = '#120E2E'; // Deep night-space purple
  const cardBg = 'rgba(29, 24, 69, 0.75)'; // Semi-transparent glassmorphic card background
  const borderColor = '#3B2E7C';  // Glow-violet border
  const textColor = '#F5F3FF';    // Soft lilac-white text
  const labelColor = '#A78BFA';   // Pastel violet
  const subtextColor = '#818CF8'; // Indigo VS Energetic Royal Purple

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: containerBg }]}>
        <ActivityIndicator color="#0284C7" size="large" />
        <Text style={styles.loadingText}>RESOLVING ROOM SIGNALS...</Text>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: containerBg }]}>
        <Text style={styles.errorTextLarge}>ROOM NOT FOUND</Text>
        <Text style={[styles.errorSubtext, { color: subtextColor }]}>
          This room may have expired, been canceled due to rate limit abuse, or never existed.
        </Text>
        <Pressable onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={styles.backButtonText}>RETURN TO LANDING</Text>
        </Pressable>
      </View>
    );
  }

  // Handle expired state
  if (room.status === 'expired' || timeLeft <= 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: containerBg }]}>
        <Text style={[styles.errorTextLarge, { color: '#EC4899' }]}>ROOM EXPIRED</Text>
        <Text style={[styles.errorSubtext, { color: subtextColor }]}>
          VibeMatch rooms expire exactly 10 minutes after creation to maintain speed and security.
        </Text>
        <Pressable onPress={() => router.push('/')} style={[styles.backButton, { backgroundColor: '#EC4899' }]}>
          <Text style={styles.backButtonText}>CREATE NEW ROOM</Text>
        </Pressable>
      </View>
    );
  }

  if (!savedNickname && room.status !== 'matched') {
    return (
      <View style={[styles.container, { backgroundColor: containerBg }]}>
        <Image 
          source={require('../../../assets/images/planning_destination_bg.png')} 
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
        <View style={[styles.joinCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.joinTitle, { color: '#8B5CF6' }]}>SLIDE INTO THE LOBBY</Text>
          <Text style={[styles.joinSubtitle, { color: subtextColor }]}>
            Pick a cool nickname to join the squad and lock in your hangout vibe.
          </Text>

          {errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorText}</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, { backgroundColor: containerBg, borderColor, color: textColor }]}
            placeholder="Your nickname (e.g., DJ Pizza 🍕)"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            maxLength={20}
            value={nickname}
            onChangeText={setNickname}
            onSubmitEditing={handleJoin}
          />

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
              handleJoin();
            }}
            disabled={joining || nickname.trim().length === 0 || !agreeConsent}
            style={[
              styles.joinButton, 
              (joining || nickname.trim().length === 0 || !agreeConsent) && styles.buttonDisabled,
              { backgroundColor: agreeConsent ? '#8B5CF6' : '#94A3B8' }
            ]}
          >
            {joining ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.joinButtonText}>SLIDE IN ⚡</Text>
            )}
          </Pressable>

          <Pressable 
            onPress={() => {
              playClickSound();
              router.push('/');
            }} 
            style={styles.cancelLink}
          >
            <Text style={styles.cancelLinkText}>Go Back</Text>
          </Pressable>
        </View>

        {/* Legal Footer on Join Screen */}
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
              Terms
            </Text>
            {' '}•{' '}
            <Text 
              onPress={() => {
                playClickSound();
                router.push('/privacy');
              }} 
              style={styles.footerLink}
            >
              Privacy
            </Text>
          </Text>
        </View>
      </View>
    );
  }

  const userParticipant = participants.find(p => p.nickname === savedNickname);
  const userHasSubmitted = userParticipant?.has_submitted;
  const readyToCalculate = participants.some(p => p.has_submitted);

  return (
    <ScrollView style={[styles.scrollContainer, { backgroundColor: containerBg }]}>
      <Image 
        source={require('../../../assets/images/planning_destination_bg.png')} 
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
      <View style={styles.contentWrapper}>
        
        {/* Header Dashboard */}
        <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.headerTop}>
            <Text style={styles.roomBadge}>LOBBY ID: {roomId.substring(0, 8)}...</Text>
            <View style={[
              styles.timerBadge, 
              timeLeft < 120 && styles.timerBadgeAlert
            ]}>
              <Text style={[
                styles.timerText, 
                timeLeft < 120 && styles.timerTextAlert
              ]}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          </View>

          <Text style={[styles.roomTitle, { color: textColor }]}>The Squad Lobby</Text>
          
          <View style={styles.shareRow}>
            <Pressable 
              onPress={() => {
                playClickSound();
                handleCopyLink();
              }} 
              style={[styles.copyButton, { borderColor }]}
            >
              <Text style={[styles.copyButtonText, { color: textColor }]}>
                {copiedLink ? 'COPIED LINK!' : 'SHARE WITH THE SQUAD 🔗'}
              </Text>
            </Pressable>
            {isHost && (
              <View style={[styles.hostPill, { borderColor: '#8B5CF6', backgroundColor: isDark ? 'rgba(139, 92, 246, 0.08)' : '#F5F3FF' }]}>
                <Text style={[styles.hostPillText, { color: '#8B5CF6' }]}>YOU ARE THE HOST 👑</Text>
              </View>
            )}
          </View>

          {errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorText}</Text>
            </View>
          )}
        </View>

        {/* Core Layout Panels */}
        {room.status === 'matched' ? (
          <View style={styles.panelSection}>
            <FinalResult result={room.final_result!} />
            <Pressable 
              onPress={() => {
                playClickSound();
                router.push('/');
              }} 
              style={styles.finishHomeButton}
            >
              <Text style={styles.finishHomeButtonText}>START A NEW VIBE LOBBY</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.panelSection}>
            {/* Participant Status Board */}
            <ParticipantList participants={participants} />

            {/* Submission Form / Wait State */}
            {userHasSubmitted ? (
              <View style={[styles.waitCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={styles.waitTitle}>VIBE LOCKED IN 🔒</Text>
                <Text style={[styles.waitDesc, { color: subtextColor }]}>
                  You're locked and loaded. Waiting on the rest of the squad so the host can run the math.
                </Text>
                <ActivityIndicator color="#8B5CF6" style={{ marginTop: 15 }} />
              </View>
            ) : (
              <RoomForm
                nickname={savedNickname!}
                submitting={submittingVibe}
                onSubmit={handleSubmitPreferences}
              />
            )}

            {/* Host Controls */}
            {isHost && (
              <View style={styles.hostControls}>
                <Pressable
                  onPress={() => {
                    playClickSound();
                    handleCalculateMatch();
                  }}
                  disabled={!readyToCalculate || calculating}
                  style={[
                    styles.calculateButton,
                    (!readyToCalculate || calculating) && styles.calculateButtonDisabled
                  ]}
                >
                  {calculating ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.calculateButtonText}>
                      RUN VIBEMATCH ({participants.filter(p => p.has_submitted).length} READY) ⚡
                    </Text>
                  )}
                </Pressable>
                {!readyToCalculate && (
                  <Text style={styles.hostNote}>
                    Requires at least one squad submission to run matching.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Legal Footer on Room Lobby */}
        <View style={styles.footerContainerMargin}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  contentWrapper: {
    padding: 20,
    width: '100%',
    maxWidth: 550,
    alignSelf: 'center',
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#8B5CF6',
    marginTop: 15,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  errorTextLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  errorSubtext: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: 450,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 24, // Bubbly
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  joinCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 4, // Thick clay border
    borderRadius: 32, // Bubbly claymorphism
    padding: 24,
    borderColor: '#4C3D9A', // Lighter purple clay border highlight
    backgroundColor: '#1D1845',
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  joinTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
    color: '#8B5CF6',
  },
  joinSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 2,
    borderRadius: 14, // Rounded text box
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2.5,
    borderRadius: 6, // Bubbly
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
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  consentLink: {
    color: '#8B5CF6',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  joinButton: {
    borderRadius: 24, // Pill
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    shadowOpacity: 0,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  cancelLinkText: {
    color: '#94A3B8',
    fontSize: 12.5,
  },
  headerCard: {
    borderWidth: 4, // Thick clay border
    borderRadius: 32, // Bubbly claymorphism
    padding: 20,
    borderColor: '#4C3D9A', // Lighter purple clay border highlight
    backgroundColor: '#1D1845',
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomBadge: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Platform.OS === 'web' ? 'var(--font-mono)' : 'monospace',
  },
  timerBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  timerBadgeAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#EF4444',
  },
  timerText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'web' ? 'var(--font-mono)' : 'monospace',
    fontSize: 12,
  },
  timerTextAlert: {
    color: '#EF4444',
  },
  roomTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copyButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderRadius: 18, // Rounded Copy Button
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copyButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  hostPill: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  hostPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  errorBoxText: {
    color: '#EF4444',
    fontSize: 12,
  },
  panelSection: {
    gap: 20,
  },
  waitCard: {
    borderRadius: 32, // Bubbly claymorphism
    borderWidth: 4, // Thick clay border
    padding: 24,
    alignItems: 'center',
    borderColor: '#4C3D9A', // Lighter purple clay border highlight
    backgroundColor: '#1D1845',
    shadowColor: '#0A081F', // Dark outer drop shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  waitTitle: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  waitDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  hostControls: {
    alignItems: 'stretch',
    marginTop: 10,
  },
  calculateButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 32, // Rounded clay pill
    borderWidth: 3,
    borderColor: '#A78BFA', // Highlight
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A081F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  calculateButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  calculateButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  hostNote: {
    color: '#94A3B8',
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 8,
  },
  finishHomeButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 32, // Rounded clay pill
    borderWidth: 3,
    borderColor: '#A78BFA', // Highlight
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#0A081F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  finishHomeButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerContainerMargin: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 10.5,
  },
  footerLink: {
    color: '#8B5CF6',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
export { RoomScreen };
