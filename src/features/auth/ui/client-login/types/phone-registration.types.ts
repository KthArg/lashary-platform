export type PhoneRegistrationState =
  | { success: true }
  | { success: false; error: string }
