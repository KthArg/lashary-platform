import { reschedulePolicyService } from '../services/reschedule-policy-service'
import { ReschedulePolicyView } from './ReschedulePolicyView'

export async function ReschedulePolicyPage() {
  return <ReschedulePolicyView view={await reschedulePolicyService.load()} />
}
