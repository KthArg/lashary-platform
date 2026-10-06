'use client'

import { useActionState } from 'react'
import type { AdminProduct } from '../../../domain/product'
import { mensajesAdminProductos } from '../constants/product-strings'
import {
  crearProductoAction,
  actualizarProductoAction,
  desactivarProductoAction,
} from '../actions/product-actions'
import { estadoAccionInicial } from '../types/product-action-state'

export type ModoFormularioProducto = 'crear' | 'editar'

export function useFormularioProductoAdmin(producto?: AdminProduct) {
  const modo: ModoFormularioProducto = producto !== undefined ? 'editar' : 'crear'
  const f = mensajesAdminProductos.form

  const [state, formAction, pending] = useActionState(
    modo === 'editar' ? actualizarProductoAction : crearProductoAction,
    estadoAccionInicial,
  )
  const [deactivateState, deactivateAction, deactivating] = useActionState(
    desactivarProductoAction,
    estadoAccionInicial,
  )

  const textosPorModo: Record<ModoFormularioProducto, { heading: string; submitLabel: string }> = {
    crear: { heading: f.legendCreate, submitLabel: f.submitCreate },
    editar: { heading: f.legendEdit, submitLabel: f.submitEdit },
  }

  return {
    modo,
    heading: textosPorModo[modo].heading,
    submitLabel: textosPorModo[modo].submitLabel,
    state,
    formAction,
    pending,
    deactivateState,
    deactivateAction,
    deactivating,
  }
}
