import { ok, err, isErr, type Result } from '@/shared/result'
import { CLIENT_FIELD_KEYS, CLIENT_PHONE_FORMAT } from '../domain/client-form'
import { hasClientFormErrors, validateClientForm } from '../domain/validate-client-form'
import { normalizePhone } from '../domain/normalize-phone'
import type { ClientFormValues } from '../domain/client-form.types'
import type { ClientRecord } from '../domain/client.types'
import type { ClientRepository, ClientWriteModel } from './ports'

export type ClientCommandError = 'invalid' | 'phone-taken' | 'not-found' | 'failed'

type ClientCommandResult<T> = Result<T, ClientCommandError>

const readValues = (input: ClientFormValues): ClientFormValues => Object.fromEntries(
  Object.values(CLIENT_FIELD_KEYS).map((field) => [field, typeof input?.[field] === 'string' ? input[field] : '']),
) as unknown as ClientFormValues

const lastLocalDigits = (phone: string): string => phone.replace(/\D/g, '').slice(-CLIENT_PHONE_FORMAT.localDigits)

async function isPhoneTaken(repo: ClientRepository, phone: string, excludeId?: string): Promise<ClientCommandResult<boolean>> {
  const found = await repo.findByPhoneDigits(lastLocalDigits(phone))
  if (isErr(found)) return err('failed')
  return ok(found.value.some((entry) => (excludeId === undefined || entry.id !== excludeId) && normalizePhone(entry.phone) === phone))
}

async function prepareClient(repo: ClientRepository, input: ClientFormValues, excludeId?: string): Promise<ClientCommandResult<ClientWriteModel>> {
  const values = readValues(input)
  if (hasClientFormErrors(validateClientForm(values))) return err('invalid')
  const phone = normalizePhone(values.phone)
  const taken = await isPhoneTaken(repo, phone, excludeId)
  if (isErr(taken)) return taken
  if (taken.value) return err('phone-taken')
  return ok({ fullName: values.fullName.trim(), phone, email: values.email.trim(), notes: values.notes.trim() || null })
}

export const addClient =
  (repo: ClientRepository) =>
  async (input: ClientFormValues): Promise<ClientCommandResult<ClientRecord>> => {
    const prepared = await prepareClient(repo, input)
    if (isErr(prepared)) return prepared
    const saved = await repo.insertVerified(prepared.value)
    return isErr(saved) ? err('failed') : saved
  }

export const editClient =
  (repo: ClientRepository) =>
  async (id: string, input: ClientFormValues): Promise<ClientCommandResult<ClientRecord>> => {
    if (typeof id !== 'string' || !id) return err('not-found')
    const prepared = await prepareClient(repo, input, id)
    if (isErr(prepared)) return prepared
    const saved = await repo.update(id, prepared.value)
    if (isErr(saved)) return err('failed')
    return saved.value ? ok(saved.value) : err('not-found')
  }
