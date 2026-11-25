import { formatMoney, moneyFromColones } from '@/shared/money'
import { myOrdersMessages } from '../../constants/my-orders-strings'
import { loadMyLatestOrderData } from './MyOrderNotice.data'
import { myOrderNoticeStyles as STYLES } from './MyOrderNotice.styles'

export async function MyOrderNotice() {
  const order = await loadMyLatestOrderData()
  if (order === null) return null

  const totalLabel = formatMoney(moneyFromColones(order.totalColones))
  if (order.state === 'rejected') {
    return (
      <div role="status" className={STYLES.error}>
        {myOrdersMessages.rejected(totalLabel, order.rejectionReason ?? '')}
      </div>
    )
  }

  const message = order.state === 'pending_approval' ? myOrdersMessages.pending(totalLabel) : myOrdersMessages.approved(totalLabel)
  return (
    <div role="status" className={STYLES.ok}>
      {message}
    </div>
  )
}
