import { RECORD_ICON_PATHS } from '../../constants/record-icons'
import type { RecordIconProps } from './RecordIcon.types'

export function RecordIcon({ name, className }: RecordIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={RECORD_ICON_PATHS[name]} />
    </svg>
  )
}
