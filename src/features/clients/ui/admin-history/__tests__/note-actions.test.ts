import { describe, it, expect, vi, beforeEach } from 'vitest'
import { err, ok } from '@/shared/result'
import { addNoteAction, deleteNoteAction, editNoteAction } from '../actions/note-actions'
import { NOTE_ERROR_MESSAGES, NOTE_PROBLEM_MESSAGES } from '../constants/history-strings'
import { savedNote } from '@/features/clients/application/__tests__/note-fakes'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'
const APPOINTMENT_ID = '33333333-3333-4333-8333-333333333333'
const NOTE_ID = '44444444-4444-4444-8444-444444444444'
const APPOINTMENTS_PATH = `/admin/clients/${CLIENT_ID}/citas`

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  revalidatePath: vi.fn(),
  repo: { add: vi.fn(), updateBody: vi.fn(), remove: vi.fn(), listForAppointments: vi.fn() },
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: () => mocks.requireAdminSession() }))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mocks.revalidatePath(path) }))
vi.mock('@/features/clients/db/notes/note-repository', () => ({ noteRepository: async () => mocks.repo }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminSession.mockResolvedValue({ user: { id: ADMIN_ID }, role: 'admin' })
  mocks.repo.add.mockResolvedValue(ok(savedNote()))
  mocks.repo.updateBody.mockResolvedValue(ok(savedNote()))
  mocks.repo.remove.mockResolvedValue(ok(undefined))
})

describe('acciones de las anotaciones (criterio 1)', () => {
  it('agregar firma con la admin de la sesión, en la clienta de la ficha, y refresca la pestaña Citas', async () => {
    expect(await addNoteAction(CLIENT_ID.toUpperCase(), APPOINTMENT_ID, ' Ojos irritados ')).toEqual({ ok: true })
    expect(mocks.repo.add).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: CLIENT_ID, appointmentId: APPOINTMENT_ID, createdBy: ADMIN_ID }),
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith(APPOINTMENTS_PATH)
  })

  it('editar y eliminar llegan al repositorio con la anotación y la clienta', async () => {
    expect(await editNoteAction(CLIENT_ID, NOTE_ID, 'Prefiere la mañana')).toEqual({ ok: true })
    expect(mocks.repo.updateBody).toHaveBeenCalledWith(NOTE_ID, CLIENT_ID, expect.objectContaining({ text: 'Prefiere la mañana' }))
    expect(await deleteNoteAction(CLIENT_ID, NOTE_ID)).toEqual({ ok: true })
    expect(mocks.repo.remove).toHaveBeenCalledWith(NOTE_ID, CLIENT_ID)
  })
})

describe('acciones de las anotaciones ante errores', () => {
  it('pide la sesión de administradora antes de mirar nada', async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(addNoteAction(CLIENT_ID, APPOINTMENT_ID, 'Nota')).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.repo.add).not.toHaveBeenCalled()
  })

  it.each([
    ['una clienta mal formada', () => addNoteAction('../otra', APPOINTMENT_ID, 'Nota')],
    ['una cita mal formada', () => addNoteAction(CLIENT_ID, 'cita-1', 'Nota')],
    ['una anotación mal formada', () => deleteNoteAction(CLIENT_ID, '1 OR 1=1')],
  ])('%s se rechaza sin consultar la base', async (_caseName, call) => {
    expect(await call()).toEqual({ ok: false, error: NOTE_ERROR_MESSAGES.invalidTarget })
    expect(mocks.repo.add).not.toHaveBeenCalled()
    expect(mocks.repo.remove).not.toHaveBeenCalled()
  })

  it('traduce cada error a su texto y no refresca la pestaña', async () => {
    mocks.repo.add.mockResolvedValue(err('appointment-not-of-client'))
    mocks.repo.updateBody.mockResolvedValue(err('note-not-found'))
    mocks.repo.remove.mockResolvedValue(err('storage-failed'))
    expect(await addNoteAction(CLIENT_ID, APPOINTMENT_ID, 'Nota')).toEqual({ ok: false, error: NOTE_ERROR_MESSAGES.appointmentNotOfClient })
    expect(await editNoteAction(CLIENT_ID, NOTE_ID, 'Nota')).toEqual({ ok: false, error: NOTE_ERROR_MESSAGES.noteNotFound })
    expect(await deleteNoteAction(CLIENT_ID, NOTE_ID)).toEqual({ ok: false, error: NOTE_ERROR_MESSAGES.storageFailed })
    expect(await editNoteAction(CLIENT_ID, NOTE_ID, '   ')).toEqual({ ok: false, error: NOTE_PROBLEM_MESSAGES['note-empty'] })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('una excepción inesperada vuelve como error, no se escapa y deja la causa en el registro', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.repo.add.mockRejectedValue(new Error('se cayó la red'))
    expect(await addNoteAction(CLIENT_ID, APPOINTMENT_ID, 'Nota')).toEqual({ ok: false, error: NOTE_ERROR_MESSAGES.storageFailed })
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('se cayó la red'))
    consoleError.mockRestore()
  })
})
