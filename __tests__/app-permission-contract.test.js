import {
  mapPermissionToDTO,
  normalizePermissionRecord,
  normalizePermissionRole,
  normalizePermissionStatus,
  permissionHasAccess,
} from '../lib/appPermissions.mjs'

describe('app permission contract normalization', () => {
  test('normalizes legacy roles to the canonical vocabulary', () => {
    expect(normalizePermissionRole('guest')).toBe('none')
    expect(normalizePermissionRole('owner')).toBe('admin')
    expect(normalizePermissionRole('superadmin')).toBe('admin')
    expect(normalizePermissionRole('super-admin')).toBe('admin')
  })

  test('normalizes legacy statuses to the canonical vocabulary', () => {
    expect(normalizePermissionStatus('active')).toBe('approved')
    expect(normalizePermissionStatus('pending')).toBe('pending')
    expect(normalizePermissionStatus('revoked')).toBe('revoked')
  })

  test('grants access only for approved permissions with a non-none role', () => {
    expect(permissionHasAccess('approved', 'user')).toBe(true)
    expect(permissionHasAccess('active', 'owner')).toBe(true)
    expect(permissionHasAccess('approved', 'none')).toBe(false)
    expect(permissionHasAccess('pending', 'admin')).toBe(false)
    expect(permissionHasAccess('revoked', 'admin')).toBe(false)
  })

  test('normalizes stored records before they reach callers', () => {
    const normalized = normalizePermissionRecord({
      userId: 'user-1',
      clientId: 'client-1',
      appName: 'launchmass',
      role: 'superadmin',
      status: 'active',
      hasAccess: true,
      requestedAt: '2026-05-10T00:00:00.000Z',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    })

    expect(normalized.role).toBe('admin')
    expect(normalized.status).toBe('approved')
    expect(normalized.hasAccess).toBe(true)
  })

  test('maps DTOs using the canonical contract', () => {
    const dto = mapPermissionToDTO({
      userId: 'user-1',
      clientId: 'client-1',
      appName: 'launchmass',
      role: 'guest',
      status: 'active',
      hasAccess: true,
      requestedAt: '2026-05-10T00:00:00.000Z',
      grantedAt: '2026-05-10T00:00:00.000Z',
      grantedBy: 'admin-1',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-10T00:00:00.000Z',
    })

    expect(dto).toMatchObject({
      userId: 'user-1',
      clientId: 'client-1',
      appName: 'launchmass',
      role: 'none',
      status: 'approved',
      hasAccess: false,
    })
  })
})
