import Link from 'next/link'
import { isOk } from '@/shared/result'
import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
} from '../application/queries'
import { techniqueRepository } from '../db/technique-repository'
import { catalogMessages } from './messages'
import { catalogRoutes } from './routes'
import { adminCatalogPageStyles as s } from './AdminCatalogPage.styles'
import { TechniqueTable } from './TechniqueTable'
import { TechniqueForm } from './technique-form'

const m = catalogMessages.admin

type SearchParams = { edit?: string; new?: string }

export async function AdminCatalogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const repo = await techniqueRepository()

  const page = await listTechniquesUseCase(repo)({
    activeOnly: false,
    pageSize: 100,
  })

  const editResult = params.edit
    ? await getTechniqueUseCase(repo)(params.edit)
    : null
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
          <Link href={catalogRoutes.newTechnique} className={s.newTechniqueLink}>
            {m.newTechnique}
          </Link>
        )}
      </header>

      {showForm && (
        <div className={s.formWrapper}>
          <TechniqueForm technique={editing} />
          <Link href={catalogRoutes.admin} className={s.cancelLink}>
            {catalogMessages.form.cancel}
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <div className={s.emptyBox}>
          <h2 className={s.emptyTitle}>{m.empty.title}</h2>
          <p className={s.emptyBody}>{m.empty.body}</p>
          <Link href={catalogRoutes.newTechnique} className={s.emptyCta}>
            {m.empty.cta}
          </Link>
        </div>
      ) : (
        <TechniqueTable items={page.items} />
      )}
    </main>
  )
}
