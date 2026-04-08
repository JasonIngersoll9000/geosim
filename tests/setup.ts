import '@testing-library/jest-dom'

// jsdom does not implement scrollIntoView — mock it globally
// Guard for node environment (API/unit tests with @vitest-environment node)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}
