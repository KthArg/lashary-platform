import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  RECORD_VERSIONS_TABLE,
  UNIQUE_VIOLATION_CODE,
  createSupabaseRecordRepository,
  rowToVersion,
  versionToRow,
} from '../record/record-repository'
import { PRECAUTION_CATEGORIES_TABLE, createSupabaseCategoryLookup } from '../record/precaution-category-repository'
import { RECORD_HISTORY_LIMIT } from '../../application/record/view-record'
import { initialVersion } from '../../application/__tests__/record-fakes'

type FakeResponse = { data: unknown; error: { code?: string; message: string } | null }

function fakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query = {
    select: (...args: unknown[]) => (calls.push(['select', ...args]), query),
    eq: (...args: unknown[]) => (calls.push(['eq', ...args]), query),
    order: (...args: unknown[]) => (calls.push(['order', ...args]), query),
    limit: async (...args: unknown[]) => (calls.push(['limit', ...args]), response),
    maybeSingle: async () => (calls.push(['maybeSingle']), response),
    insert: async (row: unknown) => (calls.push(['insert', row]), response),
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('versionToRow y rowToVersion — la versión ida y vuelta a la base', () => {
  it('una versión guardada y leída vuelve igual', () => {
    const version = initialVersion()
    expect(rowToVersion(versionToRow(version))).toEqual(version)
  })

  it('guarda la técnica en dos columnas y la fecha en UTC', () => {
    const row = versionToRow(initialVersion())
    expect(row.recommended_technique_id).toBe('technique-classic')
    expect(row.recommended_technique_name).toBe('Clásicas')
    expect(row.created_at).toBe('2026-10-17T15:00:00.000Z')
  })

  it('una fila con antecedentes mal formados no se convierte en versión', () => {
    const row = { ...versionToRow(initialVersion()), precautions: [{ id: 'p-1' }] }
    expect(() => rowToVersion(row)).toThrow('antecedente')
  })

  it('una fila cuyo contenido no cumple las reglas del dominio no se convierte en versión', () => {
    const row = { ...versionToRow(initialVersion()), study_text: '   ' }
    expect(() => rowToVersion(row)).toThrow('no es válida')
  })
})

describe('createSupabaseRecordRepository', () => {
  it('lee las versiones de la clienta, de la más nueva a la más vieja y con tope', async () => {
    const { db, calls } = fakeDb({ data: [versionToRow(initialVersion())], error: null })
    const versions = await createSupabaseRecordRepository(db).listVersions('client-1', RECORD_HISTORY_LIMIT)
    expect(versions.map((version) => version.id)).toEqual(['version-1'])
    expect(calls).toContainEqual(['from', RECORD_VERSIONS_TABLE])
    expect(calls).toContainEqual(['eq', 'client_id', 'client-1'])
    expect(calls).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(calls).toContainEqual(['limit', RECORD_HISTORY_LIMIT])
  })

  it('si la lectura falla, lo dice en vez de devolver un expediente vacío', async () => {
    const { db } = fakeDb({ data: null, error: { message: 'caída' } })
    await expect(createSupabaseRecordRepository(db).listVersions('client-1', 1)).rejects.toThrow('no se pudo leer')
  })

  it('inserta la fila de la versión', async () => {
    const { db, calls } = fakeDb({ data: null, error: null })
    const result = await createSupabaseRecordRepository(db).saveVersion(initialVersion())
    expect(isOk(result)).toBe(true)
    expect(calls).toContainEqual(['insert', versionToRow(initialVersion())])
  })

  it('el choque con la versión única de la base llega como version-conflict', async () => {
    const { db } = fakeDb({ data: null, error: { code: UNIQUE_VIOLATION_CODE, message: 'duplicate key' } })
    const result = await createSupabaseRecordRepository(db).saveVersion(initialVersion())
    expect(isErr(result) && result.error).toBe('version-conflict')
  })

  it('otro error al guardar no se confunde con un choque', async () => {
    const { db } = fakeDb({ data: null, error: { code: '42501', message: 'rls' } })
    await expect(createSupabaseRecordRepository(db).saveVersion(initialVersion())).rejects.toThrow('no se pudo guardar')
  })
})

describe('createSupabaseCategoryLookup', () => {
  it('encuentra una categoría por su id', async () => {
    const { db, calls } = fakeDb({ data: { id: 'category-1', name: 'Alergia' }, error: null })
    expect(await createSupabaseCategoryLookup(db).findCategory('category-1')).toEqual({ id: 'category-1', name: 'Alergia' })
    expect(calls).toContainEqual(['from', PRECAUTION_CATEGORIES_TABLE])
  })

  it('una categoría que no existe se lee como null', async () => {
    const { db } = fakeDb({ data: null, error: null })
    expect(await createSupabaseCategoryLookup(db).findCategory('category-x')).toBeNull()
  })
})
