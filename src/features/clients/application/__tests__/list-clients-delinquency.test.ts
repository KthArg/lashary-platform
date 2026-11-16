import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { listClients } from '../queries'
import type { ClientRepository, DelinquencyStatesPort } from '../ports'
import type { ClientRecord } from '../../domain/client.types'
import type { ClientDelinquency } from '../../domain/client-delinquency'

const ana: ClientRecord = { id: 'cli-001', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '' }
const lucia: ClientRecord = { id: 'cli-002', fullName: 'Lucía Mora', phone: '+50670125566', email: 'lucia@correo.com', notes: '' }

function repo(clients: ClientRecord[]): ClientRepository {
  return {
    listPage: async () => ok({ clients, total: clients.length }),
  } as unknown as ClientRepository
}

describe('listClients con la morosidad', () => {
  it('pide la morosidad de las clientas de la página, una sola vez, y la devuelve por id', async () => {
    const statesFor = vi.fn(async () => ok(new Map<string, ClientDelinquency>([['cli-001', { state: 'active', pending: 20000 }]])))
    const delinquency: DelinquencyStatesPort = { statesFor }

    const result = await listClients(repo([ana, lucia]), delinquency)({})

    expect(statesFor).toHaveBeenCalledTimes(1)
    expect(statesFor).toHaveBeenCalledWith(['cli-001', 'cli-002'])
    expect(isOk(result) && result.value.delinquency).toEqual({ 'cli-001': { state: 'active', pending: 20000 } })
    expect(isOk(result) && result.value.delinquencyAvailable).toBe(true)
  })

  it('si la morosidad no se pudo leer, el listado sigue y lo dice con delinquencyAvailable en falso', async () => {
    const delinquency: DelinquencyStatesPort = { statesFor: async () => err('repository-failed') }

    const result = await listClients(repo([ana]), delinquency)({})

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.clients).toEqual([ana])
    expect(result.value.delinquency).toEqual({})
    expect(result.value.delinquencyAvailable).toBe(false)
  })

  it('sin el puerto de morosidad no la inventa', async () => {
    const result = await listClients(repo([ana]))({})

    expect(isOk(result) && result.value.delinquencyAvailable).toBe(false)
  })

  it('una página sin clientas devuelve la morosidad disponible y vacía', async () => {
    const delinquency: DelinquencyStatesPort = { statesFor: async () => ok(new Map()) }

    const result = await listClients(repo([]), delinquency)({})

    expect(isOk(result) && result.value.delinquencyAvailable).toBe(true)
    expect(isOk(result) && result.value.delinquency).toEqual({})
  })
})
