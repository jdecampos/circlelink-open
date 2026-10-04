'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/lib/icons';
import { isSafeUrl, normalizeUrl } from '@/lib/links';
import type { LinkItem, LinkType } from '@/lib/types';
import { ErrorSummary, FieldError, type FieldErr } from '@/components/forms';
import { createCategory, saveLink } from './actions';
import { useAdmin } from './AdminShell';
import { catNameError } from './categoryName';

const HINTS: Record<LinkType, string> = {
  link: 'Un bouton simple, rangé dans sa catégorie.',
  featured: 'Grande carte en haut de ta page. Idéal pour ton offre du moment.',
  product: 'Carte avec visuel, description et prix : pour une formation ou un produit.',
};

/** Tiroir : ajouter / modifier un lien */
export default function LinkEditor({ link, onClose, onSaved }: { link: LinkItem | null; onClose: () => void; onSaved: () => void }) {
  const { data, filter, run, toast } = useAdmin();
  const ref = useRef<HTMLDialogElement>(null);
  const titleIn = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<LinkType>(link?.type ?? 'link');
  const [title, setTitle] = useState(link?.title ?? '');
  const [url, setUrl] = useState(link?.url ?? '');
  const [cat, setCat] = useState(link?.category_id ?? (filter !== 'all' ? filter : (data.categories[0]?.id ?? '')));
  const [desc, setDesc] = useState(link?.description ?? '');
  const [price, setPrice] = useState(link?.price ?? '');
  const [visible, setVisible] = useState(link?.visible ?? true);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<FieldErr[]>([]);
  const [saving, setSaving] = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newCatErr, setNewCatErr] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    titleIn.current?.focus();
    return () => {
      if (back && document.contains(back)) back.focus();
    };
  }, []);

  function close() {
    ref.current?.close();
    onClose();
  }

  const setErr = (k: string, m: string) => {
    setErrs((e) => ({ ...e, [k]: m }));
    return m;
  };
  const vTitle = (v = title) => setErr('title', v.trim() ? '' : 'Donne un titre au lien : c’est le texte du bouton.');
  const vUrl = (v = url) => {
    const t = v.trim();
    return setErr('url', !t ? 'Indique l’adresse vers laquelle mène le lien.' : isSafeUrl(t) ? '' : 'Adresse invalide. Exemple : https://monsite.fr/page');
  };
  const vCat = (v = cat) => setErr('cat', v ? '' : 'Choisis ou crée une catégorie.');

  async function createInline() {
    const m = catNameError(newCat, data.categories);
    setNewCatErr(m);
    if (m) return document.getElementById('newCatIn')?.focus();
    setCreating(true);
    const res = await createCategory(newCat);
    setCreating(false);
    if (!res.ok) return setNewCatErr(res.error);
    toast('Catégorie « ' + newCat.trim() + ' » créée');
    setCat(res.id!);
    setErr('cat', '');
    setNewCat('');
    setNewCatOpen(false);
    setTimeout(() => document.getElementById('edCat')?.focus());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = normalizeUrl(url);
    setUrl(u);
    const list: FieldErr[] = [];
    const a = vTitle();
    if (a) list.push({ id: 'edTitleIn', msg: a });
    const b = vUrl(u);
    if (b) list.push({ id: 'edUrl', msg: b });
    const c = vCat();
    if (c) list.push({ id: 'edCat', msg: c });
    setSummary(list);
    if (list.length) return;

    setSaving(true);
    const ok = await run(
      () => saveLink({ id: link?.id, type, title, url: u, category_id: cat, description: desc, price, visible }),
      link ? 'Lien mis à jour' : visible ? 'Lien ajouté à ta page' : 'Lien ajouté (masqué)',
    );
    setSaving(false);
    if (ok) {
      onSaved();
      close();
    }
  }

  const fieldCls = (k: string) => 'field' + (errs[k] ? ' has-error' : '');

  return (
    <dialog
      className="drawer"
      ref={ref}
      aria-labelledby="edTitle"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <form noValidate onSubmit={onSubmit}>
        <div className="drawer-head">
          <h2 id="edTitle">{link ? 'Modifier le lien' : 'Ajouter un lien'}</h2>
          <button className="icon-btn" type="button" aria-label="Fermer" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-body">
          <ErrorSummary title="Il reste à corriger" items={summary} />

          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="label" style={{ marginBottom: 6 }}>
              Format
            </legend>
            <div className="segmented">
              {(
                [
                  ['link', 'Lien'],
                  ['featured', 'À la une'],
                  ['product', 'Formation'],
                ] as const
              ).map(([v, label]) => (
                <label key={v}>
                  <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="hint">{HINTS[type]}</p>
          </fieldset>

          <div className={fieldCls('title')}>
            <div className="field-head">
              <label className="label" htmlFor="edTitleIn">
                Titre<span className="req" aria-hidden="true">*</span>
              </label>
              <span className="counter">{title.length}/70</span>
            </div>
            <input
              className="input"
              id="edTitleIn"
              ref={titleIn}
              maxLength={70}
              required
              aria-describedby="titleErr"
              aria-invalid={!!errs.title}
              placeholder="Ex. Ma chaîne YouTube"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errs.title) vTitle(e.target.value);
              }}
              onBlur={() => title && vTitle()}
            />
            <FieldError id="titleErr" msg={errs.title} />
          </div>

          <div className={fieldCls('url')}>
            <label className="label" htmlFor="edUrl">
              Adresse (URL)<span className="req" aria-hidden="true">*</span>
            </label>
            <input
              className="input"
              id="edUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              required
              aria-describedby="urlErr urlHint"
              aria-invalid={!!errs.url}
              placeholder="https://"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errs.url) vUrl(e.target.value);
              }}
              onBlur={() => {
                const u = normalizeUrl(url);
                setUrl(u);
                if (u) vUrl(u);
              }}
            />
            <p className="hint" id="urlHint">
              https:// est ajouté automatiquement si tu l’oublies.
            </p>
            <FieldError id="urlErr" msg={errs.url} />
          </div>

          <div className={fieldCls('cat')}>
            <label className="label" htmlFor="edCat">
              Catégorie<span className="req" aria-hidden="true">*</span>
            </label>
            <div className="cat-line">
              <select
                className="select"
                id="edCat"
                required
                aria-describedby="catErr"
                aria-invalid={!!errs.cat}
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  vCat(e.target.value);
                }}
              >
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary"
                type="button"
                aria-expanded={newCatOpen}
                aria-controls="newCat"
                onClick={() => {
                  setNewCatOpen((o) => !o);
                  if (!newCatOpen) setTimeout(() => document.getElementById('newCatIn')?.focus());
                }}
              >
                Nouvelle
              </button>
            </div>
            <FieldError id="catErr" msg={errs.cat} />
            <div className="newcat" id="newCat" hidden={!newCatOpen}>
              <label className="label" htmlFor="newCatIn">
                Nom de la nouvelle catégorie
              </label>
              <div className="newcat-row">
                <input
                  className="input"
                  id="newCatIn"
                  maxLength={24}
                  placeholder="Ex. Podcast"
                  aria-describedby="newCatErr"
                  aria-invalid={!!newCatErr}
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      createInline();
                    }
                  }}
                />
                <button className="btn btn-primary" type="button" disabled={creating} onClick={createInline}>
                  Créer
                </button>
              </div>
              <FieldError id="newCatErr" msg={newCatErr} style={{ display: newCatErr ? 'flex' : 'none' }} />
            </div>
          </div>

          <div className="field" hidden={type === 'link'}>
            <div className="field-head">
              <label className="label" htmlFor="edDesc">
                Description
              </label>
              <span className="counter">{desc.length}/140</span>
            </div>
            <textarea
              className="textarea"
              id="edDesc"
              maxLength={140}
              placeholder="Une phrase qui donne envie de cliquer."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="field" hidden={type !== 'product'}>
            <label className="label" htmlFor="edPrice">
              Prix affiché
            </label>
            <input
              className="input"
              id="edPrice"
              maxLength={20}
              placeholder="Ex. 49 €"
              aria-describedby="priceHint"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="hint" id="priceHint">
              Optionnel. Laisse vide pour ne rien afficher.
            </p>
          </div>

          <label className="switch">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            <span>Afficher sur ma page</span>
          </label>
        </div>
        <div className="drawer-foot">
          <button className="btn btn-secondary" type="button" onClick={close}>
            Annuler
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}
