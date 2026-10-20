import { requireAdminSession } from '@/features/auth'
import { alertsService } from '../services/alerts-service'
import { AlertsView } from './AlertsView'

export async function AlertsPage() {
  await requireAdminSession()
  return <AlertsView view={await alertsService.load()} />
}
