// Minimal API error mapping util
// Converts various error shapes (Error, fetch/axios-like) to a friendly message
export function apiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (!err) return fallback
  // Standard Error
  if (err instanceof Error) {
    return err.message || fallback
  }
  // Axios-like error shape
  type AxiosLike = { response?: { data?: { message?: unknown } }; data?: { message?: unknown }; message?: unknown }
  const anyErr = err as AxiosLike
  const msg = anyErr?.response?.data?.message || anyErr?.data?.message || anyErr?.message
  if (typeof msg === 'string' && msg.trim().length > 0) return msg
  try {
    return JSON.stringify(err)
  } catch {
    return fallback
  }
}
