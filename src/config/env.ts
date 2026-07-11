import dotenv from 'dotenv'

dotenv.config()

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function parseCorsConfig(raw: string | undefined): {
  corsAllowAll: boolean
  frontendUrls: string[]
} {
  const value = (raw || 'http://localhost:3000').trim()
  if (value === '*') {
    return { corsAllowAll: true, frontendUrls: [] }
  }

  return {
    corsAllowAll: false,
    frontendUrls: value.split(',').map((url) => url.trim()).filter(Boolean),
  }
}

const corsConfig = parseCorsConfig(process.env.FRONTEND_URL)

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim()
  return value || undefined
}

function getFrontendAppUrl(corsAllowAll: boolean, frontendUrls: string[]): string {
  const explicit = optionalEnv('FRONTEND_APP_URL')
  if (explicit) return explicit
  if (!corsAllowAll && frontendUrls.length > 0) return frontendUrls[0]
  return 'http://localhost:3000'
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsAllowAll: corsConfig.corsAllowAll,
  frontendUrls: corsConfig.frontendUrls,
  frontendAppUrl: getFrontendAppUrl(corsConfig.corsAllowAll, corsConfig.frontendUrls),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  googleClientId: optionalEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: optionalEnv('GOOGLE_CLIENT_SECRET'),
  googleRedirectUri: optionalEnv('GOOGLE_REDIRECT_URI'),
  googleTokenEncryptionKey: optionalEnv('GOOGLE_TOKEN_ENCRYPTION_KEY'),
}
