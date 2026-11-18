'use client'

import { Fragment, useActionState, useEffect, useId, useRef, useState } from 'react'
import type { AffectedPackage } from '../../../../domain/techniques/errors'
import { catalogMessages } from '../../constants/technique-strings'
import { checkTechniqueReactivationAction, reactivateTechniqueCascadeAction } from '../../actions/technique-actions'
import { initialActionState } from '../../types/technique-action-state'
import { TechniqueFormFeedback } from '../TechniqueFormFeedback'
import { deactivateTechniqueDialogStyles as STYLES } from '../DeactivateTechniqueDialog/DeactivateTechniqueDialog.styles'
import type { ReactivateTechniqueDialogProps } from './ReactivateTechniqueDialog.types'

const reactivateMessages = catalogMessages.form.reactivate
const accessDeniedMessage = catalogMessages.form.accessDenied

type CheckState =
  | { phase: 'checking' }
  | { phase: 'ready'; affectedPackages: AffectedPackage[] }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

export function ReactivateTechniqueDialog({ techniqueId }: ReactivateTechniqueDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [check, setCheck] = useState<CheckState | null>(null)
  const [state, action, pending] = useActionState(reactivateTechniqueCascadeAction, initialActionState)

  useEffect(() => {
    if (state.status === 'ok') {
      setCheck((previous) => (previous?.phase === 'ready' ? { phase: 'done' } : previous))
    }
  }, [state])

  async function open() {
    setCheck({ phase: 'checking' })
    dialogRef.current?.showModal()
    const result = await checkTechniqueReactivationAction(techniqueId)
    if (result.status === 'ok') {
      setCheck({ phase: 'ready', affectedPackages: result.affectedPackages })
    } else if (result.status === 'forbidden') {
      setCheck({ phase: 'error', message: accessDeniedMessage })
    } else {
      setCheck({ phase: 'error', message: reactivateMessages.notFound })
    }
  }

  function close() {
    dialogRef.current?.close()
    setCheck(null)
  }

  return (
    <>
      <button type="button" className={STYLES.openButton} onClick={open}>
        {reactivateMessages.open}
      </button>
      <dialog ref={dialogRef} className={STYLES.dialog} aria-labelledby={titleId}>
        <div className={STYLES.box}>
          <h3 id={titleId} className={STYLES.title}>
            {reactivateMessages.title}
          </h3>

          {check?.phase === 'checking' && <p className={STYLES.checking}>{reactivateMessages.checking}</p>}
          {check?.phase === 'error' && <p className={STYLES.body}>{check.message}</p>}

          {check?.phase === 'ready' && (
            <>
              <p className={STYLES.body}>
                {check.affectedPackages.length === 0
                  ? reactivateMessages.bodySimple
                  : reactivateMessages.bodyWithPackages(
                      check.affectedPackages.map((affectedPackage) => affectedPackage.name),
                    )}
              </p>
              {state.status !== 'ok' && <TechniqueFormFeedback {...state} />}
              <div className={STYLES.actions}>
                <button type="button" className={STYLES.cancelButton} onClick={close}>
                  {reactivateMessages.cancel}
                </button>
                <form action={action}>
                  <input type="hidden" name="id" value={techniqueId} />
                  {check.affectedPackages.map((affectedPackage) => (
                    <Fragment key={affectedPackage.id}>
                      <input type="hidden" name="packageId" value={affectedPackage.id} />
                      <input type="hidden" name="packageName" value={affectedPackage.name} />
                    </Fragment>
                  ))}
                  <button type="submit" className={STYLES.confirmButton} disabled={pending}>
                    {reactivateMessages.confirm}
                  </button>
                </form>
              </div>
            </>
          )}

          {check?.phase === 'done' && (
            <>
              <TechniqueFormFeedback {...state} />
              <div className={STYLES.actions}>
                <button type="button" className={STYLES.cancelButton} onClick={close}>
                  {reactivateMessages.close}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
