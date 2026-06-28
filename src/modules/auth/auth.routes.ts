import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validateBody } from '../../middleware/validate'
import * as authController from './auth.controller'
import { loginSchema, refreshTokenSchema, registerSchema } from './auth.validation'

const router = Router()

router.post('/register', validateBody(registerSchema), authController.register)
router.post('/login', validateBody(loginSchema), authController.login)
router.post('/refresh-token', validateBody(refreshTokenSchema), authController.refreshToken)
router.get('/me', authenticate, authController.me)
router.post('/logout', authenticate, authController.logout)

export default router
