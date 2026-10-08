import Link from 'next/link'
import { isOk } from '@/shared/result'
import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
} from '../../../../application/techniques/queries'
import { techniqueRepository } from '../../../../db/techniques/technique-repository'
import { catalogMessages } from '../../constants/technique-strings'
import { catalogRoutes } from '../../../routes'
import { adminCatalogPageStyles as STYLES } from './AdminCatalogPage.styles'
import { TechniqueTable } from '../TechniqueTable'
import { TechniqueForm } from '../TechniqueForm'
import type { AdminCatalogPageProps } from './AdminCatalogPage.types'

const adminMessages = catalogMessages.admin

export async function AdminCatalogPage({
  searchParams,
}: AdminCatalogPageProps) {
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
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{adminMessages.title}</h1>
          <p className={STYLES.subtitle}>{adminMessages.subtitle}</p>
        </div>
        {!showForm && (
          <Link href={catalogRoutes.newTechnique} className={STYLES.newTechniqueLink}>
            {adminMessages.newTechnique}
          </Link>
        )}
      </header>

      {showForm && (
        <div className={STYLES.formWrapper}>
          <TechniqueForm technique={editing} />
          <Link href={catalogRoutes.admin} className={STYLES.cancelLink}>
            {catalogMessages.form.cancel}
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <div className={STYLES.emptyBox}>
          <h2 className={STYLES.emptyTitle}>{adminMessages.empty.title}</h2>
          <p className={STYLES.emptyBody}>{adminMessages.empty.body}</p>
          <Link href={catalogRoutes.newTechnique} className={STYLES.emptyCta}>
            {adminMessages.empty.cta}
          </Link>
        </div>
      ) : (
        <TechniqueTable items={page.items} />
      )}
    </main>
  )
}
