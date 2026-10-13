import { schedulingMessages } from './messages'
import { TechniqueSelector } from './TechniqueSelector'
import { clientTechniqueSelectionPageStyles as s } from './ClientTechniqueSelectionPage.styles'
import type { TechniqueSelectionPageData } from './load-technique-selection-page'

const m = schedulingMessages.page

export function TechniqueSelectionPageView({ data }: { data: TechniqueSelectionPageData }) {
  if (data.status === 'forbidden') {
    return (
      <div role="alert" className={s.errorBox}>
        {schedulingMessages.selector.accessDenied}
      </div>
    )
  }

  return (
    <div className={s.wrapper}>
      <div className={s.header}>
        <h1 className={s.title}>{m.title}</h1>
        <p className={s.subtitle}>{m.subtitle}</p>
      </div>

      {data.techniques.length === 0 ? (
        <div className={s.emptyBox}>{m.empty}</div>
      ) : (
        <TechniqueSelector techniques={data.techniques} />
      )}
    </div>
  )
}
