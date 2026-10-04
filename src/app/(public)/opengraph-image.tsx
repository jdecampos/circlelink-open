import { ImageResponse } from 'next/og';
import { displayName } from '@/lib/brand';
import { getPage } from './page-data';

// Aperçu affiché quand le lien est collé dans TikTok, Instagram, WhatsApp, LinkedIn…
export const alt = 'Tous mes liens';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default async function OpengraphImage() {
  const { profile } = await getPage();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: '#141413',
          color: '#f4f5f1',
        }}
      >
        <svg width="96" height="96" viewBox="0 0 48 48">
          <circle cx="18" cy="24" r="11" fill="none" stroke="#f4f5f1" strokeWidth="5" />
          <circle cx="30" cy="24" r="11" fill="none" stroke="#5cb59a" strokeWidth="5" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 88, fontFamily: 'serif', letterSpacing: -2 }}>{displayName(profile.name)}</div>
          {profile.bio && <div style={{ fontSize: 34, color: '#b3b8ae', lineHeight: 1.4, maxWidth: 940 }}>{profile.bio}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: '#b3b8ae' }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: '#5cb59a' }} />
          {profile.handle ? '@' + profile.handle : ''}
        </div>
      </div>
    ),
    size,
  );
}
