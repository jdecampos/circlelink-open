'use client';

import { useEffect, useRef, useState } from 'react';
import { PRODUCT_NAME, REPO_URL } from '@/lib/brand';
import { Icon, Mark } from '@/lib/icons';
import type { PageData } from '@/lib/types';
import { Toasts, useToasts } from '@/components/Toasts';
import Feed from './Feed';
import Newsletter from './Newsletter';
import ProfileHeader from './ProfileHeader';
import SiteLogo from './SiteLogo';
import { useClickTracking } from './useClickTracking';

type Tab = { id: string; name: string; n: number };

export default function LinkPage({ data }: { data: PageData }) {
  const { profile, categories } = data;
  const links = data.links;
  const [current, setCurrent] = useState('all');
  const [authed, setAuthed] = useState(false);
  const [stuck, setStuck] = useState(false);
  const tabsWrap = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const toasts = useToasts();

  const cats = categories.filter((c) => links.some((l) => l.category_id === c.id));
  const active = current === 'all' || cats.some((c) => c.id === current) ? current : 'all';
  const tabs: Tab[] = [{ id: 'all', name: 'Tout', n: links.length }].concat(
    cats.map((c) => ({ id: c.id, name: c.name, n: links.filter((l) => l.category_id === c.id).length })),
  );
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Autres';

  // onglet depuis l'ancre (#id), et suivi des changements d'ancre
  useEffect(() => {
    const fromHash = () => setCurrent(location.hash.slice(1) || 'all');
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  // propriétaire connecté → bouton « Modifier ma page ». Le cookie indicateur, posé par le
  // proxy sur /admin, évite tout appel réseau pour les visiteurs (constitution VII.2).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture d'un cookie après hydratation
    setAuthed(document.cookie.split('; ').includes('cb-owner=1'));
  }, []);

  // filet sous les onglets quand ils collent en haut de l'écran
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useClickTracking();

  function select(id: string, focus = false) {
    setCurrent(id);
    history.replaceState(null, '', id === 'all' ? location.pathname + location.search : '#' + id);
    requestAnimationFrame(() => {
      const t = document.getElementById('tab-' + id);
      if (t) {
        if (focus) t.focus();
        t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      if (tabsWrap.current?.classList.contains('is-stuck')) feed.current?.scrollIntoView({ block: 'start' });
    });
  }

  function onTabsKey(e: React.KeyboardEvent) {
    const idx = tabs.findIndex((t) => t.id === active);
    let n: number | null = null;
    if (e.key === 'ArrowRight') n = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') n = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) {
      e.preventDefault();
      select(tabs[n].id, true);
    }
  }

  async function share() {
    const url = location.href.split('#')[0].replace(/[?&]preview=1/, '');
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toasts.show('Lien de la page copié');
    } catch {
      toasts.show('Copie impossible — copie l’adresse depuis la barre du navigateur');
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Haut de page">
          <SiteLogo profile={profile} />
        </a>
        <div className="topbar-actions">
          {authed && (
            <a className="btn btn-secondary btn-sm" href="/admin">
              Modifier ma page
            </a>
          )}
          <button className="btn btn-secondary btn-sm" type="button" onClick={share}>
            <Icon name="share" sm />
            Partager
          </button>
        </div>
      </header>

      <main className="layout">
        <ProfileHeader profile={profile} />

        <div className="content">
          <div ref={sentinel} style={{ marginBottom: 'calc(-1 * var(--s4))' }} />
          <div ref={tabsWrap} className={'tabs-wrap' + (stuck ? ' is-stuck' : '')}>
            <div className="tabs od-rail" role="tablist" aria-label="Catégories de liens" onKeyDown={onTabsKey}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className="tab"
                  role="tab"
                  type="button"
                  id={'tab-' + t.id}
                  aria-selected={t.id === active}
                  tabIndex={t.id === active ? 0 : -1}
                  aria-controls="feed"
                  onClick={() => select(t.id)}
                >
                  <span>{t.name}</span>
                  <span className="count">{t.n}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="feed" id="feed" ref={feed} role="tabpanel" aria-live="polite" aria-labelledby={'tab-' + active}>
            <Feed links={links} categories={categories} current={active} catName={catName} owner={authed} />
          </div>

          {data.newsletter && <Newsletter />}
        </div>
      </main>

      <footer className="footer">
        {/* mention toujours affichée : pas de réglage dans l'espace */}
        <a href={REPO_URL} target="_blank" rel="noopener">
          <span>Propulsé par</span>
          <Mark size={18} />
          <span>{PRODUCT_NAME}</span>
        </a>
        <a href={authed ? '/admin' : '/connexion'}>{authed ? 'Mon espace' : 'Connexion'}</a>
      </footer>
      <Toasts api={toasts} />
    </div>
  );
}
