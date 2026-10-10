import Image from 'next/image'
import type { Credential } from '@/features/content'
import { landingStudioStyles as STYLES } from './LandingStudio.styles'
import { landingMessages } from '../../../constants/landing-strings'
import { STUDIO_SECTION } from '../../../sections'
import type { LandingStudioProps } from './LandingStudio.types'

export function LandingStudio({ studio }: LandingStudioProps) {
  const copy = landingMessages.studio
  const { profile, credentials } = studio
  const education = credentials.filter((credential) => credential.kind === 'formacion')
  const certifications = credentials.filter((credential) => credential.kind === 'certificacion')
  const hasTrajectory = profile.yearsOfExperience !== null || credentials.length > 0

  return (
    <section id={STUDIO_SECTION.id} className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>

        <div className={STYLES.layout}>
          {profile.portrait && (
            <figure className={STYLES.portrait}>
              <Image
                src={profile.portrait.url}
                alt={profile.portrait.alt}
                fill
                className={STYLES.photo}
                sizes="(max-width: 768px) 100vw, 20.625rem"
              />
            </figure>
          )}

          <div className={STYLES.column}>
            {profile.paragraphs.map((paragraph) => (
              <p key={paragraph} className={STYLES.paragraph}>
                {paragraph}
              </p>
            ))}

            {profile.name && (
              <>
                <p className={STYLES.name}>{profile.name}</p>
                <p className={STYLES.role}>{profile.role}</p>
              </>
            )}

            {hasTrajectory && (
              <div className={STYLES.trajectory}>
                <h3 className={STYLES.trajectoryTitle}>{copy.trajectory}</h3>
                {profile.yearsOfExperience !== null && (
                  <p className={STYLES.years}>{copy.years(profile.yearsOfExperience)}</p>
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
      <h4 className={STYLES.groupTitle}>{title}</h4>
      <ul className={STYLES.list}>
        {credentials.map((credential) => {
          const meta = [credential.issuer, credential.year].filter((part) => part !== null).join(' · ')
          return (
            <li key={`${credential.title}-${credential.year ?? ''}`} className={STYLES.item}>
              {credential.title}
              {meta && <span className={STYLES.itemMeta}> — {meta}</span>}
            </li>
          )
        })}
      </ul>
    </>
  )
}
