import { landingMessages } from './messages'

type ExternalLinkProps = {
  href: string
  className: string
  children: React.ReactNode
}

// Enlace a otro sitio (WhatsApp, redes, mapa): pestaña nueva, sin `opener` ni referente, y
// avisado al lector de pantalla. Lo usan Ubicación y el pie de página.
export function ExternalLink({ href, className, children }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> {landingMessages.location.newTab}</span>
    </a>
  )
}
