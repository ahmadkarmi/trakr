import requiredEnv from '../../../../config/requiredEnv.json'

export type EnvDefinition = {
  key: string
  label?: string
  fallbacks?: string[]
}

type RequiredEnvConfig = Record<string, EnvDefinition[]>

export type ResolveResult = {
  resolved: Record<string, string>
  usedKeys: Record<string, string>
  missing: EnvDefinition[]
}

const config = requiredEnv as RequiredEnvConfig

function resolveEnvValue(definition: EnvDefinition, get: (key: string) => string | undefined) {
  const keys = [definition.key, ...(definition.fallbacks || [])]

  for (const key of keys) {
    const value = get(key)
    if (value !== undefined && value.trim() !== '') {
      return { value, usedKey: key }
    }
  }

  return null
}

export function resolveRequiredEnv(
  set: keyof RequiredEnvConfig,
  get: (key: string) => string | undefined,
): ResolveResult {
  const definitions = config[set] || []
  const resolved: Record<string, string> = {}
  const usedKeys: Record<string, string> = {}
  const missing: EnvDefinition[] = []

  for (const definition of definitions) {
    const result = resolveEnvValue(definition, get)
    if (!result) {
      missing.push(definition)
      continue
    }

    resolved[definition.key] = result.value
    usedKeys[definition.key] = result.usedKey
  }

  return { resolved, usedKeys, missing }
}

export function formatMissingPlain(definitions: EnvDefinition[]): string {
  if (!definitions.length) return ''

  return definitions
    .map((definition) => {
      const aliases = [definition.key, ...(definition.fallbacks || [])]
      const label = definition.label ?? definition.key
      return `- ${label} (${aliases.join(' / ')})`
    })
    .join('\n')
}

export function formatMissingHtml(definitions: EnvDefinition[]): string {
  if (!definitions.length) return ''

  return definitions
    .map((definition) => {
      const aliases = [definition.key, ...(definition.fallbacks || [])]
      const label = definition.label ?? definition.key
      const aliasMarkup = aliases
        .map(
          (alias) =>
            `<code style="background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">${alias}</code>`,
        )
        .join(
          '<span style="margin: 0 0.375rem; color: #9ca3af;">/</span>',
        )

      return `<li style="margin-bottom: 0.25rem;">${aliasMarkup}<span style="margin-left: 0.5rem; color: #4b5563;">${label}</span></li>`
    })
    .join('')
}

export function ensureClientEnv(get: (key: string) => string | undefined) {
  return resolveRequiredEnv('client', get)
}
