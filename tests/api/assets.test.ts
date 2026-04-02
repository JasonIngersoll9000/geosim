// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/scenarios/[id]/assets/route'
import { PATCH } from '@/app/api/scenarios/[id]/assets/[assetId]/route'

const mockCreateClient = vi.mocked(createClient)

function makeSupabaseMock(data: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  return { from: vi.fn().mockReturnValue(builder), _builder: builder }
}

beforeEach(() => { vi.clearAllMocks() })

describe('GET /api/scenarios/[id]/assets', () => {
  it('returns asset list on success', async () => {
    const assets = [{ id: 'cvn-72', scenario_id: 'test-scenario', name: 'CVN-72' }]
    const mock = makeSupabaseMock(assets)
    mockCreateClient.mockResolvedValue(mock as never)

    const req = new Request('http://localhost/api/scenarios/test-scenario/assets')
    const res = await GET(req, { params: { id: 'test-scenario' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('cvn-72')
  })

  it('returns 500 on database error', async () => {
    const mock = makeSupabaseMock(null, { message: 'DB error' })
    mockCreateClient.mockResolvedValue(mock as never)

    const req = new Request('http://localhost/api/scenarios/err-scenario/assets')
    const res = await GET(req, { params: { id: 'err-scenario' } })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})

describe('POST /api/scenarios/[id]/assets', () => {
  it('creates an asset and returns 201', async () => {
    const newAsset = { id: 'new-asset', scenario_id: 'test-scenario', name: 'New Asset' }
    const mock = makeSupabaseMock(newAsset)
    mockCreateClient.mockResolvedValue(mock as never)

    const req = new Request('http://localhost/api/scenarios/test-scenario/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'new-asset', name: 'New Asset' }),
    })
    const res = await POST(req, { params: { id: 'test-scenario' } })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBe('new-asset')
  })
})

describe('PATCH /api/scenarios/[id]/assets/[assetId]', () => {
  it('updates an asset and returns 200', async () => {
    const updated = { id: 'cvn-72', scenario_id: 'test-scenario', status: 'engaged' }
    const mock = makeSupabaseMock(updated)
    mockCreateClient.mockResolvedValue(mock as never)

    const req = new Request('http://localhost/api/scenarios/test-scenario/assets/cvn-72', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'engaged' }),
    })
    const res = await PATCH(req, { params: { id: 'test-scenario', assetId: 'cvn-72' } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.status).toBe('engaged')
  })
})
