import { supabaseAdmin, supabaseAnon } from '../../config/supabase'
import { AppError } from '../../utils/AppError'
import { getPermissionsForRole, normalizeRegisterRole } from '../../utils/roles'
import { getProfileById, profileToAuthUser } from '../../middleware/auth'
import type { AuthUser } from '../../types'
import type {
  CreateUserInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from './auth.validation'

export async function registerUser(input: RegisterInput) {
  const role = normalizeRegisterRole(input.role)

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      role,
      phone: input.phone,
      pharmacy_name: input.pharmacyName,
      license_number: input.licenseNumber,
    },
  })

  if (authError || !authData.user) {
    throw new AppError(authError?.message || 'Registration failed', 400)
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authData.user.id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role,
      pharmacy_name: input.pharmacyName || null,
      license_number: input.licenseNumber || null,
      is_verified: true,
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new AppError(profileError.message, 400)
  }

  return {
    id: authData.user.id,
    name: input.name,
    email: input.email,
    role,
    isVerified: true,
  }
}

export async function loginUser(input: LoginInput) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error || !data.session || !data.user) {
    throw new AppError(error?.message || 'Invalid email or password', 401)
  }

  const profile = await getProfileById(data.user.id)

  if (!profile) {
    throw new AppError('User profile not found', 404)
  }

  const user = await profileToAuthUser(profile)

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user,
  }
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const profile = await getProfileById(userId)

  if (!profile) {
    throw new AppError('User profile not found', 404)
  }

  return await profileToAuthUser(profile)
}

export async function refreshAccessToken(input: RefreshTokenInput) {
  const { data, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: input.refreshToken,
  })

  if (error || !data.session) {
    throw new AppError(error?.message || 'Invalid refresh token', 401)
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
}

export async function logoutUser(accessToken: string) {
  const { data, error } = await supabaseAnon.auth.getUser(accessToken)

  if (error || !data.user) {
    throw new AppError('Invalid or expired token', 401)
  }

  const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
    data.user.id,
    'global'
  )

  if (signOutError) {
    throw new AppError(signOutError.message, 400)
  }
}

export async function createInternalUser(input: CreateUserInput) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      role: input.role,
      phone: input.phone,
      store_id: input.storeId,
      branch_id: input.branchId,
    },
  })

  if (authError || !authData.user) {
    throw new AppError(authError?.message || 'User creation failed', 400)
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authData.user.id,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role: input.role,
      store_id: input.storeId || null,
      branch_id: input.branchId || null,
      is_verified: true,
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    throw new AppError(profileError.message, 400)
  }

  return {
    id: authData.user.id,
    name: input.name,
    email: input.email,
    role: input.role,
    permissions: getPermissionsForRole(input.role),
  }
}
