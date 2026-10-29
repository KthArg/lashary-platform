'use client'

import { useActionState, useEffect, useState } from 'react'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '@/features/scheduling/domain/manual-blocks.constants'
import { schedulingMessages } from '@/features/scheduling/ui/messages'
import { blockSlotsAction, releaseSlotsAction } from '../../actions/availability-actions'
import { BLOCK_SLOTS_FIELDS } from '../../constants/availability.constants'
import { initialAvailabilityActionState, type AvailabilityActionState } from '../../types/availability-action-state'
import type { SlotPickerSlotView } from '../../types/slot-picker.types'
import { AvailabilityFeedback } from '../AvailabilityForms'
import { slotPickerStyles as STYLES } from './SlotPicker.styles'
import type { SlotPickerProps } from './SlotPicker.types'

const pickerMessages = schedulingMessages.availability.picker

type PickerMode = 'idle' | 'block' | 'release'

const INTENT_FIELD = 'intent'

const STATUS_STYLES = {
  free: { label: STYLES.slotFree, badge: STYLES.badgeFree, text: pickerMessages.free },
  blocked: { label: STYLES.slotBlocked, badge: STYLES.badgeBlocked, text: pickerMessages.blocked },
  busy: { label: STYLES.slotBusy, badge: STYLES.badgeBusy, text: pickerMessages.busy },
} as const

async function submitSlots(previous: AvailabilityActionState, formData: FormData): Promise<AvailabilityActionState> {
  const submit = formData.get(INTENT_FIELD) === 'release' ? releaseSlotsAction : blockSlotsAction
  return submit(previous, formData)
}

const modeOf = (selected: ReadonlySet<number>, slots: readonly SlotPickerSlotView[]): PickerMode => {
  const selectedSlots = slots.filter((slot) => selected.has(slot.startMin))
  if (selectedSlots.length === 0) return 'idle'
  return selectedSlots.some((slot) => slot.status === 'blocked') ? 'release' : 'block'
}

const isDisabled = (slot: SlotPickerSlotView, mode: PickerMode): boolean =>
  slot.status === 'busy' ||
  (mode === 'block' && slot.status === 'blocked') ||
  (mode === 'release' && slot.status === 'free')

const submitText = (mode: PickerMode, count: number): string => {
  if (mode === 'release') return pickerMessages.submitRelease(count)
  if (mode === 'block') return pickerMessages.submitBlock(count)
  return pickerMessages.submitIdle
}

export function SlotPicker({ picker }: SlotPickerProps) {
  const [state, formAction, pending] = useActionState(submitSlots, initialAvailabilityActionState)
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const mode = modeOf(selected, picker.slots)

  useEffect(() => {
    if (state.status === 'ok') setSelected(new Set())
  }, [state])

  const toggle = (startMin: number) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(startMin)) next.delete(startMin)
      else next.add(startMin)
      return next
    })

  const reasonInputId = `pick-reason-${picker.date}`
  return (
    <>
      <div role="status" aria-live="polite" className={state.status === 'ok' ? STYLES.statusOk : undefined}>
        {state.status === 'ok' ? state.message : null}
      </div>
      {picker.slots.length === 0 ? (
        <p className={STYLES.empty}>{pickerMessages.noSlots}</p>
      ) : (
        <form action={formAction} className={STYLES.form}>
          <input type="hidden" name={BLOCK_SLOTS_FIELDS.date} value={picker.date} />
          <input type="hidden" name={INTENT_FIELD} value={mode === 'release' ? 'release' : 'block'} />
          <fieldset className={STYLES.fieldset}>
            <legend className={STYLES.legend}>{pickerMessages.slotsLegend(picker.dateLabel)}</legend>
            <ul className={STYLES.grid}>
              {picker.slots.map((slot) => {
                const slotInputId = `pick-${picker.date}-${slot.startMin}`
                const visual = STATUS_STYLES[slot.status]
                const disabled = isDisabled(slot, mode)
                return (
                  <li key={slot.startMin}>
                    <label
                      htmlFor={slotInputId}
                      className={`${visual.label}${disabled && slot.status !== 'busy' ? ` ${STYLES.slotMuted}` : ''}`}
                    >
                      <input
                        id={slotInputId}
                        type="checkbox"
                        name={BLOCK_SLOTS_FIELDS.slot}
                        value={slot.startMin}
                        checked={selected.has(slot.startMin)}
                        onChange={() => toggle(slot.startMin)}
                        disabled={disabled || pending}
                        className={STYLES.checkbox}
                      />
                      <span className={STYLES.time}>{slot.range}</span>
                      <span className={visual.badge}>{visual.text}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
          {mode !== 'release' && (
            <label htmlFor={reasonInputId} className={STYLES.field}>
              <span className={STYLES.labelText}>{pickerMessages.reasonLabel}</span>
              <input
                id={reasonInputId}
                type="text"
                name={BLOCK_SLOTS_FIELDS.reason}
                maxLength={MAX_MANUAL_BLOCK_REASON_LENGTH}
                className={STYLES.input}
              />
            </label>
          )}
          <div className={STYLES.actions}>
            <button type="submit" className={STYLES.submit} disabled={mode === 'idle' || pending}>
              {submitText(mode, selected.size)}
            </button>
            {selected.size > 0 && (
              <button type="button" className={STYLES.clear} onClick={() => setSelected(new Set())}>
                {pickerMessages.clearSelection}
              </button>
            )}
          </div>
        </form>
      )}
      {state.status !== 'ok' && state.status !== 'idle' && <AvailabilityFeedback state={state} />}
    </>
  )
}
