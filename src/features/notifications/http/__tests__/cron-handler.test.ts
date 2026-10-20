import { describe, it, expect } from 'vitest'
import { isAuthorizedCronRequest } from '../cron-handler'

describe('isAuthorizedCronRequest', () => {
  it('autoriza cuando el header coincide con el secreto configurado', () => {
    expect(isAuthorizedCronRequest({ authorizationHeader: 'Bearer abc123', secret: 'abc123' })).toBe(true)
  })

  it('rechaza si no hay secreto configurado, aunque el header venga', () => {
    expect(isAuthorizedCronRequest({ authorizationHeader: 'Bearer abc123', secret: undefined })).toBe(false)
  })

  it('rechaza si el header no coincide', () => {
    expect(isAuthorizedCronRequest({ authorizationHeader: 'Bearer otro', secret: 'abc123' })).toBe(false)
  })

  it('rechaza si no hay header', () => {
    expect(isAuthorizedCronRequest({ authorizationHeader: null, secret: 'abc123' })).toBe(false)
  })
})
