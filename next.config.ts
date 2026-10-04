import type { NextConfig } from 'next';

// En-têtes de sécurité : un domaine propre, en HTTPS, sans redirection ni contenu
// douteux, c'est ce que regardent les navigateurs intégrés (TikTok, Instagram…)
// et Google Safe Browsing avant d'ouvrir un lien.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // l'aperçu de l'admin affiche la page publique dans un iframe du même domaine
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig: NextConfig = {
  // Image Docker autonome (Coolify) : server.js + le strict nécessaire de node_modules
  output: 'standalone',
  poweredByHeader: false,
  // En dev, Next journalise les arguments des actions serveur : ils contiendraient
  // l'email des inscrits à la newsletter (règle : jamais d'email dans les journaux).
  logging: { serverFunctions: false },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
