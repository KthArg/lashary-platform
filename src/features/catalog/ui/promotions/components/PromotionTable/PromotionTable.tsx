import Link from 'next/link'
import type { PromotionListItem } from '../../../../application/promotions/queries'
import { promotionMessages } from '../../constants/promotion-strings'
import { formatDateTime } from '../../../format'
import { catalogRoutes } from '../../../routes'
import { promotionTableStyles as STYLES } from './PromotionTable.styles'
import type { PromotionTableProps } from './PromotionTable.types'

const adminMessages = promotionMessages.admin

function targetLabel(
  promotion: PromotionListItem,
  techniqueNameById: Map<string, string>,
  packageNameById: Map<string, string>,
): string {
  const name =
    promotion.target.type === 'technique'
      ? techniqueNameById.get(promotion.target.techniqueId) ?? promotion.target.techniqueId
      : packageNameById.get(promotion.target.packageId) ?? promotion.target.packageId
  const kind =
    promotion.target.type === 'technique'
      ? adminMessages.targetType.technique
      : adminMessages.targetType.package
  return `${name} (${kind})`
}

function statusBadge(promotion: PromotionListItem) {
  if (!promotion.isActive) {
    return <span className={STYLES.badgePaused}>{adminMessages.status.paused}</span>
  }
  if (promotion.isCurrentlyActive) {
    return <span className={STYLES.badgeActive}>{adminMessages.status.active}</span>
  }
  return <span className={STYLES.badgeExpired}>{adminMessages.status.expired}</span>
}

export function PromotionTable({ items, techniqueNameById, packageNameById }: PromotionTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            <th>{adminMessages.columns.target}</th>
            <th>{adminMessages.columns.discount}</th>
            <th>{adminMessages.columns.window}</th>
            <th>{adminMessages.columns.status}</th>
            <th>
              <span className={STYLES.srOnly}>{adminMessages.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((promotion) => (
            <tr key={promotion.id}>
              <td className={STYLES.nameCell}>
                {targetLabel(promotion, techniqueNameById, packageNameById)}
              </td>
              <td>
                {promotion.discountPercent}
                {adminMessages.discountSuffix}
              </td>
              <td>
                {formatDateTime(promotion.startsAt)} {adminMessages.windowSeparator}{' '}
                {formatDateTime(promotion.endsAt)}
              </td>
              <td>{statusBadge(promotion)}</td>
              <td className={STYLES.actionsCell}>
                <Link href={catalogRoutes.editPromotion(promotion.id)} className={STYLES.editLink}>
                  {adminMessages.rowActions.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
