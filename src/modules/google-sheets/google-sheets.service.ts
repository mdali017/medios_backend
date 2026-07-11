import { createHmac, timingSafeEqual } from 'crypto'
import { google } from 'googleapis'
import { env } from '../../config/env'
import { supabaseAdmin } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { decryptSecret, encryptSecret } from '../../utils/crypto'
import {
  filterLabelForExport,
  getProductStockStatus,
  matchesProductSearch,
  matchesStockFilter,
  type StockFilter,
} from '../../utils/stockStatus'
import {
  PRODUCT_EXPORT_HEADERS,
  PRODUCT_EXPORT_INSTRUCTIONS,
  productRecordToExportRow,
} from '../../utils/productExportColumns'
import type { AuthUser } from '../../types'
import * as productService from '../products/product.service'
import type { ExportGoogleSheetInput } from './google-sheets.validation'

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
]

const SHEETS_SCOPES = REQUIRED_SCOPES

function assertGrantedScopes(scope?: string | null): void {
  const granted = new Set((scope || '').split(' ').filter(Boolean))
  const missing = REQUIRED_SCOPES.filter((requiredScope) => !granted.has(requiredScope))

  if (missing.length > 0) {
    throw new AppError(
      'Google Sheets permission was not granted. Disconnect, then connect again and approve all requested permissions.',
      400
    )
  }
}

function toGoogleSheetsError(error: unknown): AppError {
  const gaxiosError = error as {
    code?: number
    message?: string
    response?: { data?: { error?: { message?: string } } }
  }

  const message =
    gaxiosError.response?.data?.error?.message ||
    gaxiosError.message ||
    'Failed to export to Google Sheets'

  if (message.toLowerCase().includes('insufficient authentication scopes')) {
    return new AppError(
      'Google Sheets permission is missing. Click Disconnect, then Connect Google Sheet again and approve all permissions.',
      403
    )
  }

  if (gaxiosError.code === 403) {
    return new AppError(message, 403)
  }

  return new AppError(message, 500)
}

interface GoogleIntegrationRow {
  id: string
  user_id: string
  google_email: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expiry: string | null
}

function assertGoogleConfigured(): void {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri || !env.googleTokenEncryptionKey) {
    throw new AppError(
      'Google Sheets export is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and GOOGLE_TOKEN_ENCRYPTION_KEY.',
      503
    )
  }
}

function createOAuthClient() {
  assertGoogleConfigured()
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri)
}

type GoogleOAuthClient = ReturnType<typeof createOAuthClient>

function signOAuthState(userId: string): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + 10 * 60 * 1000,
  })
  const signature = createHmac('sha256', env.googleTokenEncryptionKey!)
    .update(payload)
    .digest('base64url')
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url')
}

function verifyOAuthState(state: string): string {
  assertGoogleConfigured()

  let parsed: { payload: string; signature: string }
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      payload: string
      signature: string
    }
  } catch {
    throw new AppError('Invalid OAuth state', 400)
  }

  const expected = createHmac('sha256', env.googleTokenEncryptionKey!)
    .update(parsed.payload)
    .digest('base64url')

  const actualBuf = Buffer.from(parsed.signature)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    throw new AppError('Invalid OAuth state signature', 400)
  }

  const data = JSON.parse(parsed.payload) as { userId: string; exp: number }
  if (!data.userId || Date.now() > data.exp) {
    throw new AppError('OAuth state expired. Please try connecting again.', 400)
  }

  return data.userId
}

async function getIntegration(userId: string): Promise<GoogleIntegrationRow | null> {
  const { data, error } = await supabaseAdmin
    .from('google_sheet_integrations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new AppError('Failed to load Google Sheets connection', 500)
  }

  return (data as GoogleIntegrationRow | null) ?? null
}

async function saveIntegration(input: {
  userId: string
  googleEmail: string
  accessToken: string
  refreshToken: string
  expiryDate: Date | null
}): Promise<void> {
  const row = {
    user_id: input.userId,
    google_email: input.googleEmail,
    access_token_encrypted: encryptSecret(input.accessToken, env.googleTokenEncryptionKey!),
    refresh_token_encrypted: encryptSecret(input.refreshToken, env.googleTokenEncryptionKey!),
    token_expiry: input.expiryDate?.toISOString() ?? null,
  }

  const { error } = await supabaseAdmin.from('google_sheet_integrations').upsert(row, {
    onConflict: 'user_id',
  })

  if (error) {
    throw new AppError('Failed to save Google Sheets connection', 500)
  }
}

async function getAuthenticatedClient(userId: string): Promise<{ client: GoogleOAuthClient; email: string }> {
  const integration = await getIntegration(userId)
  if (!integration) {
    throw new AppError('Google account not connected. Please connect Google Sheets first.', 400)
  }

  const client = createOAuthClient()
  client.setCredentials({
    access_token: decryptSecret(integration.access_token_encrypted, env.googleTokenEncryptionKey!),
    refresh_token: decryptSecret(integration.refresh_token_encrypted, env.googleTokenEncryptionKey!),
    expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : undefined,
  })

  client.on('tokens', (tokens) => {
    if (!tokens.access_token) return

    void saveIntegration({
      userId,
      googleEmail: integration.google_email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
        ? tokens.refresh_token
        : decryptSecret(integration.refresh_token_encrypted, env.googleTokenEncryptionKey!),
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    })
  })

  return { client, email: integration.google_email }
}

function formatExportDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function buildSheetTitle(storeName: string | null | undefined, filter: StockFilter): string {
  const label = filterLabelForExport(filter)
  const storePart = storeName?.trim() || 'Store'
  return `MediOS Export - ${storePart} - ${label} - ${formatExportDate()}`
}

export function getGoogleSheetsConnectUrl(userId: string): string {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: SHEETS_SCOPES,
    state: signOAuthState(userId),
  })
}

export async function handleGoogleOAuthCallback(code: string, state: string): Promise<{ email: string }> {
  const userId = verifyOAuthState(state)
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new AppError('Google did not return the required tokens. Please try connecting again.', 400)
  }

  assertGrantedScopes(tokens.scope)

  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const profile = await oauth2.userinfo.get()
  const email = profile.data.email

  if (!email) {
    throw new AppError('Could not read Google account email', 400)
  }

  await saveIntegration({
    userId,
    googleEmail: email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  })

  return { email }
}

export async function getGoogleSheetsStatus(userId: string): Promise<{ connected: boolean; email: string | null }> {
  const integration = await getIntegration(userId)
  return {
    connected: !!integration,
    email: integration?.google_email ?? null,
  }
}

export async function disconnectGoogleSheets(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('google_sheet_integrations').delete().eq('user_id', userId)
  if (error) {
    throw new AppError('Failed to disconnect Google Sheets', 500)
  }
}

export async function exportProductsToGoogleSheet(
  requester: AuthUser,
  input: ExportGoogleSheetInput
): Promise<{ spreadsheetUrl: string; rowCount: number; sheetTitle: string }> {
  const products = await productService.listProducts(requester, {
    storeId: input.storeId,
    branchId: input.branchId,
  })

  const filtered = products
    .map((product) => ({
      product,
      stockStatus: getProductStockStatus(product),
    }))
    .filter(({ stockStatus, product }) => matchesStockFilter(stockStatus, input.filter))
    .filter(({ product }) => matchesProductSearch(product, input.searchQuery))

  const { client } = await getAuthenticatedClient(requester.id)
  const sheets = google.sheets({ version: 'v4', auth: client })
  const sheetTitle = buildSheetTitle(requester.storeName, input.filter)

  let createResponse
  try {
    createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: sheetTitle },
        sheets: [
          { properties: { title: 'Products' } },
          { properties: { title: 'Instructions' } },
        ],
      },
    })
  } catch (error) {
    throw toGoogleSheetsError(error)
  }

  const spreadsheetId = createResponse.data.spreadsheetId
  const spreadsheetUrl = createResponse.data.spreadsheetUrl

  if (!spreadsheetId || !spreadsheetUrl) {
    throw new AppError('Failed to create Google Sheet', 500)
  }

  const productsSheetId = createResponse.data.sheets?.[0]?.properties?.sheetId ?? 0
  const instructionsSheetId = createResponse.data.sheets?.[1]?.properties?.sheetId ?? 1

  const values: (string | number)[][] = [
    [...PRODUCT_EXPORT_HEADERS],
    ...filtered.map(({ product, stockStatus }) => productRecordToExportRow(product, stockStatus)),
  ]

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: 'Products!A1', values },
        { range: 'Instructions!A1', values: PRODUCT_EXPORT_INSTRUCTIONS },
      ],
    },
  })

  if (values.length > 1) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: productsSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.93, blue: 0.98 },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: productsSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: PRODUCT_EXPORT_HEADERS.length,
              },
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: instructionsSheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 4,
              },
            },
          },
        ],
      },
    })
  }

  return {
    spreadsheetUrl,
    rowCount: filtered.length,
    sheetTitle,
  }
}

export function getGoogleOAuthRedirectBaseUrl(): string {
  return env.frontendAppUrl
}
