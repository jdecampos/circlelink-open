'use client';

import { Icon } from '@/lib/icons';
import { domain, linkIcon } from '@/lib/links';
import type { Category, LinkItem } from '@/lib/types';

export default function Feed({
  links,
  categories,
  current,
  catName,
  owner,
}: {
  links: LinkItem[];
  categories: Category[];
  current: string;
  catName: (id: string) => string;
  /** Propriétaire connecté (cookie indicateur) : la page vide l'invite à ajouter un lien. */
  owner: boolean;
}) {
  if (!links.length && owner) {
    return (
      <div className="empty">
        <h2>Ajoute ton premier lien</h2>
        <p>Ta page est prête. Ajoute un lien depuis ton espace : il apparaîtra ici tout de suite.</p>
        <a className="btn btn-primary" href="/admin" target="_top">
          <Icon name="plus" sm />
          Ajouter un lien
        </a>
      </div>
    );
  }
  if (!links.length) {
    return (
      <div className="empty">
        <h2>Aucun lien pour l’instant</h2>
        <p>Cette page sera bientôt remplie. Reviens vite !</p>
      </div>
    );
  }
  // ordre d'apparition (pour le décalage de l'animation d'entrée), calculé sans effet de bord
  const order = new Map<string, number>();
  const sections: { c: Category; list: LinkItem[] }[] = [];
  const feats = current === 'all' ? links.filter((l) => l.type === 'featured') : [];
  const byType = (list: LinkItem[]) => [
    ...list.filter((l) => l.type === 'featured'),
    ...list.filter((l) => l.type === 'product'),
    ...list.filter((l) => l.type === 'link'),
  ];
  feats.forEach((l) => order.set(l.id, order.size));
  if (current === 'all') {
    for (const c of categories) {
      const list = links.filter((l) => l.category_id === c.id && l.type !== 'featured');
      if (list.length) sections.push({ c, list });
    }
  }
  const single = current === 'all' ? [] : links.filter((l) => l.category_id === current);
  for (const s of sections) byType(s.list).forEach((l) => order.set(l.id, order.size));
  byType(single).forEach((l) => order.set(l.id, order.size));
  const idx = (id: string) => order.get(id) ?? 0;

  if (current !== 'all') {
    return (
      <section className="section">
        <Block list={single} idx={idx} catName={catName} />
      </section>
    );
  }

  // les mises en avant d'abord, puis chaque catégorie
  return (
    <>
      {feats.map((l) => (
        <FeatureCard key={l.id} l={l} i={idx(l.id)} catName={catName} />
      ))}
      {sections.map(({ c, list }) => (
        <section key={c.id} className="section" aria-labelledby={'s-' + c.id}>
          <div className="section-head">
            <h2 id={'s-' + c.id}>{c.name}</h2>
            <span className="mono">{list.length}</span>
          </div>
          <Block list={list} idx={idx} catName={catName} />
        </section>
      ))}
    </>
  );
}

function Block({ list, idx, catName }: { list: LinkItem[]; idx: (id: string) => number; catName: (id: string) => string }) {
  const feats = list.filter((l) => l.type === 'featured');
  const prods = list.filter((l) => l.type === 'product');
  const plain = list.filter((l) => l.type === 'link');
  return (
    <>
      {feats.map((l) => (
        <FeatureCard key={l.id} l={l} i={idx(l.id)} catName={catName} />
      ))}
      {prods.length > 0 && (
        <div className="products">
          {prods.map((l, n) => (
            <ProductCard key={l.id} l={l} i={idx(l.id)} n={n} catName={catName} />
          ))}
        </div>
      )}
      {plain.length > 0 && (
        <ul className="links">
          {plain.map((l) => (
            <LinkRow key={l.id} l={l} i={idx(l.id)} />
          ))}
        </ul>
      )}
    </>
  );
}

const reveal = (i: number) => ({ ['--i' as string]: i });

function LinkRow({ l, i }: { l: LinkItem; i: number }) {
  return (
    <li className="reveal" style={reveal(i)}>
      <a className="link" href={l.url} target="_blank" rel="noopener" data-id={l.id}>
        <span className="link-ico">
          <Icon name={linkIcon(l)} />
        </span>
        <span className="od-field od-fill">
          <span className="link-title od-clamp-2">{l.title}</span>
          <span className="link-meta od-truncate">{domain(l.url)}</span>
        </span>
        <span className="link-go">
          <Icon name="arrow" />
        </span>
      </a>
    </li>
  );
}

function FeatureCard({ l, i, catName }: { l: LinkItem; i: number; catName: (id: string) => string }) {
  return (
    <article className="feature reveal" style={reveal(i)}>
      <svg className="feature-deco" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M36.73 36.73 A18 18 0 1 1 36.73 11.27" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
      <span className="feature-kicker">À la une · {catName(l.category_id)}</span>
      <h3>{l.title}</h3>
      {l.description && <p>{l.description}</p>}
      <a className="btn btn-cta" href={l.url} target="_blank" rel="noopener" data-id={l.id}>
        Y aller
        <Icon name="arrowRight" sm />
      </a>
    </article>
  );
}

function ProductCard({ l, i, n, catName }: { l: LinkItem; i: number; n: number; catName: (id: string) => string }) {
  return (
    <a className="product reveal" style={reveal(i)} href={l.url} target="_blank" rel="noopener" data-id={l.id}>
      <div className="cover" data-v={n % 3} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <path className="c" d="M36.73 36.73 A18 18 0 1 1 36.73 11.27" />
          <rect className="b" x="37.5" y="19.75" width="8.5" height="8.5" rx="2.2" />
        </svg>
      </div>
      <div className="product-body">
        <span className="product-kick">
          {catName(l.category_id)} · {String(n + 1).padStart(2, '0')}
        </span>
        <h3 className="od-clamp-2">{l.title}</h3>
        {l.description && <p className="product-desc od-clamp-2">{l.description}</p>}
        <div className="product-foot">
          {l.price && <span className="product-price od-nowrap">{l.price}</span>}
          <span className="product-cta">
            Découvrir
            <Icon name="arrowRight" sm />
          </span>
        </div>
      </div>
    </a>
  );
}
