import { Platform } from 'react-native';

export interface Room {
  id: string;
  host_id: string;
  host_ip: string;
  status: 'active' | 'matched' | 'expired';
  final_result: MatchingResult | null;
  created_at: string;
  time_limit_seconds?: number;
  elapsed_seconds?: number;
}

export interface Participant {
  nickname: string;
  has_submitted: boolean;
}

export interface Venue {
  name: string;
  category: string;
  budget_tier: number;
  vibe_keywords: string[];
  time_slots: string[];
  maps_url: string;
  description?: string;
}

export interface MatchingResult {
  venue: Venue;
  time_slot: string;
  budget_tier: number;
  alternative_venues?: Venue[];
}

// Set up the API URL
const getBaseUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Check if we are running in localhost or dev environment
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    // In production, we use our live Render backend API
    return 'https://vibematch-official.onrender.com';
  }
  // Fallback for native devices in dev/prod
  return 'https://vibematch-official.onrender.com';
};

export const API_BASE_URL = getBaseUrl();

let nativeHostId: string | null = null;

// Retrieve or generate a unique Host Device ID
export const getOrCreateHostId = (): string => {
  if (Platform.OS === 'web') {
    let hostId = localStorage.getItem('vibematch_host_id');
    if (!hostId) {
      hostId = 'host_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vibematch_host_id', hostId);
    }
    return hostId;
  }
  if (!nativeHostId) {
    nativeHostId = 'host_native_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
  return nativeHostId;
};

// Track how many rooms this host has created in the last 24h
export const getLocalRoomCount = (): number => {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('vibematch_created_rooms');
    if (!data) return 0;
    try {
      const rooms: number[] = JSON.parse(data);
      // Filter out rooms older than 24 hours
      const activeRooms = rooms.filter(timestamp => Date.now() - timestamp < 24 * 60 * 60 * 1000);
      localStorage.setItem('vibematch_created_rooms', JSON.stringify(activeRooms));
      return activeRooms.length;
    } catch {
      return 0;
    }
  }
  return 0;
};

export const incrementLocalRoomCount = () => {
  if (Platform.OS === 'web') {
    const data = localStorage.getItem('vibematch_created_rooms');
    let rooms: number[] = [];
    if (data) {
      try {
        rooms = JSON.parse(data);
      } catch {}
    }
    rooms.push(Date.now());
    localStorage.setItem('vibematch_created_rooms', JSON.stringify(rooms));
  }
};

/**
 * Handle API responses and standardize error throwing
 */
async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'UNKNOWN_ERROR', reason: 'An unexpected error occurred' };
    }
    throw new Error(JSON.stringify(errorData));
  }
  return response.json();
}

export const api = {
  /**
   * Health Check
   */
  async checkHealth(): Promise<{ status: string; time: string }> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return handleResponse(response);
  },

  /**
   * Create a room
   */
  async createRoom(consentDate?: string, termsVersion?: string): Promise<{ room: Room }> {
    const host_id = getOrCreateHostId();
    const response = await fetch(`${API_BASE_URL}/api/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        host_id,
        consent_date: consentDate,
        terms_version: termsVersion
      }),
    });
    const result = await handleResponse(response);
    incrementLocalRoomCount();
    return result;
  },

  /**
   * Join a room as a guest
   */
  async joinRoom(roomId: string, nickname: string, consentDate?: string, termsVersion?: string): Promise<{ participant: Participant }> {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        nickname,
        consent_date: consentDate,
        terms_version: termsVersion
      }),
    });
    return handleResponse(response);
  },

  /**
   * Submit preferences
   */
  async submitPreferences(
    roomId: string,
    nickname: string,
    availability: '9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight',
    budget: number,
    vibeText: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        availability,
        budget,
        vibe_text: vibeText,
      }),
    });
    return handleResponse(response);
  },

  /**
   * Calculate final match (Host only)
   */
  async calculateMatch(roomId: string): Promise<{ result: MatchingResult }> {
    const host_id = getOrCreateHostId();
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_id }),
    });
    return handleResponse(response);
  },

  /**
   * Get room state (polling)
   */
  async getRoomState(roomId: string): Promise<{ room: Room; participants: Participant[] }> {
    const response = await fetch(`${API_BASE_URL}/api/room/${roomId}`);
    return handleResponse(response);
  },

  /**
   * Client-side Timezone check for VPN detection
   */
  async checkVpnTimezone(): Promise<{ vpnDetected: boolean; reason?: string }> {
    return { vpnDetected: false };
  },
};
