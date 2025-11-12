const requiredEnv = require('../../config/requiredEnv.json')

function resolveEnvValue(definition) {
  const keys = [definition.key, ...(definition.fallbacks || [])]
  for (const key of keys) {
    const raw = process.env[key]
    if (raw !== undefined && String(raw).trim() !== '') {
      return { value: raw, usedKey: key }
    }
  }
  return null
}

function ensureEnvSet(setName) {
  const definitions = requiredEnv[setName] || []
  const resolved = {}
  const usedKeys = {}
  const missing = []

  for (const definition of definitions) {
    const resolvedValue = resolveEnvValue(definition)
    if (!resolvedValue) {
      missing.push(definition)
    } else {
      resolved[definition.key] = resolvedValue.value
      usedKeys[definition.key] = resolvedValue.usedKey
    }
  }

  return { resolved, missing, usedKeys }
}

function formatMissing(missing) {
  if (!missing.length) {
    return ''
  }

  return missing
    .map((definition) => {
      const aliases = [definition.key, ...(definition.fallbacks || [])]
      return `  - ${definition.label || definition.key} (${aliases.join(' / ')})`
    })
    .join('\n')
}

module.exports = {
  ensureEnvSet,
  formatMissing,
}
