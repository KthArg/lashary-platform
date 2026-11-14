import { reapplicationSettingsService } from '../../services/reapplication-settings-service'
import { ReapplicationSettingsView } from '../ReapplicationSettingsView'

export async function ReapplicationSettingsPage() {
  return <ReapplicationSettingsView view={await reapplicationSettingsService.load()} />
}
