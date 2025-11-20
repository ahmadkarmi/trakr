import { safeLocalStorage } from './safeStorage'

export const ORG_PREF_KEYS = {
  activeOrg: 'super_admin_active_org',
  viewScope: 'super_admin_view_scope',
} as const

const DEFAULT_ORG_PREF_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

type OrgPreferenceKey = (typeof ORG_PREF_KEYS)[keyof typeof ORG_PREF_KEYS]

type StoredPreference = {
  value: string
  timestamp: number
  ttl?: number
}

const parseStoredPreference = (raw: string): StoredPreference | null => {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') {
      return { value: parsed, timestamp: 0 }
    }
    if (parsed && typeof parsed.value === 'string') {
      return {
        value: parsed.value,
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : 0,
      }
    }
    return null
  } catch {
    return { value: raw, timestamp: 0 }
  }
}

const isExpired = (timestamp: number, ttl: number = DEFAULT_ORG_PREF_TTL_MS) =>
  timestamp > 0 && Date.now() - timestamp > ttl

export function readOrgPreference(key: OrgPreferenceKey): string | null {
  const raw = safeLocalStorage.getItem(key)
  if (!raw) return null

  const stored = parseStoredPreference(raw)
  if (!stored || !stored.value) {
    safeLocalStorage.removeItem(key)
    return null
  }

  const ttl = stored.ttl ?? DEFAULT_ORG_PREF_TTL_MS
  if (isExpired(stored.timestamp, ttl)) {
    safeLocalStorage.removeItem(key)
    return null
  }

  if (stored.timestamp === 0 || typeof stored.ttl !== 'number') {
    writeOrgPreference(key, stored.value)
  }

  return stored.value
}

export function writeOrgPreference(key: OrgPreferenceKey, value: string, options?: { ttlMs?: number }) {
  const payload: StoredPreference = {
    value,
    timestamp: Date.now(),
    ttl: options?.ttlMs && options.ttlMs > 0 ? options.ttlMs : DEFAULT_ORG_PREF_TTL_MS,
  }
  safeLocalStorage.setItem(key, JSON.stringify(payload))
}

export function removeOrgPreference(key: OrgPreferenceKey) {
  safeLocalStorage.removeItem(key)
}

export function clearOrgPreferences() {
  Object.values(ORG_PREF_KEYS).forEach((key) => safeLocalStorage.removeItem(key))
}
