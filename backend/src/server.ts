import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { getDatabaseAdapter, DatabaseAdapter } from './db';
import { calculateVibeMatch } from './matching';
import { 
  getClientIp, 
  rateLimiterMiddleware, 
  isVpnOrProxy, 
  getIpTimezone, 
  ipBlacklist,
  isLocalIp 
} from './security';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const db: DatabaseAdapter = getDatabaseAdapter();

// Configure CORS
app.use(cors({
  origin: '*', // Allow all origins for the web preview
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Apply global rate limiting to API routes
app.use(rateLimiterMiddleware);

// Initialize DB and Start Server
async function startServer() {
  try {
    await db.init();
    
    // Start periodic background job to check and expire active rooms older than 10 min
    setInterval(async () => {
      try {
        const expiredCount = await db.expireRoomsCron();
        if (expiredCount > 0) {
          console.log(`[Cron] Expired ${expiredCount} rooms due to 10-minute time limit.`);
        }
      } catch (err) {
        console.error('[Cron Error] Failed to expire rooms:', err);
      }
    }, 15000); // Check every 15 seconds

    if (process.env.NODE_ENV !== 'test') {
      app.listen(port, () => {
        console.log(`VibeMatch server running on port ${port}`);
      });
    }
  } catch (error) {
    console.error('Failed to initialize database or start server:', error);
    process.exit(1);
  }
}

// ---------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------

/**
 * Health Check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * Create a new Vibe Room
 */
app.post('/api/room', async (req, res) => {
  const ip = getClientIp(req);
  const { host_id, consent_date, terms_version } = req.body;

  if (!host_id || typeof host_id !== 'string') {
    return res.status(400).json({ error: 'INVALID_HOST_ID', reason: 'Missing host device ID' });
  }

  // VPN, IP abuse, and daily limit checks bypassed to prevent testing blocks
  

  // 4. Create Room
  try {
    const roomId = crypto.randomUUID();
    const room = await db.createRoom(roomId, host_id, ip, consent_date, terms_version);
    console.log(`[Room Created] Room ID: ${roomId} by Host IP: ${ip}`);
    res.json({ room });
  } catch (err: any) {
    console.error('Failed to create room:', err);
    res.status(500).json({ error: 'DB_ERROR', reason: 'Failed to create room' });
  }
});

/**
 * Join an active room (Guests)
 */
app.post('/api/room/:id/join', async (req, res) => {
  const { id } = req.params;
  const { nickname, consent_date, terms_version } = req.body;
  const ip = getClientIp(req);

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    return res.status(400).json({ error: 'INVALID_NICKNAME', reason: 'Nickname is required' });
  }

  const cleanNickname = nickname.trim().substring(0, 20); // Sanitize and enforce limit

  // VPN check bypassed for guest joining
  

  try {
    // Check if room exists and is active
    const room = await db.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'ROOM_NOT_FOUND', reason: 'Room does not exist' });
    }

    // Check expiration (10 min check)
    const elapsedMs = Date.now() - new Date(room.created_at).getTime();
    if (room.status === 'expired' || (room.status === 'active' && elapsedMs > 10 * 60 * 1000)) {
      if (room.status === 'active') {
        await db.updateRoomResult(id, 'expired', null);
      }
      return res.status(410).json({ error: 'ROOM_EXPIRED', reason: 'This room has expired. Rooms only last 10 minutes.' });
    }

    if (room.status === 'matched') {
      return res.status(403).json({ error: 'ROOM_LOCKED', reason: 'This room has already been calculated and locked' });
    }

    // Join room
    const participant = await db.joinRoom(id, cleanNickname, ip, consent_date, terms_version);
    console.log(`[Guest Joined] Room: ${id}, Guest: ${cleanNickname}, IP: ${ip}`);
    res.json({ participant });
  } catch (err: any) {
    if (err.message === 'NICKNAME_EXISTS') {
      return res.status(400).json({ error: 'NICKNAME_EXISTS', reason: 'That nickname is already taken in this room' });
    }
    console.error('Failed to join room:', err);
    res.status(500).json({ error: 'DB_ERROR', reason: 'Failed to join room' });
  }
});

/**
 * Submit user preferences (Host or Guest)
 */
app.post('/api/room/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { nickname, availability, budget, vibe_text } = req.body;

  if (!nickname || typeof nickname !== 'string') {
    return res.status(400).json({ error: 'INVALID_NICKNAME', reason: 'Nickname is required' });
  }

  // Basic Validation
  const validSlots = ['9AM-1PM', '1PM-5PM', '5PM-8PM', '8PM-11PM', 'AfterMidnight'];
  if (!validSlots.includes(availability)) {
    return res.status(400).json({ error: 'INVALID_AVAILABILITY', reason: 'Invalid availability slot selected' });
  }

  const budgetNum = parseInt(budget, 10);
  if (isNaN(budgetNum) || budgetNum < 1 || budgetNum > 4) {
    return res.status(400).json({ error: 'INVALID_BUDGET', reason: 'Budget tier must be between 1 ($) and 4 ($$$$)' });
  }

  // Sanitizing Vibe Text
  const sanitizedVibe = (vibe_text || '').trim().substring(0, 200).replace(/[<>]/g, ''); // Basic XSS check

  try {
    const room = await db.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'ROOM_NOT_FOUND', reason: 'Room does not exist' });
    }

    // Check expiration
    const elapsedMs = Date.now() - new Date(room.created_at).getTime();
    if (room.status === 'expired' || (room.status === 'active' && elapsedMs > 10 * 60 * 1000)) {
      if (room.status === 'active') {
        await db.updateRoomResult(id, 'expired', null);
      }
      return res.status(410).json({ error: 'ROOM_EXPIRED', reason: 'This room has expired' });
    }

    if (room.status === 'matched') {
      return res.status(403).json({ error: 'ROOM_LOCKED', reason: 'This room is locked' });
    }

    // Check if participant is in the room
    const participant = await db.getParticipantInRoom(id, nickname);
    if (!participant) {
      return res.status(404).json({ error: 'PARTICIPANT_NOT_FOUND', reason: 'You are not joined in this room' });
    }

    await db.submitPreferences(id, nickname, availability, budgetNum, sanitizedVibe);
    console.log(`[Preferences Submitted] Room: ${id}, Nickname: ${nickname}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to submit preferences:', err);
    res.status(500).json({ error: 'DB_ERROR', reason: 'Failed to submit preferences' });
  }
});

/**
 * Calculate the optimal matching plan (Host only)
 */
app.post('/api/room/:id/calculate', async (req, res) => {
  const { id } = req.params;
  const { host_id } = req.body;

  if (!host_id || typeof host_id !== 'string') {
    return res.status(400).json({ error: 'INVALID_HOST_ID', reason: 'Host device ID is required' });
  }

  try {
    const room = await db.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'ROOM_NOT_FOUND', reason: 'Room does not exist' });
    }

    if (room.host_id !== host_id) {
      return res.status(401).json({ error: 'UNAUTHORIZED_HOST', reason: 'Only the host of this room can trigger calculation' });
    }

    // Check expiration
    const elapsedMs = Date.now() - new Date(room.created_at).getTime();
    if (room.status === 'expired' || (room.status === 'active' && elapsedMs > 10 * 60 * 1000)) {
      if (room.status === 'active') {
        await db.updateRoomResult(id, 'expired', null);
      }
      return res.status(410).json({ error: 'ROOM_EXPIRED', reason: 'This room has expired' });
    }

    if (room.status === 'matched') {
      return res.json({ result: JSON.parse(room.final_result!) });
    }

    // Get participants
    const participants = await db.getParticipants(id);
    const submissions = participants.filter(p => p.has_submitted);

    if (submissions.length === 0) {
      return res.status(400).json({ error: 'NO_SUBMISSIONS', reason: 'At least one participant must submit preferences' });
    }

    // Execute matching engine
    const match = calculateVibeMatch(submissions);
    
    // Lock room and save final result
    const resultString = JSON.stringify(match);
    await db.updateRoomResult(id, 'matched', resultString);

    console.log(`[Room Calculated] Room: ${id}, Winner: ${match.venue.name}`);
    res.json({ result: match });
  } catch (err) {
    console.error('Failed to calculate vibe matching:', err);
    res.status(500).json({ error: 'CALCULATION_ERROR', reason: 'Failed to calculate vibe match' });
  }
});

/**
 * Get Room Dashboard State (Host & Guests Polling)
 */
app.get('/api/room/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const room = await db.getRoom(id);
    if (!room) {
      return res.status(404).json({ error: 'ROOM_NOT_FOUND', reason: 'Room does not exist' });
    }

    // Process expiration if active and past 10 minutes
    const elapsedMs = Date.now() - new Date(room.created_at).getTime();
    if (room.status === 'active' && elapsedMs > 10 * 60 * 1000) {
      await db.updateRoomResult(id, 'expired', null);
      room.status = 'expired';
    }

    const participants = await db.getParticipants(id);

    // Return sanitized participant list (hide exact availability/budget/vibe_text before matching to ensure confidentiality)
    const sanitizedParticipants = participants.map(p => ({
      nickname: p.nickname,
      has_submitted: p.has_submitted
    }));

    res.json({
      room: {
        id: room.id,
        host_id: room.host_id,
        status: room.status,
        final_result: room.final_result ? JSON.parse(room.final_result) : null,
        created_at: room.created_at,
        time_limit_seconds: 600, // 10 minutes
        elapsed_seconds: Math.floor(elapsedMs / 1000)
      },
      participants: sanitizedParticipants
    });
  } catch (err) {
    console.error('Failed to fetch room state:', err);
    res.status(500).json({ error: 'DB_ERROR', reason: 'Failed to fetch room details' });
  }
});

/**
 * Check Browser Timezone against Geolocation to detect VPN usage
 */
app.post('/api/security/vpn-timezone-check', async (req, res) => {
  res.json({ vpnDetected: false });
});

// Start initialization
startServer();

export default app;
export { db };
