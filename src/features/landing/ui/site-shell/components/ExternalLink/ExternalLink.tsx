import { landingMessages } from '../../../constants/landing-strings'
import type { ExternalLinkProps } from './ExternalLink.types'

export function ExternalLink({ href, className, children }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {landingMessages.location.newTab}</span>
    </a>
  )
}
