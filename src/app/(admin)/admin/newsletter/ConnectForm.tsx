'use client';

import { useState } from 'react';
import type { NewsletterSettingsView, ProviderId } from '@/lib/db/queries/newsletter-settings';
import type { Audience } from '@/lib/newsletter/connectors/types';
import { Icon } from '@/lib/icons';
import { PROVIDER_LIST, PROVIDERS } from '@/lib/newsletter/providers';
import { checkNewsletterKey, saveNewsletter } from '../newsletter-actions';
import { useAdmin } from '../AdminShell';

/** Brancher un service : choix, clé, « Vérifier », liste, enregistrement. La clé ne revient jamais du serveur. */
export default function ConnectForm({ current, onDone, onCancel }: { current: NewsletterSettingsView | null; onDone: () => void; onCancel?: () => void }) {
  const { run } = useAdmin();
  const [provider, setProvider] = useState<ProviderId>(current?.provider ?? 'brevo');
  const [key, setKey] = useState('');
  const [audiences, setAudiences] = useState<Audience[] | null>(null);
  const [audienceId, setAudienceId] = useState('');
  const [enabled, setEnabled] = useState(current?.enabled ?? true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'' | 'check' | 'save'>('');
  const info = PROVIDERS[provider];
  // même service : la clé enregistrée peut servir sans la recoller
  const canReuseKey = current?.provider === provider;

  function choose(p: ProviderId) {
    setProvider(p);
    setAudiences(null);
    setAudienceId('');
    setError('');
  }

  async function check() {
    setBusy('check');
    setError('');
    const res = await checkNewsletterKey(provider, key);
    setBusy('');
    if (!res.ok) return setError(res.error);
    setAudiences(res.audiences);
    setAudienceId(res.audiences[0]?.id ?? '');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('save');
    const ok = await run(() => saveNewsletter({ provider, key: key || undefined, audienceId, enabled }), info.label + ' connecté');
    setBusy('');
    if (ok) {
      setKey('');
      onDone();
    }
  }

  return (
    <form className="card" aria-labelledby="nlCx" noValidate onSubmit={save}>
      <div className="card-head">
        <h2 id="nlCx">Connecter mon service d’emailing</h2>
        <p>Les inscrits de ta page arrivent directement dans ta liste, chez le service que tu utilises déjà.</p>
      </div>

      <fieldset className="choices">
        <legend>Service</legend>
        {PROVIDER_LIST.map((p) => (
          <label className="choice" key={p.id}>
            <input type="radio" name="provider" value={p.id} checked={provider === p.id} onChange={() => choose(p.id)} />
            <span className="choice-row">
              <span>{p.label}</span>
              <span className="choice-tick">
                <Icon name="check" />
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className={'field' + (error ? ' has-error' : '')}>
        <label className="label" htmlFor="nlKey">
          Clé API {info.label}
        </label>
        <div className="od-row">
          <input
            className="input od-fill"
            id="nlKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={canReuseKey ? 'Clé enregistrée · …' + current?.keyHint : 'Colle ta clé ici'}
            aria-describedby="nlKeyHint nlKeyErr"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setAudiences(null);
            }}
          />
          <button className="btn btn-secondary" type="button" onClick={check} disabled={!!busy || (!key && !canReuseKey)}>
            {busy === 'check' ? <span className="spinner" aria-hidden="true" /> : <Icon name="check" sm />}
            Vérifier
          </button>
        </div>
        <p className="hint" id="nlKeyHint">
          {info.keyHelp.text}{' '}
          <a href={info.keyHelp.url} target="_blank" rel="noopener">
            Ouvrir {info.label}
          </a>
        </p>
        <p className="error" id="nlKeyErr" role="alert">
          {error && (
            <>
              <Icon name="alert" sm />
              <span>{error}</span>
            </>
          )}
        </p>
      </div>

      {audiences && (
        <>
          <div className="field">
            <label className="label" htmlFor="nlAud">
              {info.audienceLabel.charAt(0).toUpperCase() + info.audienceLabel.slice(1)} de destination
            </label>
            <select className="select" id="nlAud" value={audienceId} onChange={(e) => setAudienceId(e.target.value)}>
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.count !== null ? ` (${a.count.toLocaleString('fr-FR')} abonnés)` : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            <span>Afficher l’inscription sur ma page</span>
          </label>
        </>
      )}

      <div className="form-bar">
        {onCancel && (
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button className="btn btn-primary" type="submit" disabled={!audiences || !audienceId || !!busy}>
          {busy === 'save' ? <span className="spinner" aria-hidden="true" /> : null}
          Enregistrer
        </button>
      </div>
    </form>
  );
}
