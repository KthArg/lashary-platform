import { RECORD_LABELS } from '../../constants/record-strings'
import { describeVersion, formatRecordDate } from '../../record-history'
import { StudyEditor } from '../StudyEditor'
import { recordViewStyles as STYLES } from './RecordView.styles'
import type { RecordViewProps } from './RecordView.types'

export function RecordView({ clientId, current, history, techniques }: RecordViewProps) {
  if (current === null) return <StudyEditor clientId={clientId} study={null} techniques={techniques} />

  const initial = history.find((version) => version.changeKind === 'initial')
  const { images, precautions, recommendedTechnique, studyText } = current

  return (
    <article className={STYLES.record}>
      <header className={STYLES.header}>
        <h2 className={STYLES.title}>{RECORD_LABELS.studyHeading}</h2>
        {initial ? <p className={STYLES.subtitle}>{RECORD_LABELS.initialRecordOn(formatRecordDate(initial.createdAt))}</p> : null}
      </header>

      <section className={STYLES.section}>
        <h3 className={STYLES.sectionTitle}>{RECORD_LABELS.initialStudyHeading}</h3>
        <StudyEditor clientId={clientId} study={{ studyText, recommendedTechnique }} techniques={techniques} />
      </section>

      <section className={STYLES.section}>
        <h3 className={STYLES.sectionTitle}>{RECORD_LABELS.precautionsHeading}</h3>
        {precautions.length === 0 ? (
          <p className={STYLES.muted}>{RECORD_LABELS.noPrecautions}</p>
        ) : (
          <ul className={STYLES.list}>
            {precautions.map((precaution) => (
              <li key={precaution.id} className={STYLES.precaution}>
                <span className={STYLES.label}>{precaution.categoryName}</span>
                <span>{precaution.description}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={STYLES.section}>
        <h3 className={STYLES.sectionTitle}>{RECORD_LABELS.imagesHeading}</h3>
        <p className={STYLES.muted}>{images.length === 0 ? RECORD_LABELS.noImages : RECORD_LABELS.imagesCount(images.length)}</p>
      </section>

      <section className={STYLES.section}>
        <h3 className={STYLES.sectionTitle}>{RECORD_LABELS.historyHeading}</h3>
        <ol className={STYLES.list}>
          {history.map((version, index) => (
            <li key={version.id} className={STYLES.historyItem}>
              <time dateTime={version.createdAt} className={STYLES.label}>{formatRecordDate(version.createdAt)}</time>
              <span>{describeVersion(version, history[index + 1])}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}
