/**
 * Devine d'où vient un visiteur. Les applis sociales ouvrent les liens dans leur
 * navigateur intégré et s'identifient dans le User-Agent ; le Referer complète.
 */
export function detectSource(ua: string, referer: string | null): string {
  const u = ua.toLowerCase();
  if (u.includes('bytedancewebview') || u.includes('musical_ly') || u.includes('tiktok') || u.includes('trill')) return 'tiktok';
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('fban') || u.includes('fbav') || u.includes('fb_iab') || u.includes('fbios')) return 'facebook';
  if (u.includes('linkedinapp')) return 'linkedin';
  if (u.includes('snapchat')) return 'snapchat';
  if (u.includes('twitter')) return 'x';
  if (u.includes('threads')) return 'threads';

  if (referer) {
    try {
      const h = new URL(referer).hostname.replace(/^www\./, '').replace(/^m\./, '');
      if (h.endsWith('tiktok.com')) return 'tiktok';
      if (h.endsWith('instagram.com')) return 'instagram';
      if (h.endsWith('facebook.com') || h === 'l.facebook.com' || h === 'lm.facebook.com') return 'facebook';
      if (h.endsWith('youtube.com') || h === 'youtu.be') return 'youtube';
      if (h.endsWith('linkedin.com') || h === 'lnkd.in') return 'linkedin';
      if (h === 't.co' || h.endsWith('x.com') || h.endsWith('twitter.com')) return 'x';
    } catch {
      // referer illisible
    }
  }
  return 'direct';
}

export const SOURCE_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  snapchat: 'Snapchat',
  x: 'X',
  threads: 'Threads',
  direct: 'Direct / autre',
};
