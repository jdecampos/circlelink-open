import 'server-only';
import { eq } from 'drizzle-orm';
import type { LinkShape, Profile, Theme } from '@/lib/types';
import { getDb, type Db } from '../client';
import { profile } from '../schema';

const EMPTY_PROFILE: Profile = { name: '', handle: '', bio: '', location: '', socials: {}, theme: 'clair', link_shape: 'pilule', avatar_url: '', logo_url: '', logo_dark_url: '' };

/** Profil de la page (valeurs vides tant qu'il n'a jamais été enregistré). */
export async function getProfile(db: Db = getDb()): Promise<Profile> {
  const [p] = await db.select().from(profile).where(eq(profile.id, 1)).limit(1);
  if (!p) return EMPTY_PROFILE;
  return { name: p.name, handle: p.handle, bio: p.bio, location: p.location, socials: p.socials, theme: p.theme as Theme, link_shape: p.linkShape as LinkShape, avatar_url: p.avatarUrl, logo_url: p.logoUrl, logo_dark_url: p.logoDarkUrl };
}

/** Enregistre le profil (ligne unique), en la créant si elle n'existe pas encore. */
export async function updateProfile(p: Profile, db: Db = getDb()): Promise<void> {
  const values = {
    name: p.name,
    handle: p.handle,
    bio: p.bio,
    location: p.location,
    socials: p.socials,
    theme: p.theme,
    linkShape: p.link_shape,
    avatarUrl: p.avatar_url,
    logoUrl: p.logo_url,
    logoDarkUrl: p.logo_dark_url,
    updatedAt: new Date(),
  };
  await db
    .insert(profile)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: profile.id, set: values });
}
