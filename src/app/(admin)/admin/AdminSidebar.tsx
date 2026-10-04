'use client';

import Link from 'next/link';
import { Icon, Mark, type IconName } from '@/lib/icons';

export const NAV: { href: string; label: string; icon: IconName; title: string; desc: string }[] = [
  { href: '/admin', label: 'Mes liens', icon: 'link', title: 'Mes liens', desc: 'Ajoute, classe et réordonne les liens de ta page.' },
  { href: '/admin/categories', label: 'Catégories', icon: 'folder', title: 'Catégories', desc: 'Les onglets que tes visiteurs utilisent pour filtrer tes liens.' },
  { href: '/admin/apparence', label: 'Profil & apparence', icon: 'palette', title: 'Profil & apparence', desc: 'Ce que les visiteurs voient en haut de ta page, et son style.' },
  { href: '/admin/newsletter', label: 'Newsletter', icon: 'mail', title: 'Newsletter', desc: 'L’inscription à ta newsletter, branchée sur ton service d’emailing.' },
  { href: '/admin/stats', label: 'Statistiques', icon: 'chart', title: 'Statistiques', desc: 'Ce qui est cliqué sur ta page.' },
];

/** Barre latérale de l'admin (en-tête sur mobile) : navigation, compte, déconnexion. */
export default function AdminSidebar({ current, email, initial, name, onLogout }: { current: string; email: string; initial: string; name: string; onLogout: () => void }) {
  return (
    <aside className="side">
      <a className="brand" href="/" target="_blank" rel="noopener" aria-label={name + ' — voir ma page'}>
        <Mark size={28} />
        <span className="brand-word">{name}</span>
      </a>
      <div className="side-acts">
        <a className="icon-btn" href="/" target="_blank" rel="noopener" aria-label="Voir ma page">
          <Icon name="external" />
        </a>
        <button className="icon-btn" type="button" aria-label="Se déconnecter" onClick={onLogout}>
          <Icon name="logout" />
        </button>
      </div>
      <nav className="side-nav" aria-label="Navigation de l’espace">
        <ul className="nav od-rail">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link className="nav-item" href={n.href} aria-current={n.href === current ? 'page' : undefined}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="side-foot">
        <a className="btn btn-secondary" href="/" target="_blank" rel="noopener">
          <Icon name="external" sm />
          Voir ma page
        </a>
        <div className="account">
          <span className="account-av" aria-hidden="true">
            {initial}
          </span>
          <div className="od-field od-fill">
            <span className="account-mail od-truncate" title={email}>
              {email}
            </span>
            <span className="account-role">Propriétaire</span>
          </div>
          <button className="icon-btn" type="button" aria-label="Se déconnecter" onClick={onLogout}>
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </aside>
  );
}
