import { clientCalendarMessages } from '../../constants/client-calendar-strings'
import { DayNavigator } from '../DayNavigator'
import { ServicePicker } from '../ServicePicker'
import { SlotList } from '../SlotList'
import { clientCalendarViewStyles as STYLES } from './ClientCalendarView.styles'
import type { ClientCalendarViewProps } from './ClientCalendarView.types'

function CalendarBody({ view }: ClientCalendarViewProps) {
  const copy = clientCalendarMessages

  switch (view.status) {
    case 'forbidden':
      return (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.accessDenied}</span>
        </div>
      )
    case 'noServices':
      return <p className={STYLES.empty}>{copy.noServices}</p>
    case 'chooseService':
      return (
        <section className={STYLES.card}>
          <ServicePicker picker={view.picker} />
          <p className={STYLES.empty}>{copy.chooseService}</p>
        </section>
      )
    case 'invalid':
      return (
        <section className={STYLES.card}>
          <ServicePicker picker={view.picker} />
          <DayNavigator day={view.day} />
          <div role="alert" className={STYLES.alertError}>
            <span>{copy.invalid}</span>
          </div>
        </section>
      )
    case 'ready':
      return (
        <section className={STYLES.card}>
          <ServicePicker picker={view.picker} />
          <DayNavigator day={view.day} />
          <SlotList slots={view.slots} serviceKey={view.picker.selectedKey ?? ''} date={view.picker.date} />
        </section>
      )
  }
}

export function ClientCalendarView({ view }: ClientCalendarViewProps) {
  const copy = clientCalendarMessages

  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      <CalendarBody view={view} />
    </div>
  )
}
