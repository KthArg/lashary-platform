import type { Result } from '@/shared/result'
import type { StoreStorageFailed } from '../../domain/order-errors'
import type { MyLatestOrder, MyOrdersRepository } from './ports'

export const loadMyLatestOrder =
  (repo: MyOrdersRepository) =>
  (): Promise<Result<MyLatestOrder | null, StoreStorageFailed>> =>
    repo.loadMostRecent()
