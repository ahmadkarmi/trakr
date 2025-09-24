export function formatInTimeZone(
  date: Date | string | number | null | undefined,
  timeZone?: string,
  options?: Intl.DateTimeFormatOptions,
  locale: string = 'en-US'
): string {
  if (!date) return ''
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(options || {}),
      timeZone: timeZone || 'UTC',
    })
    return fmt.format(d)
  } catch {
    return d.toLocaleString()
  }
}
