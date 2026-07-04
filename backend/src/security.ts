import { IncomingMessage } from 'http';
import { Room } from './types';

// In-memory cache for VPN/Proxy checks to avoid hitting API rate limits (ip-api.com limit is 45 requests/min)
const vpnCache = new Map<string, { isVpn: boolean; expiresAt: number }>();
const VPN_CACHE_DURATION = 1000 * 60 * 60; // Cache for 1 hour

// In-memory blacklisted IPs (abusive hosts)
export const ipBlacklist = new Map<string, number>(); // IP -> expiration timestamp

// Request rate limiter memory
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute

/**
 * Extracts client IP address from request
 */
export function getClientIp(req: any): string {
  let ip = req.headers['x-forwarded-for'] || 
           req.socket.remoteAddress || 
           req.connection?.remoteAddress || 
           '127.0.0.1';
  
  if (Array.isArray(ip)) {
    ip = ip[0];
  }
  
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // Clean IPv6 prefix for localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  return ip;
}

/**
 * Check if IP is a private/local IP address
 */
export function isLocalIp(ip: string): boolean {
  return ip === '127.0.0.1' || 
         ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.') || 
         ip.startsWith('172.31.') || 
         ip === '::1';
}

/**
 * Simple in-memory request rate limiter middleware
 */
export function rateLimiterMiddleware(req: any, res: any, next: any) {
  const ip = getClientIp(req);
  
  // Skip rate limiting for local dev asset requests if needed, but apply to APIs
  if (!req.url.startsWith('/api')) {
    return next();
  }

  // Check if IP is blacklisted
  const blacklistExpiry = ipBlacklist.get(ip);
  if (blacklistExpiry) {
    if (Date.now() < blacklistExpiry) {
      return res.status(403).json({ 
        error: 'ACCESS_DENIED', 
        reason: 'Your IP has been blacklisted due to suspicious activity. Try again later.' 
      });
    } else {
      ipBlacklist.delete(ip); // Blacklist expired
    }
  }

  const now = Date.now();
  const rateLimit = rateLimitMap.get(ip);

  if (!rateLimit || now > rateLimit.resetAt) {
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    });
    return next();
  }

  rateLimit.count++;
  if (rateLimit.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ 
      error: 'RATE_LIMIT_EXCEEDED', 
      reason: 'Too many requests. Please slow down.' 
    });
  }

  next();
}

/**
 * Detects if an IP address is a VPN, proxy, or hosting server.
 * Uses ip-api.com free tier (45 requests/min limit).
 */
export async function isVpnOrProxy(ip: string): Promise<boolean> {
  if (process.env.VPN_CHECK_ENABLED === 'false' || isLocalIp(ip)) {
    return false;
  }

  // Check cache first
  const cached = vpnCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.isVpn;
  }

  try {
    // Call free ip-api.com endpoint with fields: proxy, hosting, isp, status
    // Timeout of 2.5 seconds to prevent locking the app if api is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,proxy,hosting,isp,timezone`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return false; // Fail safe (don't lock out users if geolocation service has issues)
    }

    const data: any = await response.json();
    if (data.status !== 'success') {
      return false;
    }

    // Flag as VPN if hosting = true, proxy = true, or ISP name contains VPN keywords
    const ispName = (data.isp || '').toLowerCase();
    const vpnKeywords = [
      'vpn', 'proxy', 'tor ', 'hosting', 'ovh', 'digitalocean', 'linode', 'mullvad', 
      'nordvpn', 'expressvpn', 'private internet access', 'surfshark', 'cloudflare'
    ];

    const isVpn = data.proxy === true || 
                  data.hosting === true || 
                  vpnKeywords.some(keyword => ispName.includes(keyword));

    // Store in cache
    vpnCache.set(ip, {
      isVpn,
      expiresAt: Date.now() + VPN_CACHE_DURATION
    });

    return isVpn;
  } catch (error) {
    console.error(`Error checking VPN status for IP ${ip}:`, error);
    return false; // Fail open to keep app functional if the free API is down/rate-limited
  }
}

/**
 * Helper to fetch IP Timezone to perform timezone discrepancy check
 */
export async function getIpTimezone(ip: string): Promise<string | null> {
  if (isLocalIp(ip)) {
    return null;
  }
  try {
    const cached = vpnCache.get(ip);
    // If we have cached VPN result, we might not have the timezone unless stored. Let's fetch quickly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,timezone`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data: any = await response.json();
    return data.status === 'success' ? data.timezone : null;
  } catch {
    return null;
  }
}
