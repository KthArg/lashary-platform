import Link from 'next/link'
import { isOk } from '@/shared/result'
import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
} from '../application/queries'
import { techniqueRepository } from '../db/technique-repository'
import { catalogMessages } from './messages'
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
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">{m.title}</h1>
          <p className="text-sm text-base-content/70">{m.subtitle}</p>
        </div>
        {!showForm && (
          <Link href="/admin/catalog?new" className="btn btn-primary btn-sm">
            {m.newTechnique}
          </Link>
        )}
      </header>

      {showForm && (
        <div className="rounded-box border border-base-300 p-6">
          <TechniqueForm technique={editing} />
          <Link href="/admin/catalog" className="btn btn-ghost btn-sm mt-4">
            {catalogMessages.form.cancel}
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <div className="rounded-box border border-base-300 p-10 text-center">
          <h2 className="font-serif text-lg">{m.empty.title}</h2>
          <p className="mt-2 text-sm text-base-content/70">{m.empty.body}</p>
          <Link href="/admin/catalog?new" className="btn btn-primary btn-sm mt-4">
            {m.empty.cta}
          </Link>
        </div>
      ) : (
        <TechniqueTable items={page.items} />
      )}
    </main>
  )
}
