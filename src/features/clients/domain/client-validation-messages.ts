export const CLIENT_VALIDATION_MESSAGES = {
  fullNameRequired: 'El nombre completo es obligatorio', fullNameTooShort: 'El nombre debe tener al menos 3 caracteres',
  phoneRequired: 'El teléfono es obligatorio', phoneTooShort: 'El teléfono debe tener al menos 8 dígitos',
  phoneInvalidFormat: 'El teléfono solo debe contener números, espacios, guiones o el símbolo +',
  emailRequired: 'El correo electrónico es obligatorio', emailInvalidFormat: 'El formato del correo no es válido',
  notesTooLong: 'Las notas no pueden superar los 500 caracteres',
  fullNameTooLong: 'El nombre no puede superar los 120 caracteres', phoneTooLong: 'El teléfono no puede superar los 20 caracteres',
  emailTooLong: 'El correo no puede superar los 150 caracteres',
} as const
