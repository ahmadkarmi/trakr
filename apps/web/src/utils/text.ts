export function decodeUnicodeEscapes(input: string | undefined | null): string {
  if (!input) return ''
  // Replace \uXXXX sequences with actual unicode characters
  return String(input).replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) => {
    try {
      const code = parseInt(hex, 16)
      return String.fromCharCode(code)
    } catch {
      return _m
    }
  })
}
