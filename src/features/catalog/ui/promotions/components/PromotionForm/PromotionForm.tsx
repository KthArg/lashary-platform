'use client'

import { useActionState, useState } from 'react'
import { promotionMessages } from '../../constants/promotion-strings'
import {
  createPromotionAction,
  updatePromotionAction,
  deactivatePromotionAction,
} from '../../actions/promotion-actions'
import { initialPromotionActionState } from '../../types/promotion-action-state'
import { promotionFormStyles as STYLES } from './PromotionForm.styles'
import { PromotionFormFeedback } from '../PromotionFormFeedback'
import type { PromotionFormProps } from './PromotionForm.types'

const formMessages = promotionMessages.form
const admin = promotionMessages.admin

function toInputValue(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function PromotionForm({ promotion, techniques, packages }: PromotionFormProps) {
  const editing = promotion !== undefined
  const [state, formAction, pending] = useActionState(
    editing ? updatePromotionAction : createPromotionAction,
    initialPromotionActionState,
  )
  const [deactivateState, deactivateAction, deactivating] = useActionState(
    deactivatePromotionAction,
    initialPromotionActionState,
  )

  const [targetType, setTargetType] = useState<'technique' | 'package'>(
    promotion?.target.type ?? 'technique',
  )

  const targetId =
    promotion?.target.type === 'technique'
      ? promotion.target.techniqueId
      : promotion?.target.type === 'package'
        ? promotion.target.packageId
        : undefined

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{editing ? formMessages.legendEdit : formMessages.legendCreate}</h2>

      <PromotionFormFeedback {...state} />

      <form action={formAction} className={STYLES.form}>
        {editing && <input type="hidden" name="id" value={promotion.id} />}

        <fieldset className={STYLES.targetTypeFieldset}>
          <legend className={STYLES.labelText}>{formMessages.fields.targetType}</legend>
          <div className={STYLES.targetTypeOptions}>
            <label className={STYLES.radioOption}>
              <input
                type="radio"
                name="targetType"
                value="technique"
                checked={targetType === 'technique'}
                onChange={() => setTargetType('technique')}
                className={STYLES.radio}
              />
              <span>{admin.targetType.technique}</span>
            </label>
            <label className={STYLES.radioOption}>
              <input
                type="radio"
                name="targetType"
                value="package"
                checked={targetType === 'package'}
                onChange={() => setTargetType('package')}
                className={STYLES.radio}
              />
              <span>{admin.targetType.package}</span>
            </label>
          </div>
        </fieldset>

        {targetType === 'technique' ? (
          <label className={STYLES.fieldLabel} htmlFor="targetId-technique">
            <span className={STYLES.labelText}>{formMessages.fields.targetTechnique}</span>
            <select
              id="targetId-technique"
              name="targetId"
              required
              defaultValue={targetId}
              className={STYLES.fieldSelect}
            >
              <option value="" disabled>
                {formMessages.fields.selectPlaceholder}
              </option>
              {techniques.map((technique) => (
                <option key={technique.id} value={technique.id}>
                  {technique.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={STYLES.fieldLabel} htmlFor="targetId-package">
            <span className={STYLES.labelText}>{formMessages.fields.targetPackage}</span>
            <select
              id="targetId-package"
              name="targetId"
              required
              defaultValue={targetId}
              className={STYLES.fieldSelect}
            >
              <option value="" disabled>
                {formMessages.fields.selectPlaceholder}
              </option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={STYLES.fieldLabel} htmlFor="discountPercent">
          <span className={STYLES.labelText}>{formMessages.fields.discountPercent}</span>
          <input
            id="discountPercent"
            name="discountPercent"
            type="number"
            min={1}
            max={100}
            step={1}
            required
            defaultValue={promotion?.discountPercent}
            className={STYLES.fieldInput}
          />
        </label>

        <label className={STYLES.fieldLabel} htmlFor="startsAt">
          <span className={STYLES.labelText}>{formMessages.fields.startsAt}</span>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toInputValue(promotion?.startsAt)}
            className={STYLES.fieldInput}
          />
        </label>

        <label className={STYLES.fieldLabel} htmlFor="endsAt">
          <span className={STYLES.labelText}>{formMessages.fields.endsAt}</span>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={toInputValue(promotion?.endsAt)}
            className={STYLES.fieldInput}
          />
        </label>

        <div className={STYLES.submitWrapper}>
          <button type="submit" className={STYLES.submitButton} disabled={pending}>
            {editing ? formMessages.submitEdit : formMessages.submitCreate}
          </button>
        </div>
      </form>

      {editing && (
        <form action={deactivateAction} className={STYLES.deactivateForm}>
          <input type="hidden" name="id" value={promotion.id} />
          <PromotionFormFeedback {...deactivateState} />
          <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
            {admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
