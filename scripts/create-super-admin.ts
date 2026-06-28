/**
 * Creates the default MediOS super admin account.
 *
 * Usage:
 *   npm run seed:super-admin
 *
 * Default credentials:
 *   Email:    superadmin@test.com
 *   Password: 123456
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const SUPER_ADMIN = {
  name: 'MediOS Super Admin',
  email: 'superadmin@test.com',
  password: '123456',
  role: 'super_admin' as const,
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Check profiles table exists
  const { error: tableError } = await supabase.from('profiles').select('id').limit(1)
  if (tableError?.message?.includes("Could not find the table")) {
    console.error('\n❌ profiles table not found!')
    console.error('   First run supabase/schema.sql in Supabase SQL Editor, then run this again.\n')
    process.exit(1)
  }

  // Check if super admin already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', SUPER_ADMIN.email)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('profiles')
      .update({ role: 'super_admin', is_verified: true, name: SUPER_ADMIN.name })
      .eq('id', existing.id)

    console.log('\n✅ Super admin already exists — role updated to super_admin')
    console.log(`   Email:    ${SUPER_ADMIN.email}`)
    console.log(`   Password: (use existing password, or reset in Supabase Auth)\n`)
    return
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: SUPER_ADMIN.email,
    password: SUPER_ADMIN.password,
    email_confirm: true,
    user_metadata: {
      name: SUPER_ADMIN.name,
      role: SUPER_ADMIN.role,
    },
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create super admin user')
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user.id,
    name: SUPER_ADMIN.name,
    email: SUPER_ADMIN.email,
    role: SUPER_ADMIN.role,
    is_verified: true,
    updated_at: new Date().toISOString(),
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  console.log('\n✅ Super admin created successfully!')
  console.log(`   Email:    ${SUPER_ADMIN.email}`)
  console.log(`   Password: ${SUPER_ADMIN.password}`)
  console.log('\n   Login at: http://localhost:3000/login\n')
}

main().catch((err) => {
  console.error('\n❌', err.message || err)
  process.exit(1)
})
