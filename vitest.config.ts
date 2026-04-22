import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: ['node_modules', '.worktrees/**', '.claude/worktrees/**', '**/dist/**', '**/.next/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['tests/**', 'docs/**', '.claude/**', 'supabase/**', 'scripts/**', '**/*.config.*', '**/types/**'],
      thresholds: {
        lines: 60,
        functions: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
