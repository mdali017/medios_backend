export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'store_manager'
  | 'customer'
  | 'delivery_man'

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  store_id: string | null
  pharmacy_name: string | null
  license_number: string | null
  profile_image: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  storeId?: string | null
  storeName?: string | null
  profileImage?: string | null
  permissions?: string[]
  pharmacyDetails?: {
    name: string
    license: string
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      accessToken?: string
    }
  }
}
