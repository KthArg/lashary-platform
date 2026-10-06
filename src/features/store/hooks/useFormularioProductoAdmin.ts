'use client'

import { useActionState } from 'react'
import { ORDEN_MINIMO, type ProductoAdminVista } from '../domain/producto'
import { mensajesAdminProductos } from '../constants/mensajes-admin-productos'
import {
  crearProductoAction,
  actualizarProductoAction,
  desactivarProductoAction,
} from '../actions/productos-admin-actions'
import { estadoAccionInicial } from '../actions/estado-accion-producto'

export type ModoFormularioProducto = 'crear' | 'editar'

export type ValoresInicialesProducto = {
  slug?: string
  nombre?: string
  urlImagen?: string
  precioCrc?: number
  ordenPresentacion: number
  descripcion?: string
}

export function useFormularioProductoAdmin(producto?: ProductoAdminVista) {
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

  const productoId = producto?.id ?? ''
  const valoresIniciales: ValoresInicialesProducto = {
    slug: producto?.slug,
    nombre: producto?.nombre,
    urlImagen: producto?.urlImagen,
    precioCrc: producto?.precioCrc,
    ordenPresentacion: producto?.ordenPresentacion ?? ORDEN_MINIMO,
    descripcion: producto?.descripcion,
  }

  return {
    modo,
    heading: textosPorModo[modo].heading,
    submitLabel: textosPorModo[modo].submitLabel,
    productoId,
    valoresIniciales,
    state,
    formAction,
    pending,
    deactivateState,
    deactivateAction,
    deactivating,
  }
}
