import { ClientsList } from '@/features/clients'
import { adminClientsStyles as STYLES } from './clients.styles'

export default function AdminClientsLoading() {
  return (
    <div className={STYLES.page}>
      <ClientsList clients={[]} isLoading />
    </div>
  )
}
