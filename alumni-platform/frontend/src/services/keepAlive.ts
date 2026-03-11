/**
 * Keep-alive service for Render free tier.
 *
 * Render free tier spins the backend down after 15 minutes of inactivity.
 * Sending a lightweight /health ping every 14 minutes keeps it warm so users
 * never experience cold-start network errors.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Build the health URL: strip /api suffix and append /health
const HEALTH_URL = API_BASE.includes('://')
  ? API_BASE.replace(/\/api\/?$/, '') + '/health'
  : '/health';

const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

async function ping() {
  try {
    await fetch(HEALTH_URL, { method: 'GET' });
  } catch {
    // silently ignore — keep-alive is best-effort
  }
}

export function startKeepAlive(): () => void {
  // Ping once right away so the very first user interaction is fast
  ping();
  const id = setInterval(ping, PING_INTERVAL_MS);
  return () => clearInterval(id);
}
