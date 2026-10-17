import { requireAdminSession } from '@/features/auth'
import { availabilityService } from '../services/availability-service'
import { toClosedDateViews, toManualBlockViews, toWeeklyDays } from '../utils/availability-format'
import { AdminAvailabilityView } from './AdminAvailabilityView'

// Compone /admin/citas: sesión de staff, carga de las tres listas y render de la vista. Un error
// de lectura sube a error.tsx de la ruta (UI-003).
export async function AdminAvailabilityPage() {
  await requireAdminSession()
  const { weeklyBlocks, closedDates, manualBlocks } = await availabilityService.loadAll()

  return (
    <AdminAvailabilityView
      weeklyDays={toWeeklyDays(weeklyBlocks)}
      closedDates={toClosedDateViews(closedDates)}
      manualBlocks={toManualBlockViews(manualBlocks)}
    />
  )
}
