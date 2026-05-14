import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isAdminAppPath,
  shouldRedirectAdminWithoutPublicSupabaseEnv,
} from './adminRouteGate.js'

test('isAdminAppPath matches admin routes only', () => {
  assert.equal(isAdminAppPath('/admin'), true)
  assert.equal(isAdminAppPath('/admin/payouts'), true)
  assert.equal(isAdminAppPath('/administrator'), false)
  assert.equal(isAdminAppPath('/seller'), false)
})

test('shouldRedirectAdminWithoutPublicSupabaseEnv fails closed for admin routes', () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }
  assert.equal(shouldRedirectAdminWithoutPublicSupabaseEnv('/admin', env), true)
  assert.equal(shouldRedirectAdminWithoutPublicSupabaseEnv('/admin/payouts', env), true)
  assert.equal(shouldRedirectAdminWithoutPublicSupabaseEnv('/seller', env), false)
})

test('shouldRedirectAdminWithoutPublicSupabaseEnv allows admin when public env is configured', () => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  }
  assert.equal(shouldRedirectAdminWithoutPublicSupabaseEnv('/admin', env), false)
})
