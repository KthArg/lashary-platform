export const APPOINTMENT_DISPLAY_CHOICE = {
  firstTime: 'Primera vez',
  retouch: 'Retoque',
  packageKind: 'Paquete',
  noService: 'Servicio no registrado',
  priceNoDeposit: (price: string) => `Precio ${price} · Sin anticipo`,
  priceAndDeposit: (price: string, deposit: string) => `Precio ${price} · Anticipo ${deposit}`,
} as const

export const APPOINTMENT_DISPLAY_FORMAT = {
  locale: 'es-CR',
  timeZone: 'America/Costa_Rica',
  slotSeparator: ' · ',
  rangeSeparator: ' – ',
} as const
