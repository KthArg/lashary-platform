import Link from 'next/link'
import { isOk } from '@/shared/result'
import { systemClock } from '@/shared/clock'
import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
} from '../../../../application/techniques/queries'
import {
  listPackages as listPackagesUseCase,
  getPackage as getPackageUseCase,
} from '../../../../application/packages/queries'
import {
  listPromotions as listPromotionsUseCase,
  getPromotion as getPromotionUseCase,
} from '../../../../application/promotions/queries'
import { promotionRepository } from '../../../../db/promotions/promotion-repository'
import { techniqueRepository } from '../../../../db/techniques/technique-repository'
import { packageRepository } from '../../../../db/packages/package-repository'
import { promotionMessages } from '../../constants/promotion-strings'
import { catalogRoutes } from '../../../routes'
import { adminPromotionsPageStyles as STYLES } from './AdminPromotionsPage.styles'
import { PromotionTable } from '../PromotionTable'
import { PromotionForm } from '../PromotionForm'
import { PromotionPagination } from '../PromotionPagination'
import type { AdminPromotionsPageProps } from './AdminPromotionsPage.types'

const adminMessages = promotionMessages.admin

export async function AdminPromotionsPage({ searchParams }: AdminPromotionsPageProps) {
  const params = (await searchParams) ?? {}
  const [promoRepo, techRepo, pkgRepo] = await Promise.all([
    promotionRepository(),
    techniqueRepository(),
    packageRepository(),
  ])

  const now = systemClock.now()

  const [page, activeTechniques, activePackages] = await Promise.all([
    listPromotionsUseCase(promoRepo)(now)({ page: Number(params.page) || 1 }),
    listTechniquesUseCase(techRepo)({ activeOnly: true, pageSize: 100 }),
    listPackagesUseCase(pkgRepo)({ activeOnly: true, pageSize: 100 }),
  ])

  const editResult = params.edit ? await getPromotionUseCase(promoRepo)(params.edit) : null
  const editing = editResult && isOk(editResult) ? editResult.value : undefined
  const showForm = params.new !== undefined || editing !== undefined

  const techniqueNameById = new Map(activeTechniques.items.map((technique) => [technique.id, technique.name]))
  const packageNameById = new Map(activePackages.items.map((pkg) => [pkg.id, pkg.name]))

  // Si la promoción en edición apunta a una técnica/paquete que ya no está activo, se agrega
  // igual al listado del formulario (con su nombre resuelto) para no perder la referencia al
  // guardar — mismo problema que resolvió packages con sus técnicas desactivadas.
  const editingTechnique =
    editing?.target.type === 'technique' && !techniqueNameById.has(editing.target.techniqueId)
      ? await getTechniqueUseCase(techRepo)(editing.target.techniqueId)
      : null
  const editingPackage =
    editing?.target.type === 'package' && !packageNameById.has(editing.target.packageId)
      ? await getPackageUseCase(pkgRepo)(editing.target.packageId)
      : null

  const formTechniques =
    editingTechnique && isOk(editingTechnique)
      ? [...activeTechniques.items, editingTechnique.value]
      : activeTechniques.items
  const formPackages =
    editingPackage && isOk(editingPackage)
      ? [...activePackages.items, editingPackage.value]
      : activePackages.items

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{adminMessages.title}</h1>
          <p className={STYLES.subtitle}>{adminMessages.subtitle}</p>
        </div>
        {!showForm && (
          <Link href={catalogRoutes.newPromotion} className={STYLES.newPromotionLink}>
            {adminMessages.newPromotion}
          </Link>
        )}
      </header>

      {showForm && (
        <div className={STYLES.formWrapper}>
          <PromotionForm promotion={editing} techniques={formTechniques} packages={formPackages} />
          <Link href={catalogRoutes.promotionsAdmin} className={STYLES.cancelLink}>
            {promotionMessages.form.cancel}
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <div className={STYLES.emptyBox}>
          <h2 className={STYLES.emptyTitle}>{adminMessages.empty.title}</h2>
          <p className={STYLES.emptyBody}>{adminMessages.empty.body}</p>
          <Link href={catalogRoutes.newPromotion} className={STYLES.emptyCta}>
            {adminMessages.empty.cta}
          </Link>
        </div>
      ) : (
        <>
          <PromotionTable
            items={page.items}
            techniqueNameById={techniqueNameById}
            packageNameById={packageNameById}
          />
          <PromotionPagination page={page.page} pageSize={page.pageSize} total={page.total} />
        </>
      )}
    </main>
  )
}
