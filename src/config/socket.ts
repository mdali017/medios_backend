import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { supabaseAnon } from './supabase'
import { getSocketCorsOptions } from './cors'
import { getProfileById, profileToAuthUser } from '../middleware/auth'
import type { AuthUser } from '../types'

export interface StockUpdateItem {
  productId: string
  stockQuantity: number
}

export interface StockUpdatedEvent {
  storeId: string
  branchId?: string | null
  updates: StockUpdateItem[]
  source: 'checkout' | 'inventory'
  orderId?: string
  orderNumber?: string
}

interface SocketAuthData {
  user: AuthUser
}

let io: Server | null = null

export function getStoreRoom(storeId: string): string {
  return `store:${storeId}`
}

export function getBranchRoom(branchId: string): string {
  return `branch:${branchId}`
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: getSocketCorsOptions(),
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const { data, error } = await supabaseAnon.auth.getUser(token)
      if (error || !data.user) {
        return next(new Error('Invalid or expired token'))
      }

      const profile = await getProfileById(data.user.id)
      if (!profile) {
        return next(new Error('User profile not found'))
      }

      const user = await profileToAuthUser(profile)
      ;(socket.data as SocketAuthData).user = user
      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const { user } = socket.data as SocketAuthData

    if (
      user.storeId &&
      (user.role === 'store_manager' ||
        user.role === 'branch_manager' ||
        user.role === 'seller' ||
        user.role === 'admin')
    ) {
      socket.join(getStoreRoom(user.storeId))
    }

    if (
      user.branchId &&
      (user.role === 'branch_manager' || user.role === 'seller' || user.role === 'admin')
    ) {
      socket.join(getBranchRoom(user.branchId))
    }

    socket.on('disconnect', () => {
      if (user.storeId) {
        socket.leave(getStoreRoom(user.storeId))
      }
      if (user.branchId) {
        socket.leave(getBranchRoom(user.branchId))
      }
    })
  })

  return io
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

export function emitStockUpdated(
  storeId: string,
  payload: Omit<StockUpdatedEvent, 'storeId'>,
  branchId?: string | null
): void {
  const event: StockUpdatedEvent = {
    storeId,
    branchId: branchId ?? payload.branchId ?? null,
    ...payload,
  }

  getIo().to(getStoreRoom(storeId)).emit('stock:updated', event)

  if (event.branchId) {
    getIo().to(getBranchRoom(event.branchId)).emit('stock:updated', event)
  }
}
