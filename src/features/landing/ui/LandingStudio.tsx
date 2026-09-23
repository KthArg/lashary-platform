import Image from 'next/image'
import type { Credential, StudioContent } from '@/features/content'
import { landingStudioStyles as styles } from './LandingStudio.styles'
import { landingMessages } from './messages'
import { STUDIO_SECTION } from './sections'

type LandingStudioProps = {
  studio: Pick<StudioContent, 'profile' | 'credentials'>
}

// Sección "El estudio" (US-LAND-04): quién es la dueña, con su retrato, su texto, sus años de
// experiencia y su trayectoria. Todo viene del CMS por `content`; sin publicar, el respaldo no
// trae ni nombre ni retrato, y la sección se muestra sin ellos.
export function LandingStudio({ studio }: LandingStudioProps) {
  const copy = landingMessages.studio
  const { profile, credentials } = studio
  const education = credentials.filter((credential) => credential.kind === 'formacion')
  const certifications = credentials.filter((credential) => credential.kind === 'certificacion')
  const hasTrajectory = profile.yearsOfExperience !== null || credentials.length > 0

  return (
    <section id={STUDIO_SECTION.id} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>

        <div className={styles.layout}>
          {profile.portrait && (
            <figure className={styles.portrait}>
              <Image
                src={profile.portrait.url}
                alt={profile.portrait.alt}
                fill
                className={styles.photo}
                sizes="(max-width: 768px) 100vw, 20.625rem"
              />
            </figure>
          )}

          <div className={styles.column}>
            {profile.paragraphs.map((paragraph) => (
              <p key={paragraph} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}

            {/* El rol solo acompaña a un nombre: suelto no dice de quién es. */}
            {profile.name && (
              <>
                <p className={styles.name}>{profile.name}</p>
                <p className={styles.role}>{profile.role}</p>
              </>
            )}

            {hasTrajectory && (
              <div className={styles.trajectory}>
                <h3 className={styles.trajectoryTitle}>{copy.trajectory}</h3>
                {profile.yearsOfExperience !== null && (
                  <p className={styles.years}>{copy.years(profile.yearsOfExperience)}</p>
                )}
                <CredentialGroup title={copy.education} credentials={education} />
                <CredentialGroup title={copy.certifications} credentials={certifications} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function CredentialGroup({ title, credentials }: { title: string; credentials: Credential[] }) {
  if (credentials.length === 0) return null
  return (
    <>
      <h4 className={styles.groupTitle}>{title}</h4>
      <ul className={styles.list}>
        {credentials.map((credential) => {
          const meta = [credential.issuer, credential.year].filter((part) => part !== null).join(' · ')
          return (
            <li key={`${credential.title}-${credential.year ?? ''}`} className={styles.item}>
              {credential.title}
              {meta && <span className={styles.itemMeta}> — {meta}</span>}
            </li>
          )
        })}
      </ul>
    </>
  )
}
