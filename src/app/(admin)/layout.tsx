import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { getAdminData } from '@/lib/data';
import { hasOwner } from '@/lib/setup/owner';
import AdminShell from './admin/AdminShell';
import Forbidden from './admin/Forbidden';
import '@/styles/cb.css';
import '@/styles/admin.css';

export const metadata: Metadata = {
  title: 'Mon espace',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
  robots: { index: false, follow: false },
};

// L'admin dépend de la session : jamais pré-rendu (le build n'a d'ailleurs pas de base).
export const dynamic = 'force-dynamic';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasOwner())) redirect('/installation');
  const data = await getAdminData();
  if (data === 'anon') redirect('/connexion');

  return (
    <html lang="fr" data-theme="clair">
      <head>
        <link rel="preload" href="/fonts/nunito-sans-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{data === 'forbidden' ? <Forbidden /> : <AdminShell data={data}>{children}</AdminShell>}</body>
    </html>
  );
}
