import { schedulingMessages } from '../../messages'
import { availabilityStyles as STYLES } from '../styles/availability.styles'
import type { ClosedDateView, ManualBlockView, WeeklyDayView } from '../utils/availability-format'
import type { SlotPickerView } from '../types/slot-picker.types'
import {
  ClosedDateForm,
  ManualBlockForm,
  RemoveClosedDateButton,
  RemoveManualBlockButton,
  RemoveWeeklyBlockButton,
  WeeklyBlockForm,
} from './AvailabilityForms'
import { ReleaseBlockForm } from './ReleaseBlockForm'
import { SlotPicker } from './SlotPicker'
import { SlotPickerDayForm } from './SlotPickerDayForm'

const availabilityMessages = schedulingMessages.availability

export type AdminAvailabilityViewProps = {
  weeklyDays: WeeklyDayView[]
  closedDates: ClosedDateView[]
  manualBlocks: ManualBlockView[]
  slotPicker: SlotPickerView
}

function Section(props: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={props.id} className={STYLES.section}>
      <div>
        <h2 id={props.id} className={STYLES.sectionTitle}>
          {props.title}
        </h2>
        <p className={STYLES.sectionSubtitle}>{props.subtitle}</p>
      </div>
      {props.children}
    </section>
  )
}

// Vista sin datos propios: recibe las listas ya cargadas y formateadas (UI-003: el vacío de cada
// lista vive aquí; carga y error son loading.tsx y error.tsx de la ruta).
export function AdminAvailabilityView({ weeklyDays, closedDates, manualBlocks, slotPicker }: AdminAvailabilityViewProps) {
  const hasWeekly = weeklyDays.some((day) => day.blocks.length > 0)

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{availabilityMessages.title}</h1>
        <p className={STYLES.subtitle}>{availabilityMessages.subtitle}</p>
      </header>

      <Section id="weekly-title" title={availabilityMessages.weekly.title} subtitle={availabilityMessages.weekly.subtitle}>
        <WeeklyBlockForm />
        {hasWeekly ? (
          <ul className={STYLES.list}>
            {weeklyDays.map((day) => (
              <li key={day.weekday} className={STYLES.dayRow}>
                <span className={STYLES.dayLabel}>{day.label}</span>
                {day.blocks.length === 0 ? (
                  <span className={STYLES.dayClosed}>{availabilityMessages.weekly.noBlocks}</span>
                ) : (
                  <ul className={STYLES.dayBlocks}>
                    {day.blocks.map((block) => (
                      <li key={block.id} className={STYLES.chip}>
                        <span>{block.range}</span>
                        <RemoveWeeklyBlockButton id={block.id} label={availabilityMessages.weekly.removeLabel(day.label, block.range)} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={STYLES.empty}>{availabilityMessages.weekly.empty}</p>
        )}
      </Section>

      <Section id="closed-title" title={availabilityMessages.closed.title} subtitle={availabilityMessages.closed.subtitle}>
        <ClosedDateForm />
        {closedDates.length > 0 ? (
          <ul className={STYLES.list}>
            {closedDates.map((closed) => (
              <li key={closed.id} className={STYLES.row}>
                <div className={STYLES.rowMain}>
                  <span className={STYLES.rowTitle}>{closed.date}</span>
                  <span className={STYLES.rowDetail}>
                    {closed.label ? `${closed.kind} · ${closed.label}` : closed.kind}
                  </span>
                </div>
                <RemoveClosedDateButton id={closed.id} label={availabilityMessages.closed.removeLabel(closed.date)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={STYLES.empty}>{availabilityMessages.closed.empty}</p>
        )}
      </Section>

      <Section id="picker-title" title={availabilityMessages.picker.title} subtitle={availabilityMessages.picker.subtitle}>
        <SlotPickerDayForm date={slotPicker.date} />
        <SlotPicker key={slotPicker.date} picker={slotPicker} />
      </Section>

      <Section id="blocks-title" title={availabilityMessages.blocks.title} subtitle={availabilityMessages.blocks.subtitle}>
        <ManualBlockForm />
        {manualBlocks.length > 0 ? (
          <ul className={STYLES.list}>
            {manualBlocks.map((block) => (
              <li key={block.id} className={STYLES.row}>
                <div className={STYLES.rowMain}>
                  <span className={STYLES.rowTitle}>
                    {block.date} · {block.range}
                  </span>
                  {block.reason && <span className={STYLES.rowDetail}>{block.reason}</span>}
                </div>
                <ReleaseBlockForm
                  id={block.id}
                  label={availabilityMessages.blocks.release.buttonLabel(block.date, block.range)}
                  endsAtIso={block.endsAtIso}
                  releaseEnds={block.releaseEnds}
                />
                <RemoveManualBlockButton
                  id={block.id}
                  label={availabilityMessages.blocks.unblockLabel(block.date, block.range)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className={STYLES.empty}>{availabilityMessages.blocks.empty}</p>
        )}
      </Section>
    </main>
  )
}
