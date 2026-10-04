'use client';

import { useState } from 'react';
import { Icon } from '@/lib/icons';
import { domain, linkIcon, plural } from '@/lib/links';
import { deleteLink, restoreLink, setLinkVisible, swapLinks } from './actions';
import { useAdmin } from './AdminShell';

export default function LinksView() {
  const { data, filter, setFilter, openEditor, confirm, run } = useAdmin();
  const { links, categories, clicks } = data;
  // interrupteur optimiste : il bascule tout de suite et garde cette valeur
  // tant que les données serveur n'ont pas changé (base = valeur au moment du clic)
  const [pendingVis, setPendingVis] = useState<Record<string, { value: boolean; base: boolean }>>({});
  const active = filter !== 'all' && !categories.some((c) => c.id === filter) ? 'all' : filter;
  const list = active === 'all' ? links : links.filter((l) => l.category_id === active);
  const total = links.length;
  const vis = links.filter((l) => l.visible).length;
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Sans catégorie';
  const chips = [{ id: 'all', name: 'Tous', n: total }].concat(
    categories.map((c) => ({ id: c.id, name: c.name, n: links.filter((l) => l.category_id === c.id).length })),
  );

  async function move(id: string, dir: -1 | 1) {
    const i = list.findIndex((l) => l.id === id);
    const other = list[i + dir];
    if (!other) return;
    await run(() => swapLinks(id, other.id));
    // garder le focus sur le bouton (ou son opposé s'il devient désactivé)
    requestAnimationFrame(() => {
      const btn = document.querySelector<HTMLButtonElement>(`[data-move="${dir < 0 ? 'up' : 'down'}"][data-id="${id}"]`);
      const alt = document.querySelector<HTMLButtonElement>(`[data-move="${dir < 0 ? 'down' : 'up'}"][data-id="${id}"]`);
      (btn && !btn.disabled ? btn : alt)?.focus();
    });
  }

  const shownVisible = (id: string, server: boolean) => {
    const p = pendingVis[id];
    return p && p.base === server ? p.value : server;
  };

  async function toggle(id: string, server: boolean, visible: boolean) {
    setPendingVis((p) => ({ ...p, [id]: { value: visible, base: server } }));
    const ok = await run(() => setLinkVisible(id, visible), visible ? 'Lien visible sur ta page' : 'Lien masqué de ta page');
    if (!ok)
      setPendingVis((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
  }

  async function remove(id: string) {
    const l = links.find((x) => x.id === id)!;
    const ok = await confirm({
      title: 'Supprimer ce lien ?',
      text: '« ' + l.title + ' » disparaîtra de ta page. Ses statistiques seront perdues.',
      okLabel: 'Supprimer',
    });
    if (!ok) return;
    await run(() => deleteLink(id), 'Lien supprimé', {
      label: 'Annuler',
      run: () => run(() => restoreLink(l), 'Lien restauré'),
    });
  }

  return (
    <>
      <div className="od-stack" style={{ ['--od-gap' as string]: '12px' }}>
        <div className="filters od-rail" role="group" aria-label="Filtrer par catégorie">
          {chips.map((c) => (
            <button key={c.id} type="button" className="fchip" aria-pressed={c.id === active} onClick={() => setFilter(c.id)}>
              <span>{c.name}</span>
              <span className="count">{c.n}</span>
            </button>
          ))}
        </div>
        <p className="list-meta">
          {plural(total, 'lien')} · {plural(vis, 'visible')} sur ta page
        </p>
      </div>

      {!list.length ? (
        <div className="empty">
          <h2>{active === 'all' ? 'Ta page est vide' : 'Aucun lien dans « ' + catName(active) + ' »'}</h2>
          <p>Ajoute un premier lien : il apparaîtra tout de suite sur ta page publique.</p>
          <button className="btn btn-primary" type="button" onClick={() => openEditor(null)}>
            <Icon name="plus" sm />
            Ajouter un lien
          </button>
        </div>
      ) : (
        <ul className="rows">
          {list.map((l, i) => {
            const n = clicks[l.id] ?? 0;
            const visible = shownVisible(l.id, l.visible);
            return (
              <li key={l.id} className={'row' + (visible ? '' : ' is-hidden')}>
                <div className="row-move">
                  <button className="icon-btn" type="button" data-move="up" data-id={l.id} aria-label={'Monter « ' + l.title + ' »'} disabled={i === 0} onClick={() => move(l.id, -1)}>
                    <Icon name="up" sm />
                  </button>
                  <button
                    className="icon-btn"
                    type="button"
                    data-move="down"
                    data-id={l.id}
                    aria-label={'Descendre « ' + l.title + ' »'}
                    disabled={i === list.length - 1}
                    onClick={() => move(l.id, 1)}
                  >
                    <Icon name="down" sm />
                  </button>
                </div>
                <span className="row-ico" aria-hidden="true">
                  <Icon name={linkIcon(l)} />
                </span>
                <div className="row-info">
                  <span className="row-title od-clamp-2">{l.title}</span>
                  <span className="row-url od-truncate">{domain(l.url)}</span>
                  <div className="row-meta">
                    <span className="badge badge-block">{catName(l.category_id)}</span>
                    {l.type === 'featured' && <span className="badge badge-feat">À la une</span>}
                    {l.type === 'product' && <span className="badge badge-prod">Formation</span>}
                    {!visible && <span className="badge badge-off">Masqué</span>}
                    <span className="row-clicks">{plural(n, 'clic')}</span>
                  </div>
                </div>
                <div className="row-actions">
                  <label className="switch" title={visible ? 'Visible' : 'Masqué'}>
                    <input
                      type="checkbox"
                      checked={visible}
                      aria-label={'Afficher « ' + l.title + ' » sur ma page'}
                      onChange={(e) => toggle(l.id, l.visible, e.target.checked)}
                    />
                    <span className="switch-track" aria-hidden="true" />
                  </label>
                  <button className="icon-btn" type="button" aria-label={'Modifier « ' + l.title + ' »'} onClick={() => openEditor({ ...l, visible })}>
                    <Icon name="edit" />
                  </button>
                  <button className="icon-btn danger" type="button" aria-label={'Supprimer « ' + l.title + ' »'} onClick={() => remove(l.id)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
