// Clock — reloj inyectable (DOM-004). new Date() está prohibido en código de dominio; todo lo
// que necesita "ahora" recibe un Clock por dependencia, para poder fijar el tiempo en tests.
// Sin reglas de negocio (ARCH-007): "clock" está en la lista explícita de lo que shared/ puede
// contener.

export type Clock = () => Date

export const systemClock: Clock = () => new Date()
