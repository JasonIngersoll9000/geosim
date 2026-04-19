import '@testing-library/jest-dom'

// jsdom does not implement scrollIntoView — mock it globally.
// Guard against node environment where window is not defined.
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}
