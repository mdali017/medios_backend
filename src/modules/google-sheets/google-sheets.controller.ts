import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import { AppError } from '../../utils/AppError'
import * as googleSheetsService from './google-sheets.service'

export async function getConnectUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const url = googleSheetsService.getGoogleSheetsConnectUrl(req.user!.id)
    return sendSuccess(res, { url })
  } catch (error) {
    next(error)
  }
}

export async function oauthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : undefined
    const state = typeof req.query.state === 'string' ? req.query.state : undefined
    const oauthError = typeof req.query.error === 'string' ? req.query.error : undefined
    const redirectBase = googleSheetsService.getGoogleOAuthRedirectBaseUrl()

    if (oauthError) {
      return res.redirect(`${redirectBase}/admin-dashboard/products?googleError=${encodeURIComponent(oauthError)}`)
    }

    if (!code || !state) {
      throw new AppError('Missing Google OAuth parameters', 400)
    }

    const result = await googleSheetsService.handleGoogleOAuthCallback(code, state)
    return res.redirect(
      `${redirectBase}/admin-dashboard/products?googleConnected=1&googleEmail=${encodeURIComponent(result.email)}`
    )
  } catch (error) {
    const redirectBase = googleSheetsService.getGoogleOAuthRedirectBaseUrl()
    const message = error instanceof AppError ? error.message : 'Google connection failed'
    return res.redirect(`${redirectBase}/admin-dashboard/products?googleError=${encodeURIComponent(message)}`)
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await googleSheetsService.getGoogleSheetsStatus(req.user!.id)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function disconnect(req: Request, res: Response, next: NextFunction) {
  try {
    await googleSheetsService.disconnectGoogleSheets(req.user!.id)
    return sendSuccess(res, null, 'Google Sheets disconnected')
  } catch (error) {
    next(error)
  }
}

export async function exportProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await googleSheetsService.exportProductsToGoogleSheet(req.user!, req.body)
    return sendSuccess(res, data, `Exported ${data.rowCount} product(s) to Google Sheets`)
  } catch (error) {
    next(error)
  }
}
