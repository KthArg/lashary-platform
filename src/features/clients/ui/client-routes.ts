const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_PATTERN.test(value)

export const CLIENTS_PATH = '/admin/clients'

export const clientRecordPath = (clientId: string): string => `${CLIENTS_PATH}/${clientId}/expediente`

export const clientAppointmentsPath = (clientId: string): string => `${CLIENTS_PATH}/${clientId}/citas`
