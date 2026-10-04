'use client';

import { plural } from '@/lib/links';
import { SOURCE_LABELS } from '@/lib/source';
import { useAdmin } from '../AdminShell';
import { Icon } from '@/lib/icons';

function Bar({ label, val, max }: { label: string; val: number; max: number }) {
  return (
    <li>
      <div className="bar-top">
        <span className="bar-label od-truncate od-fill">{label}</span>
        <span className="bar-val">{plural(val, 'clic')}</span>
      </div>
      <div className="bar-track" aria-hidden="true">
        <div className="bar-fill" style={{ width: Math.round((val / max) * 100) + '%' }} />
      </div>
    </li>
  );
}

/** `segmentCount` : abonnés de la liste du service connecté, ou null s'il n'a pas répondu. */
export default function StatsView({ segmentCount }: { segmentCount: number | null }) {
  const { data } = useAdmin();
  const { links, categories, clicks, sources, queue, newsletter } = data;
  const count = (id: string) => clicks[id] ?? 0;
  const total = Object.values(clicks).reduce((s, n) => s + n, 0);
  const vis = links.filter((l) => l.visible).length;
  const top = links
    .filter((l) => count(l.id))
    .sort((a, b) => count(b.id) - count(a.id))
    .slice(0, 8);
  const maxL = Math.max(1, ...top.map((l) => count(l.id)));
  const cats = categories
    .map((c) => ({ name: c.name, n: links.filter((l) => l.category_id === c.id).reduce((s, l) => s + count(l.id), 0) }))
    .sort((a, b) => b.n - a.n);
  const maxC = Math.max(1, ...cats.map((c) => c.n));
  const maxS = Math.max(1, ...sources.map((s) => s.clicks));

  return (
    <>
      <div className="kpis">
        <div className="kpi od-stat">
          <span className="kpi-num">{total.toLocaleString('fr-FR')}</span>
          <span className="kpi-cap">clics au total</span>
        </div>
        <div className="kpi od-stat">
          <span className="kpi-num">
            {vis} / {links.length}
          </span>
          <span className="kpi-cap">liens visibles</span>
        </div>
        <div className="kpi od-stat">
          <span className="kpi-num">{segmentCount === null ? '—' : segmentCount.toLocaleString('fr-FR')}</span>
          <span className="kpi-cap">{!newsletter ? 'Newsletter désactivée' : segmentCount === null ? 'inscrits à la newsletter · service indisponible' : 'inscrits à la newsletter'}</span>
        </div>
      </div>
      {(queue.pending > 0 || queue.lost > 0) && (
        <div className="notice" role="status">
          <Icon name="alert" sm />
          <p>
            {queue.pending > 0 && (
              <>
                <strong>{plural(queue.pending, 'inscription')} en attente</strong> de transmission à ton service d’emailing, retentée{queue.pending > 1 ? 's' : ''} toutes les 15 minutes.{' '}
              </>
            )}
            {queue.lost > 0 && (
              <>
                <strong>{plural(queue.lost, 'inscription')} perdue{queue.lost > 1 ? 's' : ''}</strong> : ton service d’emailing est resté injoignable plus de 24 h.
              </>
            )}
          </p>
        </div>
      )}
      <div className="two-col">
        <section className="card" aria-labelledby="stTop">
          <h2 id="stTop">Liens les plus cliqués</h2>
          {top.length ? (
            <ul className="bars">
              {top.map((l) => (
                <Bar key={l.id} label={l.title} val={count(l.id)} max={maxL} />
              ))}
            </ul>
          ) : (
            <p className="muted">Aucun clic pour l’instant. Partage ta page pour commencer.</p>
          )}
        </section>
        <div className="od-stack" style={{ ['--od-gap' as string]: '16px' }}>
          <section className="card" aria-labelledby="stCat">
            <h2 id="stCat">Clics par catégorie</h2>
            <ul className="bars">
              {cats.map((c) => (
                <Bar key={c.name} label={c.name} val={c.n} max={maxC} />
              ))}
            </ul>
          </section>
          <section className="card" aria-labelledby="stSrc">
            <h2 id="stSrc">Clics par provenance</h2>
            {sources.length ? (
              <ul className="bars">
                {sources.map((s) => (
                  <Bar key={s.source} label={SOURCE_LABELS[s.source] ?? s.source} val={s.clicks} max={maxS} />
                ))}
              </ul>
            ) : (
              <p className="muted">TikTok, Instagram, Facebook… s’afficheront ici dès les premiers clics.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
