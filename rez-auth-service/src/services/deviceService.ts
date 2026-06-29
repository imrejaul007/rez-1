import crypto from 'crypto';
import { redis } from '../config/redis';

/** Normalize user-agent to browser name + major version only.
 *  E.g. "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
 *        (KHTML, like Gecko) Chrome/120.0.6099.109 Safari/537.36"
 *  becomes "Chrome 120"
 *  This prevents minor version changes (Chrome 120.0.6099.109 vs 120.0.6099.129)
 *  from generating different device hashes and breaking device trust. */
function normalizeUserAgent(ua: string): string {
  if (!ua) return '';
  // Chrome/Chromium: "Chrome/120.0.6099.109"
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch) return `Chrome ${chromeMatch[1]}`;
  // Firefox: "Firefox/121.0"
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;
  // Safari: "Version/17.2 Safari/605.1.15" (detect before generic AppleWebKit)
  const safariMatch = ua.match(/Version\/(\d+)[.\d]*\s+Safari/);
  if (safariMatch) return `Safari ${safariMatch[1]}`;
  // AppleWebKit generic (Edge, Opera, etc.)
  const webkitMatch = ua.match(/AppleWebKit\/(\d+)/);
  if (webkitMatch) return `WebKit ${webkitMatch[1]}`;
  return ua;
}

export function computeFingerprint(headers: Record<string, string | string[] | undefined>): string {
  const rawUa = (headers['user-agent'] || '') as string;
  const ua = normalizeUserAgent(rawUa);
  const lang = (headers['accept-language'] || '') as string;
  const ip = (headers['x-forwarded-for'] || headers['x-real-ip'] || '') as string;
  return crypto.createHash('sha256').update(`${ua}|${lang}|${ip}`).digest('hex').slice(0, 16);
}

export async function assessRisk(userId: string, deviceHash: string): Promise<'trusted' | 'new' | 'suspicious'> {
  const key = `device:${userId}:${deviceHash}`;
  const count = parseInt(await redis.get(key) || '0', 10);

  // Check total unique devices in 24h
  const devicesKey = `devices:${userId}`;
  const uniqueDevices = await redis.scard(devicesKey);

  if (uniqueDevices > 10) return 'suspicious';
  if (count >= 3) return 'trusted';
  return 'new';
}

export async function recordDevice(userId: string, deviceHash: string): Promise<void> {
  const key = `device:${userId}:${deviceHash}`;
  await redis.incr(key);
  await redis.expire(key, 90 * 86400); // 90 day TTL

  const devicesKey = `devices:${userId}`;
  await redis.sadd(devicesKey, deviceHash);
  await redis.expire(devicesKey, 86400); // 24h unique device tracking
}
