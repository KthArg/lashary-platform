import { inactiveClientsService } from '../../services/inactive-clients-service'
import { InactiveClientsView } from '../InactiveClientsView'
import type { InactiveClientsPageProps } from './InactiveClientsPage.types'

export async function InactiveClientsPage({ searchParams }: InactiveClientsPageProps) {
  return <InactiveClientsView screen={await inactiveClientsService.load((await searchParams) ?? {})} />
}
