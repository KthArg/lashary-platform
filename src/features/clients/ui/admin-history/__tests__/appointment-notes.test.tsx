import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AppointmentNotes } from '../components/AppointmentNotes'
import { NOTE_LABELS, NOTE_PROBLEM_MESSAGES } from '../constants/history-strings'
import { formatAppointmentDate } from '../format-appointment-date'
import type { AppointmentNoteView } from '@/features/clients/application/notes/notes-by-appointment'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const APPOINTMENT_ID = '33333333-3333-4333-8333-333333333333'
const CREATED_AT_MS = Date.parse('2026-10-01T16:00:00Z')
const EDITED_AT_MS = Date.parse('2026-10-03T18:30:00Z')
const SAVED = { ok: true }

const untouched: AppointmentNoteView = { id: 'nota-1', body: 'Ojos irritados', createdAtMs: CREATED_AT_MS, updatedAtMs: CREATED_AT_MS }
const edited: AppointmentNoteView = { id: 'nota-2', body: 'Prefiere la mañana', createdAtMs: CREATED_AT_MS, updatedAtMs: EDITED_AT_MS }

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), add: vi.fn(), edit: vi.fn(), remove: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('../actions/note-actions', () => ({ addNoteAction: mocks.add, editNoteAction: mocks.edit, deleteNoteAction: mocks.remove }))

const renderNotes = (notes: AppointmentNoteView[] = [untouched]) =>
  render(<AppointmentNotes clientId={CLIENT_ID} appointmentId={APPOINTMENT_ID} notes={notes} />)
const createdAt = formatAppointmentDate(CREATED_AT_MS)
const noteField = () => screen.getByRole('textbox') as HTMLTextAreaElement
const paragraphsReading = (expected: string) =>
  screen.getAllByRole('paragraph').filter((paragraph) => paragraph.textContent === expected)

beforeEach(() => vi.clearAllMocks())

describe('AppointmentNotes — lo que se ve (criterio 3)', () => {
  it('muestra la fecha de creación, y la de edición solo si la anotación cambió', () => {
    renderNotes([untouched, edited])
    expect(paragraphsReading(NOTE_LABELS.created(createdAt))).toHaveLength(1)
    expect(paragraphsReading(`${NOTE_LABELS.created(createdAt)} · ${NOTE_LABELS.edited(formatAppointmentDate(EDITED_AT_MS))}`)).toHaveLength(1)
  })

  it('dos anotaciones del mismo minuto tienen botones con nombres distintos', () => {
    renderNotes([untouched, { ...untouched, id: 'nota-3', body: 'Otra observación' }])
    expect(screen.getByRole('button', { name: NOTE_LABELS.editButton(1, 2, createdAt) })).toBeTruthy()
    expect(screen.getByRole('button', { name: NOTE_LABELS.editButton(2, 2, createdAt) })).toBeTruthy()
    expect(screen.getByRole('button', { name: NOTE_LABELS.removeButton(2, 2, createdAt) })).toBeTruthy()
  })

  it('una cita sin anotaciones lo dice y ofrece agregar', () => {
    renderNotes([])
    expect(screen.getByText(NOTE_LABELS.empty)).toBeTruthy()
    expect(screen.getByRole('button', { name: NOTE_LABELS.add })).toBeTruthy()
  })
})

describe('AppointmentNotes — agregar y editar (criterio 1)', () => {
  it('agrega la anotación a esta cita, cierra el formulario y refresca', async () => {
    mocks.add.mockResolvedValue(SAVED)
    renderNotes([])
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.add }))
    fireEvent.change(screen.getByLabelText(NOTE_LABELS.newField), { target: { value: 'Ojos irritados' } })
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.save }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.add).toHaveBeenCalledWith(CLIENT_ID, APPOINTMENT_ID, 'Ojos irritados')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('editar abre el formulario con el texto actual y guarda sobre esa anotación', async () => {
    mocks.edit.mockResolvedValue(SAVED)
    renderNotes()
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.editButton(1, 1, createdAt) }))
    expect(noteField().value).toBe('Ojos irritados')
    fireEvent.change(noteField(), { target: { value: 'Ojos sin irritación' } })
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.save }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.edit).toHaveBeenCalledWith(CLIENT_ID, untouched.id, 'Ojos sin irritación')
  })

  it('con un borrador abierto no se puede editar ni eliminar otra anotación, así no se pierde lo escrito', () => {
    renderNotes([untouched, edited])
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.editButton(1, 2, createdAt) }))
    fireEvent.change(noteField(), { target: { value: 'Texto a medio escribir' } })
    const otherEdit = screen.getByRole('button', { name: NOTE_LABELS.editButton(2, 2, createdAt) }) as HTMLButtonElement
    const otherRemove = screen.getByRole('button', { name: NOTE_LABELS.removeButton(2, 2, createdAt) }) as HTMLButtonElement
    expect(otherEdit.disabled).toBe(true)
    expect(otherRemove.disabled).toBe(true)
    fireEvent.click(otherEdit)
    expect(noteField().value).toBe('Texto a medio escribir')
  })

  it('si el servidor rechaza, lo anuncia, conserva lo escrito y no refresca', async () => {
    mocks.add.mockResolvedValue({ ok: false, error: 'Esa cita no es de esta clienta.' })
    renderNotes([])
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.add }))
    fireEvent.change(noteField(), { target: { value: 'Ojos irritados' } })
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.save }))
    expect((await screen.findByRole('alert')).textContent).toBe('Esa cita no es de esta clienta.')
    expect(noteField().value).toBe('Ojos irritados')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('al corregir el texto, el aviso del intento anterior desaparece', async () => {
    mocks.add.mockResolvedValue({ ok: false, error: NOTE_PROBLEM_MESSAGES['note-empty'] })
    renderNotes([])
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.add }))
    fireEvent.change(noteField(), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.save }))
    await screen.findByRole('alert')
    fireEvent.change(noteField(), { target: { value: 'Ojos irritados' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('AppointmentNotes — eliminar (criterio 1)', () => {
  it('pide confirmar y, al confirmar, elimina esa anotación', async () => {
    mocks.remove.mockResolvedValue(SAVED)
    renderNotes()
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.removeButton(1, 1, createdAt) }))
    expect(screen.getByRole('alertdialog').textContent).toContain(NOTE_LABELS.confirmMessage)
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.remove }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.remove).toHaveBeenCalledWith(CLIENT_ID, untouched.id)
  })

  it('cancelar la confirmación no elimina nada', () => {
    renderNotes()
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.removeButton(1, 1, createdAt) }))
    fireEvent.click(screen.getByRole('button', { name: NOTE_LABELS.cancel }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
