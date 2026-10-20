import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { toRichText } from '../../../application/rich-text'
import { blogMessages } from '../constants/blog-strings'
import { RichText } from '../components/RichText'

afterEach(cleanup)

const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })
const item = (value: string) => ({ type: 'listItem', content: [paragraph(text(value))] })
const linked = (value: string, href: string) => text(value, [{ type: 'link', attrs: { href } }])

const renderDoc = (...content: unknown[]) =>
  render(<RichText blocks={toRichText({ type: 'doc', content })} />)

describe('RichText — el cuerpo de una publicación (US-BLOG-03, criterio 1)', () => {
  it('conserva la estructura: encabezados, listas, cita, negrita, cursiva y salto de línea', () => {
    const { container } = renderDoc(
      paragraph(text('Con '), text('negrita', [{ type: 'bold' }]), { type: 'hardBreak' }, text('cursiva', [{ type: 'italic' }])),
      { type: 'heading', attrs: { level: 2 }, content: [text('Antes de tu cita')] },
      { type: 'heading', attrs: { level: 3 }, content: [text('El día anterior')] },
      { type: 'bulletList', content: [item('Sin maquillaje'), item('Sin rímel')] },
      { type: 'orderedList', content: [item('Llegar a tiempo')] },
      { type: 'blockquote', content: [paragraph(text('Una clienta por cita.'))] },
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Antes de tu cita' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'El día anterior' })).toBeTruthy()
    const [bullets, numbers] = screen.getAllByRole('list')
    expect(bullets.tagName).toBe('UL')
    expect(within(bullets).getAllByRole('listitem').map((entry) => entry.textContent)).toEqual([
      'Sin maquillaje',
      'Sin rímel',
    ])
    expect(numbers.tagName).toBe('OL')
    expect(screen.getByText('Una clienta por cita.').closest('blockquote')).not.toBeNull()
    expect(screen.getByText('negrita').tagName).toBe('STRONG')
    expect(screen.getByText('cursiva').tagName).toBe('EM')
    expect(container.querySelectorAll('br')).toHaveLength(1)
  })

  it('SEC-009: el texto del CMS se pinta como texto, nunca como HTML', () => {
    const { container } = renderDoc(
      paragraph(text('<script>window.pwned = true</script><img src=x onerror=alert(1)>')),
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText(/<script>window\.pwned = true<\/script>/)).toBeTruthy()
  })

  it('SEC-009: un enlace con un destino no admitido queda como texto', () => {
    const { container } = renderDoc(paragraph(text('Y nunca esto: '), linked('trampa', 'javascript:alert(1)')))

    expect(screen.getByText(/Y nunca esto: trampa/)).toBeTruthy()
    expect(container.querySelector('a')).toBeNull()
  })

  it('UI-004: un enlace externo abre aparte y lo avisa; uno interno no', () => {
    renderDoc(paragraph(linked('WhatsApp', 'https://wa.me/50688887777'), text(' o '), linked('servicios', '/#servicios')))

    const external = screen.getByRole('link', { name: `WhatsApp ${blogMessages.article.newTab}` })
    expect(external.getAttribute('href')).toBe('https://wa.me/50688887777')
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')

    const internal = screen.getByRole('link', { name: 'servicios' })
    expect(internal.getAttribute('href')).toBe('/#servicios')
    expect(internal.getAttribute('target')).toBeNull()
  })

  it('sin bloques no pinta nada dentro', () => {
    const { container } = render(<RichText blocks={[]} />)
    expect(container.firstElementChild?.childElementCount).toBe(0)
  })
})
