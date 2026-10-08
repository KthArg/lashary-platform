import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { Faq } from '@/features/content'
import { FAQ_SECTION, LandingFaq, landingMessages } from '@/features/landing'

afterEach(cleanup)

const faqs: Faq[] = [
  { question: '¿Cuánto duran las extensiones?', paragraphs: ['Entre tres y cuatro semanas.'] },
  { question: '¿Dañan la pestaña natural?', paragraphs: ['No, si el peso es el correcto.', 'Por eso reviso antes.'] },
]

const buttonByName = (name: string) => screen.getByRole('button', { name })
const panelOf = (button: HTMLElement) =>
  document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement

describe('LandingFaq — Preguntas (plegada a US-LAND-07)', () => {
  it('cada pregunta es un encabezado con su botón, y la primera empieza abierta', () => {
    render(<LandingFaq faqs={faqs} />)

    expect(screen.getByRole('heading', { level: 2, name: landingMessages.faq.title })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      '¿Cuánto duran las extensiones?+',
      '¿Dañan la pestaña natural?+',
    ])
    expect(buttonByName('¿Cuánto duran las extensiones?').getAttribute('aria-expanded')).toBe('true')
    expect(buttonByName('¿Dañan la pestaña natural?').getAttribute('aria-expanded')).toBe('false')
  })

  it('cada pregunta se abre y se cierra por su cuenta, con la respuesta en párrafos', () => {
    render(<LandingFaq faqs={faqs} />)
    const secondButton = buttonByName('¿Dañan la pestaña natural?')

    fireEvent.click(secondButton)
    expect(secondButton.getAttribute('aria-expanded')).toBe('true')
    expect(panelOf(secondButton).hidden).toBe(false)
    expect(panelOf(secondButton).querySelectorAll('p')).toHaveLength(2)
    expect(buttonByName('¿Cuánto duran las extensiones?').getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(secondButton)
    expect(secondButton.getAttribute('aria-expanded')).toBe('false')
    expect(panelOf(secondButton).hidden).toBe(true)
  })

  it('UI-004: aria-controls apunta a un panel real, esté abierto o cerrado', () => {
    render(<LandingFaq faqs={faqs} />)
    for (const button of screen.getAllByRole('button')) {
      expect(panelOf(button)).toBeTruthy()
    }
  })

  it('la sección lleva el ancla que usa la navegación', () => {
    const { container } = render(<LandingFaq faqs={faqs} />)
    expect(container.querySelector(`section#${FAQ_SECTION.id}`)).toBeTruthy()
  })
})
