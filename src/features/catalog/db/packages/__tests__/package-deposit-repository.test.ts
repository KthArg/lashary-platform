import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { buildPackage } from '../../../domain/packages/package'
import { createSupabasePackageRepository } from '../package-repository'

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))

const id = '00000000-0000-0000-0000-00000000d011'
const row = {
  id, name: 'Paquete con anticipo', price: '30000', deposit: '9000', is_active: true,
  catalog_package_techniques: ['t1', 't2'].map((technique_id) => ({
    technique_id, catalog_techniques: { duration_first_time_min: 30, buffer_min: 0 },
  })),
}

describe('persistencia del anticipo por paquete', () => {
  it('selecciona y reconstituye el anticipo guardado', async () => {
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: row })) }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    const db = { from: vi.fn(() => query) } as unknown as SupabaseClient
    const found = await createSupabasePackageRepository(db).findById(id)
    expect(query.select.mock.calls[0][0]).toContain('deposit')
    expect(found?.pkg.deposit.colones).toBe(9000)
  })

  it('guarda con el RPC del anticipo y propaga fallos de infraestructura', async () => {
    const rpc = vi.fn(async () => ({ error: null as null | { code: string; message: string } }))
    const db = { rpc } as unknown as SupabaseClient
    const repo = createSupabasePackageRepository(db)
    const built = buildPackage({
      id, name: row.name, techniqueIds: ['t1', 't2'],
      price: Money.fromColones(30000), deposit: Money.fromColones(9000),
    })
    if (!isOk(built)) throw new Error('paquete inválido')
    await repo.save(built.value)
    expect(rpc).toHaveBeenCalledWith('catalog_save_package_with_deposit', expect.objectContaining({
      p_deposit: 9000, p_price: 30000,
    }))
    rpc.mockResolvedValueOnce({ error: { code: 'XX000', message: 'sin conexión' } })
    await expect(repo.save(built.value)).rejects.toThrow('sin conexión')
  })
})
