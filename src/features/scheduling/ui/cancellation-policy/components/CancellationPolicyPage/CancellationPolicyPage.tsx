import { cancellationPolicyService } from '../../services/cancellation-policy-service'
import { CancellationPolicyView } from '../CancellationPolicyView'

export async function CancellationPolicyPage() {
  return <CancellationPolicyView view={await cancellationPolicyService.load()} />
}
