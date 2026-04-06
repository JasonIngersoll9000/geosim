import '@testing-library/jest-dom'

// jsdom does not implement scrollIntoView — mock it globally
// Guard required: node-environment tests share this setup file
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}
