export type EstadoAccionProducto = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const estadoAccionInicial: EstadoAccionProducto = { status: 'idle' }
