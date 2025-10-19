export type NavPrefs = {
  pinned: string[]
  recents: string[]
}

const KEY = (userId: string) => `nav_prefs:${userId}`

export function getNavPrefs(userId: string | undefined | null): NavPrefs {
  if (!userId) return { pinned: [], recents: [] }
  try {
    const raw = localStorage.getItem(KEY(userId))
    if (!raw) return { pinned: [], recents: [] }
    const parsed = JSON.parse(raw)
    return {
      pinned: Array.isArray(parsed?.pinned) ? parsed.pinned : [],
      recents: Array.isArray(parsed?.recents) ? parsed.recents : [],
    }
  } catch {
    return { pinned: [], recents: [] }
  }
}

function save(userId: string | undefined | null, prefs: NavPrefs) {
  if (!userId) return
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(prefs))
  } catch {}
}

export function pinLink(userId: string | undefined | null, link: string) {
  const prefs = getNavPrefs(userId)
  if (!prefs.pinned.includes(link)) prefs.pinned.unshift(link)
  // De-dup recents if pinned
  prefs.recents = prefs.recents.filter((l) => l !== link)
  save(userId, prefs)
}

export function unpinLink(userId: string | undefined | null, link: string) {
  const prefs = getNavPrefs(userId)
  prefs.pinned = prefs.pinned.filter((l) => l !== link)
  save(userId, prefs)
}

export function addRecentLink(userId: string | undefined | null, link: string) {
  const prefs = getNavPrefs(userId)
  // Do not add pinned items to recents
  if (prefs.pinned.includes(link)) return
  prefs.recents = [link, ...prefs.recents.filter((l) => l !== link)].slice(0, 6)
  save(userId, prefs)
}
