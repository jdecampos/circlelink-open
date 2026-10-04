import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { PRODUCT_NAME } from '@/lib/brand';
import { Mark } from '@/lib/icons';
import '@/styles/cb.css';
import '@/styles/auth.css';

export const metadata: Metadata = {
  title: 'Connexion — ' + PRODUCT_NAME,
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="clair">
      <head>
        <link rel="preload" href="/fonts/nunito-sans-latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <div className="auth">
          <aside className="side">
            <Link className="brand" href="/">
              <Mark size={30} />
              <span className="brand-word">{PRODUCT_NAME}</span>
            </Link>
            <div className="side-body">
              <h2>Ta page, tes liens, ton audience.</h2>
              <ul>
                <li>
                  <span>
                    <strong>Classe tes liens</strong> par catégorie : formations, contenus, outils…
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Mets en avant</strong> ce qui compte cette semaine.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Vois ce qui est cliqué</strong> et ajuste en un instant.
                  </span>
                </li>
              </ul>
            </div>
            <p className="side-foot">Espace propriétaire · {PRODUCT_NAME}</p>
            <svg className="side-deco" viewBox="0 0 48 48" aria-hidden="true">
              <circle className="c" cx="18" cy="24" r="11" />
              <circle className="b" cx="30" cy="24" r="11" />
            </svg>
          </aside>
          <main className="main">
            <div className="panel">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
