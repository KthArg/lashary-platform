import { CLIENT_FORM_LIMITS } from '../domain/client-form'

export const CLIENTS_LIST_LIMITS = {
  pageSizes: [10, 25, 50], defaultPageSize: 25, nameFilterMaxLength: CLIENT_FORM_LIMITS.fullNameMaxLength,
} as const
