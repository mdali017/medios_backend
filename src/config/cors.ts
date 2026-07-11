import type { CorsOptions } from 'cors'
import { env } from './env'

type CorsOriginCallback = (
  err: Error | null,
  allow?: boolean | string | RegExp | (string | RegExp)[]
) => void

export function getExpressCorsOptions(): CorsOptions {
  if (env.corsAllowAll) {
    return { origin: true, credentials: true }
  }

  return {
    origin: (origin, callback: CorsOriginCallback) => {
      if (!origin || env.frontendUrls.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
  }
}

export function getSocketCorsOptions(): CorsOptions {
  if (env.corsAllowAll) {
    return {
      origin: (_origin, callback) => callback(null, true),
      credentials: true,
    }
  }

  return {
    origin: env.frontendUrls,
    credentials: true,
  }
}
