export type InvalidContactPhone = {
  kind: 'InvalidContactPhone'
  code: 'STORE_PEDIDO_TELEFONO_INVALIDO'
  message: string
}

export type DeliveryAddressRequired = {
  kind: 'DeliveryAddressRequired'
  code: 'STORE_PEDIDO_DIRECCION_REQUERIDA'
  message: string
}

export type InvalidRejectionReason = {
  kind: 'InvalidRejectionReason'
  code: 'STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO'
  message: string
}

export function createInvalidContactPhone(): InvalidContactPhone {
  return {
    kind: 'InvalidContactPhone',
    code: 'STORE_PEDIDO_TELEFONO_INVALIDO',
    message: 'el teléfono de contacto debe tener entre 8 y 20 caracteres',
  }
}

export function createDeliveryAddressRequired(): DeliveryAddressRequired {
  return {
    kind: 'DeliveryAddressRequired',
    code: 'STORE_PEDIDO_DIRECCION_REQUERIDA',
    message: 'la dirección de entrega es obligatoria cuando se elige envío',
  }
}

export function createInvalidRejectionReason(): InvalidRejectionReason {
  return {
    kind: 'InvalidRejectionReason',
    code: 'STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO',
    message: 'el motivo de rechazo debe tener entre 10 y 500 caracteres',
  }
}
