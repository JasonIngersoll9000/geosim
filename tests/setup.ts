import '@testing-library/jest-dom'

// jsdom does not implement scrollIntoView — mock it globally
// Guard for node-environment tests (e.g. middleware.test.ts, research-pipeline.test.ts)
// that use // @vitest-environment node and don't have a window object
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}
