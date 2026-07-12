/**
 * Shared client for public (no-auth) marketing endpoints.
 * Module-level cache avoids double-fetch when splash mounts pulse + trend previews.
 */

import { API_ENDPOINTS } from '../config/api';

const PULSE_TTL_MS = 60_000;
const HEALTH_TTL_MS = 60_000;

let pulseCache = null;
let pulseInflight = null;
let healthCache = null;
let healthInflight = null;

export async function fetchPublicMarketPulse({ force = false } = {}) {
  if (!force && pulseCache && Date.now() - pulseCache.at < PULSE_TTL_MS) {
    return pulseCache.data;
  }
  if (!force && pulseInflight) return pulseInflight;

  pulseInflight = fetch(API_ENDPOINTS.publicMarketPulse(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`pulse ${res.status}`);
      const data = await res.json();
      pulseCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      pulseInflight = null;
    });

  return pulseInflight;
}

export async function fetchPublicDataHealth({ force = false } = {}) {
  if (!force && healthCache && Date.now() - healthCache.at < HEALTH_TTL_MS) {
    return healthCache.data;
  }
  if (!force && healthInflight) return healthInflight;

  healthInflight = fetch(API_ENDPOINTS.publicDataHealth(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`health ${res.status}`);
      const data = await res.json();
      healthCache = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      healthInflight = null;
    });

  return healthInflight;
}
