'use client'

import { forwardRef } from 'react'
import { CLIENTS_BUTTON_TEXTS } from '../../constants/clients-strings'
import { addClientButtonStyles as STYLES } from './AddClientButton.styles'
import type { AddClientButtonProps } from './AddClientButton.types'

/** Expone su ref para que el dialogo devuelva aqui el foco al cerrarse (UI-004). */
export const AddClientButton = forwardRef<HTMLButtonElement, AddClientButtonProps>(
  function AddClientButton({ onClick }, ref) {
    return <button ref={ref} type="button" onClick={onClick} className={STYLES.button}>{CLIENTS_BUTTON_TEXTS.addClient}</button>
  },
)
