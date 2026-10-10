// Clock — reloj inyectado (DOM-004). El dominio y la capa de aplicación no llaman
// new Date()/Date.now() directamente; reciben el instante desde el borde. Sin regla de
// negocio (ARCH-007): es infraestructura, igual que Money o Result.

export interface Clock {
  now(): Date
}

export const systemClock: Clock = {
  now: () => new Date(),
}
