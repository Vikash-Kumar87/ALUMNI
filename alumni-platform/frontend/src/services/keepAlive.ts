/**
 * Keep-alive service for Render free tier.
 *
 * Render free tier spins the backend down after 15 minutes of inactivity.
 * Sending a lightweight /health ping every 14 minutes keeps it warm so users
 * never experience cold-start network errors.
 */

// Render backend URL — hardcoded so ping works even if env var changes
const RENDER_HEALTH_URL = 'https://careersaathi-platform-backend-xfi0.onrender.com/health';

const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

async function ping() {
  try {
    await fetch(RENDER_HEALTH_URL, { method: 'GET' });
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
