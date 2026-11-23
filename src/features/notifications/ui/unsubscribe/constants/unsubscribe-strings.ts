export const UNSUBSCRIBE_FIELDS = { token: 'token', intent: 'intencion' } as const

export const UNSUBSCRIBE_INTENTS = { unsubscribe: 'unsubscribe', resubscribe: 'resubscribe' } as const

export const unsubscribeMessages = {
  title: 'Recordatorios de LASHARY',
  question:
    '¿Quieres dejar de recibir los correos que te invitan a volver a agendar? Los avisos de tus citas te seguirán llegando.',
  unsubscribe: 'Darme de baja',
  resubscribe: 'Volver a suscribirme',
  working: 'Guardando…',
  unsubscribed: 'Listo, ya no te enviaremos estos recordatorios. Si cambias de idea, puedes volver a suscribirte aquí mismo.',
  subscribed: 'Listo, volverás a recibir estos recordatorios.',
  invalid: 'Este enlace no es válido. Revisa que lo hayas copiado completo desde el correo.',
  error: 'No pudimos guardar el cambio. Intenta de nuevo en un momento.',
}
