import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'node:fs'

// Lee .env.local (git-ignored) para los tests de integración contra Supabase local.
// En CI las mismas variables llegan por el entorno del job y tienen prioridad.
function localEnv(): Record<string, string> {
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8')
    return Object.fromEntries(
      raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const eq = line.indexOf('=')
          return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()]
        }),
    )
  } catch {
    return {}
  }
}

const fileEnv = localEnv()
const pick = (key: string): string => process.env[key] ?? fileEnv[key] ?? ''

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: pick('NEXT_PUBLIC_SUPABASE_URL'),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: pick('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
