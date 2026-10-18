import Form from 'next/form'
import Link from 'next/link'
import { CALENDAR_PARAMS, CLIENT_CALENDAR_PATH, clientCalendarMessages } from '../constants/client-calendar-strings'
import type { ClientCalendarView as CalendarView, DayView, ServicePickerView, SlotView } from '../types/client-calendar.types'
import { clientCalendarStyles as s } from '../styles/client-calendar.styles'

const m = clientCalendarMessages

// Elegir servicio es un GET a la misma ruta: next/form navega del lado del cliente.
function ServicePicker({ picker }: { picker: ServicePickerView }) {
  return (
    <Form action={CLIENT_CALENDAR_PATH} className={s.pickerForm}>
      <label className={s.field} htmlFor="calendar-service">
        <span className={s.labelText}>{m.serviceLabel}</span>
        <select
          key={picker.selectedKey ?? ''}
          id="calendar-service"
          name={CALENDAR_PARAMS.service}
          defaultValue={picker.selectedKey ?? ''}
          required
          className={s.select}
        >
          <option value="" disabled>
            {m.servicePlaceholder}
          </option>
          {picker.options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name={CALENDAR_PARAMS.date} value={picker.date} />
      <button type="submit" className={s.submit}>
        {m.showSlots}
      </button>
    </Form>
  )
}

// Texto corto en el teléfono y completo desde sm. El nombre accesible es siempre el completo, que
// contiene la palabra visible (WCAG 2.5.3).
function DayLabel({ short, long }: { short: string; long: string }) {
  return (
    <>
      <span className={s.labelShort}>{short}</span>
      <span className={s.labelLong}>{long}</span>
    </>
  )
}

// Cambiar de día es un <Link>: la página no se recarga (criterio 4).
function DayNavigator({ day }: { day: DayView }) {
  return (
    <nav aria-label={m.dayNavigation} className={s.dayNav}>
      {day.previousHref ? (
        <Link href={day.previousHref} scroll={false} aria-label={m.previousDay} className={s.dayLinkPrevious}>
          <span aria-hidden="true">{m.previousArrow}</span> <DayLabel short={m.previousDayShort} long={m.previousDay} />
        </Link>
      ) : (
        <span aria-disabled="true" aria-label={m.previousDay} className={s.dayLinkDisabled}>
          <span aria-hidden="true">{m.previousArrow}</span> <DayLabel short={m.previousDayShort} long={m.previousDay} />
        </span>
      )}
      <h2 className={s.dayTitle} aria-live="polite">
        {day.title}
      </h2>
      <Link href={day.nextHref} scroll={false} aria-label={m.nextDay} className={s.dayLinkNext}>
        <DayLabel short={m.nextDayShort} long={m.nextDay} /> <span aria-hidden="true">{m.nextArrow}</span>
      </Link>
    </nav>
  )
}

// Libre y ocupado se distinguen por texto, no solo por color (UI-004); lo ocupado está
// deshabilitado y no se puede elegir (criterio 3).
function SlotList({ slots }: { slots: SlotView[] }) {
  if (slots.length === 0) return <p className={s.empty}>{m.noSlots}</p>

  return (
    <fieldset className={s.fieldset}>
      <legend className={s.legend}>{m.slotsLegend}</legend>
      <ul className={s.slotGrid}>
        {slots.map((slot) => {
          const id = `slot-${slot.startMin}`
          return (
            <li key={slot.startMin}>
              <label htmlFor={id} className={slot.busy ? s.slotBusy : s.slotFree}>
                <input id={id} type="radio" name="espacio" value={slot.startMin} disabled={slot.busy} className={s.radio} />
                <span className={s.slotTime}>{slot.range}</span>
                <span className={slot.busy ? s.badgeBusy : s.badgeFree}>{slot.busy ? m.busy : m.free}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

function CalendarBody({ view }: { view: CalendarView }) {
  switch (view.status) {
    case 'forbidden':
      return (
        <div role="alert" className={s.alertError}>
          <span>{m.accessDenied}</span>
        </div>
      )
    case 'noServices':
      return <p className={s.empty}>{m.noServices}</p>
    case 'chooseService':
      return (
        <section className={s.card}>
          <ServicePicker picker={view.picker} />
          <p className={s.empty}>{m.chooseService}</p>
        </section>
      )
    case 'invalid':
      return (
        <section className={s.card}>
          <ServicePicker picker={view.picker} />
          <DayNavigator day={view.day} />
          <div role="alert" className={s.alertError}>
            <span>{m.invalid}</span>
          </div>
        </section>
      )
    case 'ready':
      return (
        <section className={s.card}>
          <ServicePicker picker={view.picker} />
          <DayNavigator day={view.day} />
          <SlotList slots={view.slots} />
        </section>
      )
  }
}

// Vista sin datos propios: recibe todo ya formateado (utils/client-calendar-format.ts).
export function ClientCalendarView({ view }: { view: CalendarView }) {
  return (
    <div className={s.main}>
      <header className={s.header}>
        <h1 className={s.title}>{m.title}</h1>
        <p className={s.subtitle}>{m.subtitle}</p>
      </header>
      <CalendarBody view={view} />
    </div>
  )
}
