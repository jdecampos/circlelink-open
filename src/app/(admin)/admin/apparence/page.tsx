'use client';

import { useState } from 'react';
import { NETWORKS } from '@/lib/links';
import type { Profile } from '@/lib/types';
import { ErrorSummary, FieldError, InfoTip, type FieldErr } from '@/components/forms';
import { saveProfile } from '../actions';
import { useAdmin } from '../AdminShell';
import ApiKeyCard from './ApiKeyCard';
import { PhotoField, SocialsCard, StyleCard } from './sections';

function toForm(p: Profile) {
  return {
    name: p.name,
    handle: p.handle,
    bio: p.bio,
    location: p.location,
    theme: p.theme,
    link_shape: p.link_shape,
    avatar_url: p.avatar_url,
    show_credit: p.show_credit,
    socials: Object.fromEntries(NETWORKS.map((n) => [n.id, (p.socials?.[n.id] ?? '').replace(/^mailto:/, '')])),
  };
}

export default function AppearanceView() {
  const { data } = useAdmin();
  // key : un enregistrement (ou une modif depuis un autre onglet) repart des données serveur
  return (
    <>
      <AppearanceForm key={JSON.stringify(data.profile)} profile={data.profile} />
      <ApiKeyCard apiKey={data.apiKey} />
    </>
  );
}

function AppearanceForm({ profile }: { profile: Profile }) {
  const { run } = useAdmin();
  const [f, setF] = useState(() => toForm(profile));
  const [dirty, setDirty] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<FieldErr[]>([]);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const setErr = (k: string, m: string) => {
    setErrs((e) => ({ ...e, [k]: m }));
    return m;
  };
  const vName = (v = f.name) => setErr('name', v.trim() ? '' : 'Indique le nom à afficher sur ta page.');
  const vHandle = (v = f.handle) => {
    const t = v.trim();
    return setErr('handle', !t ? 'Choisis un identifiant.' : /^[a-z0-9._-]{2,30}$/.test(t) ? '' : 'Format non valide (voir l’aide).');
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const list: FieldErr[] = [];
    const a = vName();
    if (a) list.push({ id: 'apName', msg: a });
    const b = vHandle();
    if (b) list.push({ id: 'apHandle', msg: b });
    setSummary(list);
    if (list.length) return;
    setSaving(true);
    const ok = await run(() => saveProfile(f), 'Profil et apparence enregistrés');
    setSaving(false);
    if (ok) setDirty(false);
  }

  const cls = (k: string) => 'field' + (errs[k] ? ' has-error' : '');

  return (
    <form className="od-stack" style={{ ['--od-gap' as string]: '24px' }} noValidate onSubmit={onSubmit}>
      <ErrorSummary title="Il reste à corriger" items={summary} />

      <section className="card" aria-labelledby="apP">
        <div className="card-head">
          <h2 id="apP">Profil</h2>
          <p>Affiché en haut de ta page.</p>
        </div>
        <div className="form-grid two">
          <div className={cls('name')}>
            <label className="label" htmlFor="apName">
              Nom affiché<span className="req" aria-hidden="true">*</span>
            </label>
            <input
              className="input"
              id="apName"
              maxLength={40}
              aria-describedby="apNameErr"
              aria-invalid={!!errs.name}
              value={f.name}
              onChange={(e) => {
                set('name', e.target.value);
                if (errs.name) vName(e.target.value);
              }}
              onBlur={() => vName()}
            />
            <FieldError id="apNameErr" msg={errs.name} />
          </div>
          <div className={cls('handle')}>
            <label className="label" htmlFor="apHandle">
              Identifiant<span className="req" aria-hidden="true">*</span>
              <InfoTip id="apHandleHint" text="Lettres minuscules, chiffres, point, tiret." />
            </label>
            <div className="prefix">
              <span aria-hidden="true">@</span>
              <input
                className="input"
                id="apHandle"
                maxLength={30}
                aria-describedby="apHandleHint apHandleErr"
                aria-invalid={!!errs.handle}
                autoCapitalize="off"
                spellCheck={false}
                value={f.handle}
                onChange={(e) => {
                  set('handle', e.target.value);
                  if (errs.handle) vHandle(e.target.value);
                }}
                onBlur={() => {
                  const v = f.handle.trim().toLowerCase();
                  setF((x) => ({ ...x, handle: v }));
                  vHandle(v);
                }}
              />
            </div>
            <FieldError id="apHandleErr" msg={errs.handle} />
          </div>
          <div className="field span-2">
            <div className="field-head">
              <label className="label" htmlFor="apBio">
                Bio
              </label>
              <span className="counter">{f.bio.length}/160</span>
            </div>
            <textarea className="textarea" id="apBio" maxLength={160} value={f.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="apLoc">
              Localisation
            </label>
            <input className="input" id="apLoc" maxLength={40} placeholder="Ex. Lyon · en ligne" value={f.location} onChange={(e) => set('location', e.target.value)} />
          </div>
          <PhotoField value={f.avatar_url} onChange={(v) => set('avatar_url', v)} />
        </div>
      </section>

      <SocialsCard socials={f.socials} onChange={(s) => set('socials', s)} />

      <StyleCard
        theme={f.theme}
        shape={f.link_shape}
        credit={f.show_credit}
        onTheme={(v) => set('theme', v)}
        onShape={(v) => set('link_shape', v)}
        onCredit={(v) => set('show_credit', v)}
      />

      <div className="form-bar">
        {dirty && <span className="dirty">Modifications non enregistrées</span>}
        {dirty && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setF(toForm(profile));
              setErrs({});
              setSummary([]);
              setDirty(false);
            }}
          >
            Annuler
          </button>
        )}
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
  );
}
