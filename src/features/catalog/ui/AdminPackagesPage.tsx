import Link from 'next/link'
import { isOk } from '@/shared/result'
import {
  listPackages as listPackagesUseCase,
  getPackage as getPackageUseCase,
  listTechniques as listTechniquesUseCase,
} from '../application/queries'
import { packageRepository } from '../db/package-repository'
import { techniqueRepository } from '../db/technique-repository'
import { catalogMessages } from './messages'
import { catalogRoutes } from './routes'
import { adminPackagesPageStyles as s } from './AdminPackagesPage.styles'
import { PackageTable } from './PackageTable'
import { PackageForm } from './package-form'

const m = catalogMessages.packages.admin

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
  // El formulario solo ofrece técnicas activas (criterio 1: "técnicas existentes" que hoy se
  // ofrecen); allTechniques se reusa filtrando en vez de pedirla dos veces al repositorio.
  const activeTechniques = allTechniques.items.filter((t) => t.isActive)

  const editResult = params.edit ? await getPackageUseCase(pkgRepo)(params.edit) : null
  const editing = editResult && isOk(editResult) ? editResult.value : undefined
  const showForm = params.new !== undefined || editing !== undefined

  return (
    <main className={s.main}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{m.title}</h1>
          <p className={s.subtitle}>{m.subtitle}</p>
        </div>
        {!showForm && (
          <Link href={catalogRoutes.newPackage} className={s.newPackageLink}>
            {m.newPackage}
          </Link>
        )}
      </header>

      {showForm && (
        <div className={s.formWrapper}>
          <PackageForm pkg={editing} techniques={activeTechniques} />
          <Link href={catalogRoutes.packagesAdmin} className={s.cancelLink}>
            {catalogMessages.packages.form.cancel}
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <div className={s.emptyBox}>
          <h2 className={s.emptyTitle}>{m.empty.title}</h2>
          <p className={s.emptyBody}>{m.empty.body}</p>
          <Link href={catalogRoutes.newPackage} className={s.emptyCta}>
            {m.empty.cta}
          </Link>
        </div>
      ) : (
        <PackageTable items={page.items} techniqueNameById={techniqueNameById} />
      )}
    </main>
  )
}
