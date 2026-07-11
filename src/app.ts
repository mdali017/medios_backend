import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { getExpressCorsOptions } from './config/cors'
import authRoutes from './modules/auth/auth.routes'
import adminRoutes from './modules/admin/admin.routes'
import storeRoutes from './modules/stores/store.routes'
import posRoutes from './modules/pos/pos.routes'
import customerRoutes from './modules/customer/customer.routes'
import branchManagerRoutes from './modules/branch-manager/branch-manager.routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

const app = express()

app.use(helmet())
app.use(cors(getExpressCorsOptions()))
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'MediOS API is running' })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/pos', posRoutes)
app.use('/api/v1/super-admin', storeRoutes)
app.use('/api/v1/customer', customerRoutes)
app.use('/api/v1/branch-manager', branchManagerRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
