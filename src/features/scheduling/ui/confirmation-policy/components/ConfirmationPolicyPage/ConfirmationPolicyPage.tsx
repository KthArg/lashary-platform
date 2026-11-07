import { confirmationPolicyService } from '../../services/confirmation-policy-service'
import { ConfirmationPolicyView } from '../ConfirmationPolicyView'

export async function ConfirmationPolicyPage() {
  return <ConfirmationPolicyView view={await confirmationPolicyService.load()} />
}
