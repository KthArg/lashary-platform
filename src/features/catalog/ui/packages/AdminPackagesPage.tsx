import Link from 'next/link'
import { isOk } from '@/shared/result'
import { listTechniques as listTechniquesUseCase } from '../../application/queries'
import {
  listPackages as listPackagesUseCase,
  getPackage as getPackageUseCase,
} from '../../application/packages/queries'
import { packageRepository } from '../../db/packages/package-repository'
import { techniqueRepository } from '../../db/technique-repository'
import { packageMessages } from './messages'
import { catalogRoutes } from '../routes'
import { adminPackagesPageStyles as STYLES } from './AdminPackagesPage.styles'
import { PackageTable } from './PackageTable'
import { PackageForm } from './package-form'

const m = packageMessages.admin

type SearchParams = { edit?: string; new?: string }

export async function AdminPackagesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const [pkgRepo, techRepo] = await Promise.all([packageRepository(), techniqueRepository()])

  const [page, allTechniques] = await Promise.all([
    listPackagesUseCase(pkgRepo)({ activeOnly: false, pageSize: 100 }),
    listTechniquesUseCase(techRepo)({ activeOnly: false, pageSize: 100 }),
  ])

  const techniqueNameById = new Map(allTechniques.items.map((t) => [t.id, t.name]))
  const activeTechniques = allTechniques.items.filter((t) => t.isActive)

  const editResult = params.edit ? await getPackageUseCase(pkgRepo)(params.edit) : null
  const editing = editResult && isOk(editResult) ? editResult.value : undefined
  const showForm = params.new !== undefined || editing !== undefined

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
          <PackageForm pkg={editing} techniques={activeTechniques} />
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
        <PackageTable items={page.items} techniqueNameById={techniqueNameById} />
      )}
    </main>
  )
}
