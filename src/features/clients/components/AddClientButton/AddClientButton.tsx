'use client'

import { CLIENTS_BUTTON_TEXTS } from '../../constants/clients-strings'
import { addClientButtonStyles as s } from './AddClientButton.styles'
import type { AddClientButtonProps } from './AddClientButton.types'

export function AddClientButton({ onClick }: AddClientButtonProps) {
  return <button type="button" onClick={onClick} className={s.button}>{CLIENTS_BUTTON_TEXTS.addClient}</button>
}
