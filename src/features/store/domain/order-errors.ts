import type { ReceiptProblem } from './receipt'

export type InvalidReceipt = {
  kind: 'InvalidReceipt'
  code: 'STORE_COMPROBANTE_INVALIDO'
  message: string
  problem: ReceiptProblem
}

export function createInvalidReceipt(problem: ReceiptProblem): InvalidReceipt {
  return {
    kind: 'InvalidReceipt',
    code: 'STORE_COMPROBANTE_INVALIDO',
    message: 'el comprobante tiene que ser una imagen (JPEG, PNG, WebP) o un PDF de hasta 1 MB',
    problem,
  }
}

export type InvalidContactPhone = {
  kind: 'InvalidContactPhone'
  code: 'STORE_PEDIDO_TELEFONO_INVALIDO'
  message: string
}

export type InvalidRejectionReason = {
  kind: 'InvalidRejectionReason'
  code: 'STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO'
  message: string
}

export type NotAClient = {
  kind: 'NotAClient'
  code: 'STORE_NO_ES_CLIENTA'
  message: string
}

export type CartEmpty = {
  kind: 'CartEmpty'
  code: 'STORE_CARRITO_VACIO'
  message: string
}

export type InsufficientStock = {
  kind: 'InsufficientStock'
  code: 'STORE_EXISTENCIAS_INSUFICIENTES'
  message: string
}

export type ReceiptNotFound = {
  kind: 'ReceiptNotFound'
  code: 'STORE_COMPROBANTE_NO_ENCONTRADO'
  message: string
}

export type ReceiptAlreadyUsed = {
  kind: 'ReceiptAlreadyUsed'
  code: 'STORE_COMPROBANTE_YA_USADO'
  message: string
}

export type NotAdmin = {
  kind: 'NotAdmin'
  code: 'STORE_NO_ES_ADMINISTRADORA'
  message: string
}

export type OrderNotFound = {
  kind: 'OrderNotFound'
  code: 'STORE_PEDIDO_NO_ENCONTRADO'
  message: string
}

export type OrderNotPending = {
  kind: 'OrderNotPending'
  code: 'STORE_PEDIDO_NO_PENDIENTE'
  message: string
}

export type StoreStorageFailed = {
  kind: 'StoreStorageFailed'
  code: 'STORE_FALLO_DE_ALMACENAMIENTO'
  message: string
}

export function createInvalidContactPhone(): InvalidContactPhone {
  return {
    kind: 'InvalidContactPhone',
    code: 'STORE_PEDIDO_TELEFONO_INVALIDO',
    message: 'el teléfono de contacto debe tener entre 8 y 20 caracteres',
  }
}

export function createInvalidRejectionReason(): InvalidRejectionReason {
  return {
    kind: 'InvalidRejectionReason',
    code: 'STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO',
    message: 'el motivo de rechazo debe tener entre 10 y 500 caracteres',
  }
}

export function createNotAClient(): NotAClient {
  return {
    kind: 'NotAClient',
    code: 'STORE_NO_ES_CLIENTA',
    message: 'solo una clienta con perfil puede finalizar una compra',
  }
}

export function createCartEmpty(): CartEmpty {
  return {
    kind: 'CartEmpty',
    code: 'STORE_CARRITO_VACIO',
    message: 'el carrito está vacío',
  }
}

export function createInsufficientStock(): InsufficientStock {
  return {
    kind: 'InsufficientStock',
    code: 'STORE_EXISTENCIAS_INSUFICIENTES',
    message: 'no hay suficientes existencias para completar el pedido',
  }
}

export function createReceiptNotFound(): ReceiptNotFound {
  return {
    kind: 'ReceiptNotFound',
    code: 'STORE_COMPROBANTE_NO_ENCONTRADO',
    message: 'el comprobante no se subió, o no es de la clienta de la sesión',
  }
}

export function createReceiptAlreadyUsed(): ReceiptAlreadyUsed {
  return {
    kind: 'ReceiptAlreadyUsed',
    code: 'STORE_COMPROBANTE_YA_USADO',
    message: 'este comprobante ya se usó en otro pedido',
  }
}

export function createNotAdmin(): NotAdmin {
  return {
    kind: 'NotAdmin',
    code: 'STORE_NO_ES_ADMINISTRADORA',
    message: 'solo la administradora puede revisar un pedido',
  }
}

export function createOrderNotFound(): OrderNotFound {
  return {
    kind: 'OrderNotFound',
    code: 'STORE_PEDIDO_NO_ENCONTRADO',
    message: 'el pedido no existe',
  }
}

export function createOrderNotPending(): OrderNotPending {
  return {
    kind: 'OrderNotPending',
    code: 'STORE_PEDIDO_NO_PENDIENTE',
    message: 'el pedido ya fue revisado',
  }
}

export function createStoreStorageFailed(message: string): StoreStorageFailed {
  return {
    kind: 'StoreStorageFailed',
    code: 'STORE_FALLO_DE_ALMACENAMIENTO',
    message,
  }
}
