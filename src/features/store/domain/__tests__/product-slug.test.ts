import { describe, it, expect } from 'vitest'
import { firstAvailableSlug, slugFromName } from '@/features/store/domain/product-slug'

describe('slugFromName', () => {
  it('pasa el nombre a minúsculas y une las palabras con guiones', () => {
    expect(slugFromName('Serum Nutritivo Lashary')).toBe('serum-nutritivo-lashary')
  })

  it('quita las tildes y cambia la ñ por n', () => {
    expect(slugFromName('Pestañina Ácida Ñandú')).toBe('pestanina-acida-nandu')
  })

  it('cambia símbolos y espacios repetidos por un solo guion, sin guiones en los extremos', () => {
    expect(slugFromName('  ¡Kit 2x1!  (edición   limitada) ')).toBe('kit-2x1-edicion-limitada')
  })

  it('devuelve vacío si el nombre no tiene letras ni números', () => {
    expect(slugFromName('¡¡!!')).toBe('')
  })
})

describe('firstAvailableSlug', () => {
  it('usa el slug base si nadie lo tiene', () => {
    expect(firstAvailableSlug('serum', ['serum-facial'])).toBe('serum')
  })

  it('agrega -2 si el slug base ya está tomado', () => {
    expect(firstAvailableSlug('serum', ['serum'])).toBe('serum-2')
  })

  it('salta los sufijos ya tomados hasta el primero libre', () => {
    expect(firstAvailableSlug('serum', ['serum', 'serum-2', 'serum-3'])).toBe('serum-4')
  })
})
