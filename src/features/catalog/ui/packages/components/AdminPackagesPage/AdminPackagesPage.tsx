import Link from 'next/link'
import { isOk } from '@/shared/result'
import { listTechniques as listTechniquesUseCase } from '../../../../application/queries'
import {
  listPackages as listPackagesUseCase,
  getPackage as getPackageUseCase,
  listPackageTechniques as listPackageTechniquesUseCase,
} from '../../../../application/packages/queries'
import { packageRepository } from '../../../../db/packages/package-repository'
import { techniqueRepository } from '../../../../db/technique-repository'
import { packageMessages } from '../../constants/package-strings'
import { catalogRoutes } from '../../../routes'
import { adminPackagesPageStyles as STYLES } from './AdminPackagesPage.styles'
import { PackageTable } from '../PackageTable'
import { PackageForm } from '../PackageForm'
import { PackagePagination } from '../PackagePagination'
import type { AdminPackagesPageProps } from './AdminPackagesPage.types'

const m = packageMessages.admin

export async function AdminPackagesPage({ searchParams }: AdminPackagesPageProps) {
  const params = (await searchParams) ?? {}
  const [pkgRepo, techRepo] = await Promise.all([packageRepository(), techniqueRepository()])

  const [page, activeTechniques] = await Promise.all([
    listPackagesUseCase(pkgRepo)({ activeOnly: false, page: Number(params.page) || 1 }),
    listTechniquesUseCase(techRepo)({ activeOnly: true, pageSize: 100 }),
  ])

  const editResult = params.edit ? await getPackageUseCase(pkgRepo)(params.edit) : null
  const editing = editResult && isOk(editResult) ? editResult.value : undefined
  const showForm = params.new !== undefined || editing !== undefined

  const memberTechniques = await listPackageTechniquesUseCase(techRepo)(
    editing ? [...page.items, editing] : page.items,
  )
  const techniqueNameById = new Map(memberTechniques.map((t) => [t.id, t.name]))
  const inactiveTechniqueIds = new Set(
    memberTechniques.filter((t) => !t.isActive).map((t) => t.id),
  )
  const formTechniques = [
    ...activeTechniques.items,
    ...memberTechniques.filter((t) => !t.isActive && editing?.techniqueIds.includes(t.id)),
  ]

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{m.title}</h1>
          <p className={STYLES.subtitle}>{m.subtitle}</p>
        </div>
        {!showForm && (
          <Link href={catalogRoutes.newPackage} className={STYLES.newPackageLink}>
            {m.newPackage}
          </Link>
        )}
      </header>

      {showForm && (
        <div className={STYLES.formWrapper}>
          <PackageForm pkg={editing} techniques={formTechniques} />
          <Link href={catalogRoutes.packagesAdmin} className={STYLES.cancelLink}>
            {packageMessages.form.cancel}
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <div className={STYLES.emptyBox}>
          <h2 className={STYLES.emptyTitle}>{m.empty.title}</h2>
          <p className={STYLES.emptyBody}>{m.empty.body}</p>
          <Link href={catalogRoutes.newPackage} className={STYLES.emptyCta}>
            {m.empty.cta}
          </Link>
        </div>
      ) : (
        <>
          <PackageTable
            items={page.items}
            techniqueNameById={techniqueNameById}
            inactiveTechniqueIds={inactiveTechniqueIds}
          />
          <PackagePagination page={page.page} pageSize={page.pageSize} total={page.total} />
        </>
      )}
    </main>
  )
}
