import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PrecautionsEditor } from '../components/PrecautionsEditor'
import { PRECAUTION_FORM_LABELS, RECORD_LABELS } from '../constants/record-strings'
import { ALLERGY, SENSITIVITY } from '../../../domain/record/__tests__/record-fixtures'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const CONDITION = { id: '44444444-4444-4444-8444-444444444444', name: 'Condición relevante' }

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), add: vi.fn(), remove: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('../actions/record-actions', () => ({
  addRecordPrecautionAction: mocks.add,
  removeRecordPrecautionAction: mocks.remove,
}))

const saved = { ok: true, version: {} }
const renderEditor = (precautions = [ALLERGY, SENSITIVITY]) =>
  render(<PrecautionsEditor clientId={CLIENT_ID} precautions={precautions} categories={[CONDITION]} />)

beforeEach(() => vi.clearAllMocks())

describe('PrecautionsEditor — agregar antecedentes (criterio 2)', () => {
  it('el + abre el formulario con las categorías que existen', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.addButton }))
    const category = screen.getByLabelText(PRECAUTION_FORM_LABELS.category) as HTMLSelectElement
    expect([...category.options].map((option) => option.text)).toEqual([PRECAUTION_FORM_LABELS.chooseCategory, CONDITION.name])
  })

  it('guarda el antecedente con la categoría elegida, cierra el formulario y refresca', async () => {
    mocks.add.mockResolvedValue(saved)
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.addButton }))
    fireEvent.change(screen.getByLabelText(PRECAUTION_FORM_LABELS.category), { target: { value: CONDITION.id } })
    fireEvent.change(screen.getByLabelText(PRECAUTION_FORM_LABELS.description), { target: { value: 'Blefaritis' } })
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.save }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.add).toHaveBeenCalledWith(CLIENT_ID, { categoryId: CONDITION.id, description: 'Blefaritis' })
    expect(screen.queryByLabelText(PRECAUTION_FORM_LABELS.description)).toBeNull()
  })

  it('si el servidor rechaza, lo anuncia y conserva lo escrito', async () => {
    mocks.add.mockResolvedValue({ ok: false, error: 'Revisa los datos.', problems: ['Ese antecedente ya está en el expediente.'] })
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.addButton }))
    fireEvent.change(screen.getByLabelText(PRECAUTION_FORM_LABELS.category), { target: { value: CONDITION.id } })
    fireEvent.change(screen.getByLabelText(PRECAUTION_FORM_LABELS.description), { target: { value: 'Blefaritis' } })
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.save }))
    expect((await screen.findByRole('alert')).textContent).toContain('Ese antecedente ya está en el expediente.')
    expect((screen.getByLabelText(PRECAUTION_FORM_LABELS.description) as HTMLInputElement).value).toBe('Blefaritis')
  })

  it('sin antecedentes lo dice y ofrece agregar', () => {
    renderEditor([])
    expect(screen.getByText(RECORD_LABELS.noPrecautions)).toBeTruthy()
    expect(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.addButton })).toBeTruthy()
  })
})

describe('PrecautionsEditor — quitar antecedentes (criterio 4)', () => {
  const removeButtonFor = (precaution: typeof ALLERGY) =>
    screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.removeButton(precaution.categoryName, precaution.description) })

  it('el Quitar de un antecedente pide confirmar y, al confirmar, quita ese y no otro', async () => {
    mocks.remove.mockResolvedValue(saved)
    renderEditor()
    fireEvent.click(removeButtonFor(ALLERGY))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.textContent).toContain(PRECAUTION_FORM_LABELS.confirmMessage(ALLERGY.categoryName, ALLERGY.description))
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.remove }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.remove).toHaveBeenCalledWith(CLIENT_ID, ALLERGY.id)
  })

  it('cancelar la confirmación no quita nada', () => {
    renderEditor()
    fireEvent.click(removeButtonFor(ALLERGY))
    fireEvent.click(screen.getByRole('button', { name: PRECAUTION_FORM_LABELS.cancel }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
