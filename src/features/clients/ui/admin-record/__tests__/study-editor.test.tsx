import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudyEditor } from '../components/StudyEditor'
import { RECORD_LABELS, STUDY_FORM_LABELS } from '../constants/record-strings'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const VOLUME = { id: '22222222-2222-4222-8222-222222222222', name: 'Volumen' }
const CLASSIC = { id: '33333333-3333-4333-8333-333333333333', name: 'Clásicas' }

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), createRecordAction: vi.fn(), editRecordStudyAction: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('../actions/record-actions', () => ({
  createRecordAction: mocks.createRecordAction,
  editRecordStudyAction: mocks.editRecordStudyAction,
}))

const saved = { ok: true, version: {} }

beforeEach(() => vi.clearAllMocks())

const studyField = () => screen.getByLabelText(STUDY_FORM_LABELS.studyText) as HTMLTextAreaElement
const techniqueField = () => screen.getByLabelText(STUDY_FORM_LABELS.technique) as HTMLSelectElement

describe('StudyEditor — registrar y editar el estudio (criterio 1)', () => {
  it('sin expediente ofrece registrar el estudio inicial', () => {
    render(<StudyEditor clientId={CLIENT_ID} study={null} techniques={[VOLUME]} />)
    expect(screen.getByText(RECORD_LABELS.emptyRecord)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.createButton }))
    expect(studyField().value).toBe('')
    expect([...techniqueField().options].map((option) => option.text)).toEqual([STUDY_FORM_LABELS.noTechniqueOption, 'Volumen'])
  })

  it('registra el estudio con la técnica elegida, cierra el formulario y refresca', async () => {
    mocks.createRecordAction.mockResolvedValue(saved)
    render(<StudyEditor clientId={CLIENT_ID} study={null} techniques={[VOLUME]} />)
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.createButton }))
    fireEvent.change(studyField(), { target: { value: 'Pestaña fina' } })
    fireEvent.change(techniqueField(), { target: { value: VOLUME.id } })
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.save }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.createRecordAction).toHaveBeenCalledWith(CLIENT_ID, { studyText: 'Pestaña fina', recommendedTechniqueId: VOLUME.id })
    expect(screen.queryByLabelText(STUDY_FORM_LABELS.studyText)).toBeNull()
  })

  it('editar parte de lo guardado y "sin técnica" se envía como null', async () => {
    mocks.editRecordStudyAction.mockResolvedValue(saved)
    render(<StudyEditor clientId={CLIENT_ID} study={{ studyText: 'Pestaña fina', recommendedTechnique: VOLUME }} techniques={[VOLUME]} />)
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.editButton }))
    expect(studyField().value).toBe('Pestaña fina')
    expect(techniqueField().value).toBe(VOLUME.id)
    fireEvent.change(techniqueField(), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.save }))
    await waitFor(() => expect(mocks.editRecordStudyAction).toHaveBeenCalledWith(CLIENT_ID, { studyText: 'Pestaña fina', recommendedTechniqueId: null }))
  })

  it('una técnica vigente que ya no está activa sigue en el menú para no perderla al editar', () => {
    render(<StudyEditor clientId={CLIENT_ID} study={{ studyText: 'Pestaña fina', recommendedTechnique: CLASSIC }} techniques={[VOLUME]} />)
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.editButton }))
    expect(techniqueField().value).toBe(CLASSIC.id)
    expect([...techniqueField().options].map((option) => option.text)).toContain('Clásicas')
  })

  it('si el servidor rechaza, muestra el error y sus problemas sin cerrar el formulario', async () => {
    mocks.createRecordAction.mockResolvedValue({ ok: false, error: 'Revisa los datos.', problems: ['Escribe el estudio.'] })
    render(<StudyEditor clientId={CLIENT_ID} study={null} techniques={[]} />)
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.createButton }))
    fireEvent.change(studyField(), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.save }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Revisa los datos.')
    expect(alert.textContent).toContain('Escribe el estudio.')
    expect(studyField().value).toBe('x')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('Cancelar vuelve a mostrar el estudio sin guardar', () => {
    render(<StudyEditor clientId={CLIENT_ID} study={{ studyText: 'Pestaña fina', recommendedTechnique: null }} techniques={[]} />)
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.editButton }))
    fireEvent.click(screen.getByRole('button', { name: STUDY_FORM_LABELS.cancel }))
    expect(screen.getByText('Pestaña fina')).toBeTruthy()
    expect(mocks.editRecordStudyAction).not.toHaveBeenCalled()
  })
})
