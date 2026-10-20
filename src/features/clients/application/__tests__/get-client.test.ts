import { describe, it, expect } from 'vitest'
import { ok, err } from '@/shared/result'
import { getClient } from '../queries'
import { CLIENT_FIXTURES } from '../../__tests__/client-fixtures'
import type { ClientRepository } from '../ports'

const repoFinding = (found: Awaited<ReturnType<ClientRepository['findById']>>) =>
  ({ findById: async () => found }) as unknown as ClientRepository

describe('getClient — una clienta por su id', () => {
  it('devuelve la clienta encontrada', async () => {
    const [client] = CLIENT_FIXTURES
    expect(await getClient(repoFinding(ok(client)))(client.id)).toEqual(ok(client))
  })

  it('una clienta que no está es not-found', async () => {
    expect(await getClient(repoFinding(ok(null)))('client-x')).toEqual(err('not-found'))
  })

  it('un fallo del repositorio es failed, no not-found', async () => {
    expect(await getClient(repoFinding(err('repository-failed')))('client-x')).toEqual(err('failed'))
  })
})
