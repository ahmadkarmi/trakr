import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { api } from '../utils/api'
import type { Zone } from '@trakr/shared'
import { getSupabaseTestProfile } from '../tests/utils/supabaseFixtures'

// Integration tests that hit the real Supabase backend.
// These run only when VITE_BACKEND === 'supabase'.
const isSupabase = ((import.meta as any).env?.VITE_BACKEND || 'mock').toLowerCase() === 'supabase'

// Skip the whole suite if not running against Supabase
const maybe = isSupabase ? describe : describe.skip

maybe('Supabase integration', () => {
  let createdZoneId: string | null = null
  let createdSurveyId: string | null = null
  let defaultOrgId: string | null = null

  beforeAll(async () => {
    const { orgId } = await getSupabaseTestProfile()
    defaultOrgId = orgId
  })

  const resolveOrgId = async () => {
    if (defaultOrgId) return defaultOrgId
    const orgs = await api.getOrganizations()
    if (!orgs.length) throw new Error('No organizations available in Supabase fixture')
    return orgs[0].id
  }

  it('reads organizations', async () => {
    const orgs = await api.getOrganizations()
    expect(Array.isArray(orgs)).toBe(true)
    expect(orgs.length).toBeGreaterThan(0)
  })

  it('creates, updates, and deletes a zone', async () => {
    const orgs = await api.getOrganizations()
    expect(orgs.length).toBeGreaterThan(0)
    const orgId = await resolveOrgId()

    const zoneName = `IT Zone ${Date.now()}`
    const z = await api.createZone({ orgId, name: zoneName, description: 'tmp', branchIds: [] })
    createdZoneId = z.id

    // Ensure it appears in list
    const zones = await api.getZones(orgId)
    const found = zones.find((x: Zone) => x.id === z.id)
    expect(found?.name).toBe(zoneName)

    // Update
    const updated = await api.updateZone(z.id, { name: `${zoneName} Updated` })
    expect(updated.name).toContain('Updated')

    // Delete
    await api.deleteZone(z.id)
    const zonesAfter = await api.getZones(orgId)
    const stillThere = zonesAfter.some((x: Zone) => x.id === z.id)
    expect(stillThere).toBe(false)

    createdZoneId = null
  })

  it('creates and deletes a survey', async () => {
    // find any user to attribute creation to
    const users = await api.getUsers()
    expect(users.length).toBeGreaterThan(0)
    const creator = users[0]
    const orgId = await resolveOrgId()

    const res = await api.createSurvey({ title: `IT Survey ${Date.now()}`, description: 'tmp', sections: [], createdBy: creator.id, orgId })
    expect(res && typeof res.id === 'string').toBe(true)
    createdSurveyId = res.id

    // Cleanup
    if (createdSurveyId) {
      await api.deleteSurvey(createdSurveyId)
      createdSurveyId = null
    }
  })

  afterAll(async () => {
    // Best-effort cleanup if previous steps aborted early
    if (createdZoneId) {
      try { await api.deleteZone(createdZoneId) } catch { /* ignore */ }
      createdZoneId = null
    }
    if (createdSurveyId) {
      try { await api.deleteSurvey(createdSurveyId) } catch { /* ignore */ }
      createdSurveyId = null
    }
  })
})
