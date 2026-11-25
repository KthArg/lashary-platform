export type CheckoutActionResult = { ok: true; message: string } | { ok: false; message: string }

export type ReceiptUpload = {
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}
