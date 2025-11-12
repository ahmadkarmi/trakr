export type EnvDefinition = {
  key: string
  label?: string
  fallbacks?: string[]
}

export type ResolveResult = {
  resolved: Record<string, string>
  usedKeys: Record<string, string>
  missing: EnvDefinition[]
}
