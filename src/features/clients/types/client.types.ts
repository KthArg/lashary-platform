import type { ClientFormValues } from './client-form.types'

/** Una clienta ya registrada: los mismos campos del formulario mas su identificador. */
export interface ClientRecord extends ClientFormValues {
  id: string
}
