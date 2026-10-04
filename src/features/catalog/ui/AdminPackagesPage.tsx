import Link from 'next/link'
import { listPackages as listPackagesUseCase, listTechniques as listTechniquesUseCase } from '../application/queries'
import { packageRepository } from '../db/package-repository'
import { techniqueRepository } from '../db/technique-repository'
import { catalogMessages } from './messages'
import { catalogRoutes } from './routes'
import { adminPackagesPageStyles as s } from './AdminPackagesPage.styles'
import { PackageTable } from './PackageTable'

const m = catalogMessages.packages.admin

// Nota: el formulario de creación/edición (?new / ?edit) se cablea en la pieza 9
// (ui/package-form.tsx) — por ahora esta página solo lista.
export async function AdminPackagesPage() {
  const [pkgRepo, techRepo] = await Promise.all([packageRepository(), techniqueRepository()])

  const [page, techniques] = await Promise.all([
    listPackagesUseCase(pkgRepo)({ activeOnly: false, pageSize: 100 }),
    listTechniquesUseCase(techRepo)({ activeOnly: false, pageSize: 100 }),
  ])

  const techniqueNameById = new Map(techniques.items.map((t) => [t.id, t.name]))

  return (
    <main className={s.main}>
      <header className={s.header}>
        <div>
          <h1 className={s.title}>{m.title}</h1>
          <p className={s.subtitle}>{m.subtitle}</p>
        </div>
        <Link href={catalogRoutes.newPackage} className={s.newPackageLink}>
          {m.newPackage}
        </Link>
      </header>

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
