import type { MyAccount } from '@/features/delinquency/application/submit-regularization'

export type SubmitRegularizationResult = { ok: true; message: string } | { ok: false; message: string }

export type LoadMyAccountResult = { ok: true; account: MyAccount } | { ok: false; message: string }

// Lo que llega del formulario: el archivo como lo entrega FormData en el servidor.
export type ReceiptUpload = {
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}
