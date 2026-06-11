/** Base URL is always relative — Nginx proxies /api/* → backend */
const BASE = "/api";

/**
 * Wraps fetch with shared error handling.
 * @param {string} path   — e.g. "/health" or "/v1/status"
 * @param {RequestInit} [opts]
 * @returns {Promise<any>}
 */
async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/** GET /api/health — primary liveness probe */
export const fetchHealth = () => request("/health");

/** GET /api/v1/ping — round-trip latency check */
export const fetchPing = () => request("/v1/ping");

/** GET /api/v1/status — dependency status map */
export const fetchStatus = () => request("/v1/status");