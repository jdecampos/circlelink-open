'use client';

import { useState } from 'react';
import { Icon } from '@/lib/icons';
import { plural } from '@/lib/links';
import { FieldError } from '@/components/forms';
import { createCategory, deleteCategory, renameCategory, swapCategories } from '../actions';
import { useAdmin } from '../AdminShell';
import { catNameError } from '../categoryName';

export default function CategoriesView() {
  const { data, run, confirm, toast, filter, setFilter } = useAdmin();
  const { categories, links } = data;
  const [name, setName] = useState('');
  const [addErr, setAddErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [renameErr, setRenameErr] = useState('');
  const countIn = (id: string) => links.filter((l) => l.category_id === id).length;

  const focusLater = (sel: string) => requestAnimationFrame(() => document.querySelector<HTMLElement>(sel)?.focus());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const m = catNameError(name, categories);
    setAddErr(m);
    if (m) return document.getElementById('catAddIn')?.focus();
    setAdding(true);
    const ok = await run(() => createCategory(name), 'Catégorie « ' + name.trim() + ' » créée');
    setAdding(false);
    if (ok) setName('');
    document.getElementById('catAddIn')?.focus();
  }

  function startRename(id: string, current: string) {
    setRenaming(id);
    setRenameVal(current);
    setRenameErr('');
    requestAnimationFrame(() => {
      const i = document.getElementById('renIn') as HTMLInputElement | null;
      i?.focus();
      i?.select();
    });
  }

  function cancelRename() {
    const was = renaming;
    setRenaming(null);
    focusLater(`[data-rename="${was}"]`);
  }

  async function saveRename(id: string) {
    const m = catNameError(renameVal, categories, id);
    setRenameErr(m);
    if (m) return document.getElementById('renIn')?.focus();
    if (await run(() => renameCategory(id, renameVal), 'Catégorie renommée')) {
      setRenaming(null);
      focusLater(`[data-rename="${id}"]`);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const i = categories.findIndex((c) => c.id === id);
    const other = categories[i + dir];
    if (!other) return;
    await run(() => swapCategories(id, other.id));
    requestAnimationFrame(() => {
      const btn = document.querySelector<HTMLButtonElement>(`[data-cmove="${dir < 0 ? 'up' : 'down'}"][data-id="${id}"]`);
      const alt = document.querySelector<HTMLButtonElement>(`[data-cmove="${dir < 0 ? 'down' : 'up'}"][data-id="${id}"]`);
      (btn && !btn.disabled ? btn : alt)?.focus();
    });
  }

  async function remove(id: string) {
    const c = categories.find((x) => x.id === id)!;
    if (categories.length === 1) return toast('Garde au moins une catégorie pour classer tes liens');
    const n = countIn(id);
    const others = categories.filter((x) => x.id !== id);
    const ok = await confirm({
      title: 'Supprimer « ' + c.name + ' » ?',
      text: n ? 'L’onglet disparaît de ta page. Choisis où ranger ses liens.' : 'L’onglet disparaît de ta page. Elle ne contient aucun lien.',
      okLabel: 'Supprimer',
      moveTo: n ? { label: 'Déplacer ses ' + plural(n, 'lien') + ' vers', options: others } : undefined,
    });
    if (!ok) return;
    if (await run(() => deleteCategory(id, n ? ok.moveTo : null), 'Catégorie supprimée')) {
      if (filter === id) setFilter('all');
    }
  }

  return (
    <>
      <section className="card" aria-labelledby="catAddTitle">
        <div className="card-head">
          <h2 id="catAddTitle">Nouvelle catégorie</h2>
          <p>Courte et claire : elle devient un onglet sur ta page (24 caractères max).</p>
        </div>
        <form noValidate onSubmit={add}>
          <div className={'field' + (addErr ? ' has-error' : '')}>
            <label className="label" htmlFor="catAddIn">
              Nom
            </label>
            <div className="cat-add">
              <input
                className="input"
                id="catAddIn"
                maxLength={24}
                placeholder="Ex. Podcast"
                aria-describedby="catAddErr"
                aria-invalid={!!addErr}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (addErr) setAddErr(catNameError(e.target.value, categories));
                }}
              />
              <button className="btn btn-primary" type="submit" disabled={adding}>
                <Icon name="plus" sm />
                Ajouter
              </button>
            </div>
            <FieldError id="catAddErr" msg={addErr} />
          </div>
        </form>
      </section>

      <section className="od-stack" style={{ ['--od-gap' as string]: '8px' }} aria-label="Ordre des catégories">
        <p className="list-meta">L’ordre ci-dessous est celui des onglets et des sections de ta page.</p>
        <ul className="rows">
          {categories.map((c, i) => {
            if (renaming === c.id) {
              return (
                <li key={c.id} className="cat-row">
                  <div className={'cat-edit field' + (renameErr ? ' has-error' : '')}>
                    <label className="label" htmlFor="renIn">
                      Renommer « {c.name} »
                    </label>
                    <input
                      className="input"
                      id="renIn"
                      maxLength={24}
                      aria-describedby="renErr"
                      aria-invalid={!!renameErr}
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveRename(c.id);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                    />
                    <button className="btn btn-primary" type="button" onClick={() => saveRename(c.id)}>
                      Enregistrer
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={cancelRename}>
                      Annuler
                    </button>
                    <FieldError id="renErr" msg={renameErr} style={{ gridColumn: '1/-1' }} />
                  </div>
                </li>
              );
            }
            const n = countIn(c.id);
            return (
              <li key={c.id} className="cat-row">
                <div className="od-field">
                  <span className="cat-name">{c.name}</span>
                  <span className="cat-count">{plural(n, 'lien')}</span>
                </div>
                <div className="row-actions">
                  <button className="icon-btn" type="button" data-cmove="up" data-id={c.id} aria-label={'Monter « ' + c.name + ' »'} disabled={i === 0} onClick={() => move(c.id, -1)}>
                    <Icon name="up" sm />
                  </button>
                  <button
                    className="icon-btn"
                    type="button"
                    data-cmove="down"
                    data-id={c.id}
                    aria-label={'Descendre « ' + c.name + ' »'}
                    disabled={i === categories.length - 1}
                    onClick={() => move(c.id, 1)}
                  >
                    <Icon name="down" sm />
                  </button>
                  <button className="icon-btn" type="button" data-rename={c.id} aria-label={'Renommer « ' + c.name + ' »'} onClick={() => startRename(c.id, c.name)}>
                    <Icon name="edit" />
                  </button>
                  <button className="icon-btn danger" type="button" aria-label={'Supprimer « ' + c.name + ' »'} onClick={() => remove(c.id)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
