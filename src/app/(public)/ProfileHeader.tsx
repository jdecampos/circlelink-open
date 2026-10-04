import Image from 'next/image';
import { displayName } from '@/lib/brand';
import { Icon } from '@/lib/icons';
import { NETWORKS } from '@/lib/links';
import type { Profile } from '@/lib/types';

export default function ProfileHeader({ profile }: { profile: Profile }) {
  const socials = NETWORKS.filter((n) => profile.socials?.[n.id]);
  return (
    <section className="profile" aria-labelledby="pName">
      <div className="avatar" aria-hidden="true">
        <div className="avatar-disc">
          {profile.avatar_url ? (
            // URL saisie par la propriétaire (https:, validée) : servie telle quelle, sans optimiseur
            <Image className="avatar-photo" src={profile.avatar_url} width={88} height={88} alt="" priority unoptimized />
          ) : (
            displayName(profile.name)[0].toUpperCase()
          )}
        </div>
        <span className="avatar-block" />
      </div>
      <div className="od-stack" style={{ ['--od-gap' as string]: '4px' }}>
        <h1 className="profile-name" id="pName">
          {profile.name || 'Ton nom'}
        </h1>
        <p className="profile-handle">@{profile.handle || 'identifiant'}</p>
      </div>
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      {profile.location && (
        <p className="profile-loc">
          <Icon name="pin" sm />
          <span>{profile.location}</span>
        </p>
      )}
      {socials.length > 0 && (
        <nav className="socials" aria-label="Réseaux sociaux">
          {socials.map((n) => (
            <a key={n.id} className="social" href={profile.socials[n.id]} target="_blank" rel="noopener" aria-label={n.label}>
              <Icon name={n.id} />
            </a>
          ))}
        </nav>
      )}
    </section>
  );
}
