import type { NextFunction, Request, Response } from 'express'
import { supabaseAnon, supabaseAdmin } from '../config/supabase'
import { AppError } from '../utils/AppError'
import type { AuthUser, Profile, UserRole } from '../types'
import { getPermissionsForRole } from '../utils/roles'

async function getStoreName(storeId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .maybeSingle()

  return data?.name ?? null
}

async function profileToAuthUser(profile: Profile): Promise<AuthUser> {
  const storeName = profile.store_id ? await getStoreName(profile.store_id) : null

  const user: AuthUser = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    storeId: profile.store_id,
    storeName,
    profileImage: profile.profile_image,
    permissions: getPermissionsForRole(profile.role),
  }

  if (profile.role === 'customer' && profile.pharmacy_name && profile.license_number) {
    user.pharmacyDetails = {
      name: profile.pharmacy_name,
      license: profile.license_number,
    }
  }

  return user
}

async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Profile
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401)
    }

    const token = authHeader.split(' ')[1]
    const { data, error } = await supabaseAnon.auth.getUser(token)

    if (error || !data.user) {
      throw new AppError('Invalid or expired token', 401)
    }

    const profile = await getProfileById(data.user.id)

    if (!profile) {
      throw new AppError('User profile not found', 404)
    }

    req.user = await profileToAuthUser(profile)
    req.accessToken = token
    next()
  } catch (error) {
    next(error)
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401))
    }

    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      return next()
    }

    return next(new AppError('You do not have permission to perform this action', 403))
  }
}

export { profileToAuthUser, getProfileById }
