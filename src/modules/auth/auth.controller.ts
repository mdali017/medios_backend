import type { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../utils/apiResponse'
import * as authService from './auth.service'

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.registerUser(req.body)
    return sendSuccess(res, data, 'Registration successful. Please verify your email.', 201)
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.loginUser(req.body)
    return sendSuccess(res, data, 'Login successful')
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.getCurrentUser(req.user!.id)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.refreshAccessToken(req.body)
    return sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logoutUser(req.accessToken!)
    return sendSuccess(res, null, 'Logged out successfully')
  } catch (error) {
    next(error)
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await authService.createInternalUser(req.body)
    return sendSuccess(res, data, 'User created successfully', 201)
  } catch (error) {
    next(error)
  }
}
