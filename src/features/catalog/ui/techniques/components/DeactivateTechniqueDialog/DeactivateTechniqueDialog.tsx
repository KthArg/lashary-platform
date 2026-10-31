'use client'

import { Fragment, useActionState, useEffect, useId, useRef, useState } from 'react'
import type { AffectedPackage } from '../../../../domain/techniques/errors'
import { catalogMessages } from '../../constants/technique-strings'
import { checkTechniqueDeactivationAction, deactivateTechniqueCascadeAction } from '../../actions/technique-actions'
import { initialActionState } from '../../types/technique-action-state'
import { TechniqueFormFeedback } from '../TechniqueFormFeedback'
import { deactivateTechniqueDialogStyles as STYLES } from './DeactivateTechniqueDialog.styles'
import type { DeactivateTechniqueDialogProps } from './DeactivateTechniqueDialog.types'

const deactivateMessages = catalogMessages.form.deactivate
const accessDeniedMessage = catalogMessages.form.accessDenied

type CheckState =
  | { phase: 'checking' }
  | { phase: 'ready'; affectedPackages: AffectedPackage[] }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

export function DeactivateTechniqueDialog({ techniqueId }: DeactivateTechniqueDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [check, setCheck] = useState<CheckState | null>(null)
  const [state, action, pending] = useActionState(deactivateTechniqueCascadeAction, initialActionState)

  // La confirmación llegó y tuvo éxito: se queda mostrando el mensaje hasta que la usuaria cierre,
  // en vez de cerrar el diálogo sola y perder el "junto con el paquete X" (state solo se resetea
  // al reabrir, no solo).
  useEffect(() => {
    if (state.status === 'ok') {
      setCheck((previous) => (previous?.phase === 'ready' ? { phase: 'done' } : previous))
    }
  }, [state])

  async function open() {
    setCheck({ phase: 'checking' })
    dialogRef.current?.showModal()
    const result = await checkTechniqueDeactivationAction(techniqueId)
    if (result.status === 'ok') {
      setCheck({ phase: 'ready', affectedPackages: result.affectedPackages })
    } else if (result.status === 'forbidden') {
      setCheck({ phase: 'error', message: accessDeniedMessage })
    } else {
      setCheck({ phase: 'error', message: deactivateMessages.notFound })
    }
  }

  function close() {
    dialogRef.current?.close()
    setCheck(null)
  }

  return (
    <>
      <button type="button" className={STYLES.openButton} onClick={open}>
        {deactivateMessages.open}
      </button>
      <dialog ref={dialogRef} className={STYLES.dialog} aria-labelledby={titleId}>
        <div className={STYLES.box}>
          <h3 id={titleId} className={STYLES.title}>
            {deactivateMessages.title}
          </h3>

          {check?.phase === 'checking' && <p className={STYLES.checking}>{deactivateMessages.checking}</p>}
          {check?.phase === 'error' && <p className={STYLES.body}>{check.message}</p>}

          {check?.phase === 'ready' && (
            <>
              <p className={STYLES.body}>
                {check.affectedPackages.length === 0
                  ? deactivateMessages.bodySimple
                  : deactivateMessages.bodyWithPackages(check.affectedPackages.map((pkg) => pkg.name))}
              </p>
              {state.status !== 'ok' && <TechniqueFormFeedback {...state} />}
              <div className={STYLES.actions}>
                <button type="button" className={STYLES.cancelButton} onClick={close}>
                  {deactivateMessages.cancel}
                </button>
                <form action={action}>
                  <input type="hidden" name="id" value={techniqueId} />
                  {check.affectedPackages.map((pkg) => (
                    <Fragment key={pkg.id}>
                      <input type="hidden" name="packageId" value={pkg.id} />
                      <input type="hidden" name="packageName" value={pkg.name} />
                    </Fragment>
                  ))}
                  <button type="submit" className={STYLES.confirmButton} disabled={pending}>
                    {deactivateMessages.confirm}
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
                  {deactivateMessages.close}
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
