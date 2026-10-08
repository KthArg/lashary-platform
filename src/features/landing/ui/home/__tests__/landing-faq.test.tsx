import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import type { Faq } from '@/features/content'
import { FAQ_SECTION, LandingFaq, landingMessages } from '@/features/landing'

afterEach(cleanup)

// Las preguntas tal como las entrega `getContact()`, con la respuesta en párrafos.
const preguntas: Faq[] = [
  { question: '¿Cuánto duran las extensiones?', paragraphs: ['Entre tres y cuatro semanas.'] },
  { question: '¿Dañan la pestaña natural?', paragraphs: ['No, si el peso es el correcto.', 'Por eso reviso antes.'] },
]

const boton = (name: string) => screen.getByRole('button', { name })
const panelDe = (button: HTMLElement) =>
  document.getElementById(button.getAttribute('aria-controls') ?? '') as HTMLElement

describe('LandingFaq — Preguntas (plegada a US-LAND-07)', () => {
  it('cada pregunta es un encabezado con su botón, y la primera empieza abierta', () => {
    render(<LandingFaq faqs={preguntas} />)

    expect(screen.getByRole('heading', { level: 2, name: landingMessages.faq.title })).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      '¿Cuánto duran las extensiones?+',
      '¿Dañan la pestaña natural?+',
    ])
    expect(boton('¿Cuánto duran las extensiones?').getAttribute('aria-expanded')).toBe('true')
    expect(boton('¿Dañan la pestaña natural?').getAttribute('aria-expanded')).toBe('false')
  })

  it('cada pregunta se abre y se cierra por su cuenta, con la respuesta en párrafos', () => {
    render(<LandingFaq faqs={preguntas} />)
    const segunda = boton('¿Dañan la pestaña natural?')

    fireEvent.click(segunda)
    expect(segunda.getAttribute('aria-expanded')).toBe('true')
    expect(panelDe(segunda).hidden).toBe(false)
    expect(panelDe(segunda).querySelectorAll('p')).toHaveLength(2)
    // Abrir la segunda no cierra la primera.
    expect(boton('¿Cuánto duran las extensiones?').getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(segunda)
    expect(segunda.getAttribute('aria-expanded')).toBe('false')
    expect(panelDe(segunda).hidden).toBe(true)
  })

  it('UI-004: aria-controls apunta a un panel real, esté abierto o cerrado', () => {
    render(<LandingFaq faqs={preguntas} />)
    for (const button of screen.getAllByRole('button')) {
      expect(panelDe(button)).toBeTruthy()
    }
  })

  it('la sección lleva el ancla que usa la navegación', () => {
    const { container } = render(<LandingFaq faqs={preguntas} />)
    expect(container.querySelector(`section#${FAQ_SECTION.id}`)).toBeTruthy()
  })
})
