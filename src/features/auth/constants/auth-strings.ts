export const AUTH_BUTTON_TEXTS = {
  googleSignIn: 'Continuar con Google', connecting: 'Conectando...', completeRegistration: 'Completar registro',
  signOut: 'Cerrar sesión', adminLogin: 'Ingresar al Panel', adminVerifying: 'Verificando...',
} as const

export const AUTH_LABELS = {
  phoneInput: 'Número de teléfono', mandatoryStepTitle: 'Paso obligatorio',
  mandatoryStepDescription: 'Ingresa tu número de teléfono para vincular tu ficha y confirmar tus citas.',
  account: 'Cuenta', welcomeBack: 'Bienvenida de nuevo', welcomeTitle: 'Bienvenida',
  welcomeSubtitle: 'Inicia sesión con tu cuenta de Google para agendar y gestionar tus citas',
  phoneNotice: 'Al continuar con Google, se te solicitará tu número de teléfono para la confirmación de tus citas.',
  phonePending: 'Teléfono pendiente', helpQuestion: '¿Necesitas ayuda?', phonePrefix: 'Tel: ',
  emailInput: 'Correo Electrónico', passwordInput: 'Contraseña',
  adminAccessTitle: 'Acceso de Gestión', adminAccessSubtitle: 'Ingresa tus credenciales autorizadas',
  adminRestrictedNotice: 'Acceso restringido a personal autorizado.',
  adminActiveSession: 'Sesión Administrativa Activa', adminRoleBadge: 'Rol:',
  dashboardNav: 'Dashboard', citasNav: 'Citas',
  collapseSidebar: 'Colapsar barra', expandSidebar: 'Expandir barra',
  clientCitasNav: 'Mis Citas', clientCartNav: 'Carrito',
  clientAccountNav: 'Mi Cuenta', clientPortalTitle: 'Portal Clienta',
  clientCitasTitle: 'Mis Citas',
  clientCitasSubtitle: 'Historial y próximas citas agendadas (US-AGE-05).',
  clientCitasPlaceholder: 'Espacio reservado para la visualización y gestión de citas de la clienta.',
  clientCartTitle: 'Carrito de Compras',
  clientCartSubtitle: 'Módulo de compras y productos seleccionados (US-SHOP-01).',
  clientCartPlaceholder: 'Espacio reservado para el carrito de compras persistente durante la sesión.',
  clientAccountTitle: 'Mi Cuenta',
  clientAccountSubtitle: 'Ficha de clienta, estado de cuenta e información personal (US-CLI-06 / US-MOR-03).',
  emailLabel: 'Correo:',
  phoneLabel: 'Teléfono:',
} as const

export const AUTH_ERROR_MESSAGES = {
  phoneMinLength: 'El número de teléfono debe tener al menos 8 dígitos', unauthenticated: 'Usuario no autenticado',
  phoneSaveError: 'No se pudo guardar el teléfono. Inténtelo nuevamente.', googleOAuthError: 'Error al iniciar sesión con Google',
  phoneInvalidFormat: 'El teléfono solo debe contener números, espacios o el símbolo +',
  invalidCredentials: 'Credenciales inválidas', accessDenied: 'Acceso denegado: permisos insuficientes',
} as const
