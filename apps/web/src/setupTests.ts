import '@testing-library/jest-dom'

// jsdom doesn't implement scrollTo; stub to avoid errors in components that may call it.
Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true })

// Reduce noise in test output: filter only the known React testing act() warnings.
// We still surface all other warnings/errors.
const originalError = console.error
const originalWarn = console.warn
const suppressPatterns = [
  /Warning:.*not wrapped in act/i,
  /When testing, code that causes React state updates should be wrapped in act/i,
  /An update to .* inside a test was not wrapped in act/i,
]

type ConsoleArgs = Parameters<typeof console.error>
console.error = (...args: ConsoleArgs) => {
  const first = args[0]
  if (typeof first === 'string' && suppressPatterns.some((re) => re.test(first))) {
    return
  }
  originalError(...args)
}

type ConsoleWarnArgs = Parameters<typeof console.warn>
console.warn = (...args: ConsoleWarnArgs) => {
  const first = args[0]
  if (typeof first === 'string' && suppressPatterns.some((re) => re.test(first))) {
    return
  }
  originalWarn(...args)
}
