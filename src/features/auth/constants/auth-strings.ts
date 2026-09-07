export const AUTH_BUTTON_TEXTS = {
  googleSignIn: 'Continuar con Google', connecting: 'Conectando...', completeRegistration: 'Completar registro', signOut: 'Cerrar sesión',
} as const
export const AUTH_LABELS = {
  phoneInput: 'Número de teléfono', mandatoryStepTitle: 'Paso obligatorio',
  mandatoryStepDescription: 'Ingresa tu número de teléfono para vincular tu ficha y confirmar tus citas.',
  account: 'Cuenta', welcomeBack: 'Bienvenida de nuevo', welcomeTitle: 'Bienvenida',
  welcomeSubtitle: 'Inicia sesión con tu cuenta de Google para agendar y gestionar tus citas',
  phoneNotice: 'Al continuar con Google, se te solicitará tu número de teléfono para la confirmación de tus citas.',
  phonePending: 'Teléfono pendiente', helpQuestion: '¿Necesitas ayuda?', phonePrefix: 'Tel: ',
} as const
export const AUTH_ERROR_MESSAGES = {
  phoneMinLength: 'El número de teléfono debe tener al menos 8 dígitos', unauthenticated: 'Usuario no autenticado',
  phoneSaveError: 'No se pudo guardar el teléfono. Inténtelo nuevamente.', googleOAuthError: 'Error al iniciar sesión con Google',
  phoneInvalidFormat: 'El teléfono solo debe contener números, espacios o el símbolo +',
} as const
