import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Feedback } from '../Feedback'

describe('Feedback — despacho por status', () => {
  it('no renderiza nada en idle', () => {
    const html = renderToStaticMarkup(<Feedback status="idle" />)
    expect(html).toBe('')
  })

  it('renderiza el mensaje de éxito con role status en ok', () => {
    const html = renderToStaticMarkup(<Feedback status="ok" message="Producto creado." />)
    expect(html).toContain('role="status"')
    expect(html).toContain('Producto creado.')
  })

  it('renderiza el mensaje de acceso denegado con role alert en forbidden', () => {
    const html = renderToStaticMarkup(<Feedback status="forbidden" message="Sin permisos." />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Sin permisos.')
  })

  it('renderiza la lista de problemas con role alert en invalid', () => {
    const html = renderToStaticMarkup(
      <Feedback status="invalid" problems={['el slug no puede estar vacío']} />,
    )
    expect(html).toContain('role="alert"')
    expect(html).toContain('el slug no puede estar vacío')
  })

  it('no falla cuando invalid llega sin problems', () => {
    const html = renderToStaticMarkup(<Feedback status="invalid" />)
    expect(html).toContain('role="alert"')
  })
})
