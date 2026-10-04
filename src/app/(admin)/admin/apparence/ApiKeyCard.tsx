'use client';

import { useState } from 'react';
import { Icon } from '@/lib/icons';
import type { ApiKeyInfo } from '@/lib/types';
import { generateApiKey, revokeApiKey } from '../actions';
import { useAdmin } from '../AdminShell';

// Fuseau fixé : le rendu serveur et le navigateur affichent la même date (pas d'erreur d'hydratation).
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' });

export default function ApiKeyCard({ apiKey }: { apiKey: ApiKeyInfo | null }) {
  const { confirm, toast, run } = useAdmin();
  // la clé en clair n'existe que dans cet état, le temps de la copier
  const [fresh, setFresh] = useState('');
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (apiKey) {
      const ok = await confirm({ title: 'Regénérer la clé ?', text: 'L’ancienne clé cessera de fonctionner tout de suite. Pense à mettre à jour tes outils.', okLabel: 'Regénérer' });
      if (!ok) return;
    }
    setBusy(true);
    const res = await generateApiKey();
    setBusy(false);
    if (!res.ok) return toast(res.error);
    setFresh(res.key ?? '');
  }

  async function revoke() {
    const ok = await confirm({ title: 'Révoquer la clé ?', text: 'Les outils qui l’utilisent ne pourront plus modifier ta page.', okLabel: 'Révoquer' });
    if (!ok) return;
    if (await run(revokeApiKey, 'Clé révoquée')) setFresh('');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fresh);
      toast('Clé copiée');
    } catch {
      toast('Copie impossible : sélectionne la clé et copie-la à la main.');
    }
  }

  return (
    <section className="card" aria-labelledby="apK">
      <div className="card-head">
        <h2 id="apK">Clé API</h2>
        <p>
          Pour remplir ta page depuis un script ou un outil d’automatisation.{' '}
          <a href="/api/docs" target="_blank" rel="noopener">
            Voir la documentation
          </a>
        </p>
      </div>

      {fresh ? (
        <div className="od-stack">
          <div className="notice" role="status">
            <Icon name="lock" sm />
            <span>
              <strong>Copie-la maintenant :</strong> elle ne sera plus affichée. Si tu la perds, regénère-en une.
            </span>
          </div>
          <div className="od-row">
            <label className="sr-only" htmlFor="apKey">
              Ta clé API
            </label>
            <input className="input" id="apKey" readOnly value={fresh} spellCheck={false} onFocus={(e) => e.target.select()} style={{ fontFamily: 'var(--font-mono)' }} />
            <button className="btn btn-secondary" type="button" onClick={copy}>
              Copier
            </button>
          </div>
        </div>
      ) : (
        apiKey && (
          <p className="list-meta">
            <code>{apiKey.prefix}…</code> · créée le {when(apiKey.created_at)} · {apiKey.last_used_at ? 'utilisée le ' + when(apiKey.last_used_at) : 'jamais utilisée'}
          </p>
        )
      )}

      <div className="od-cluster">
        <button className={'btn ' + (apiKey ? 'btn-secondary' : 'btn-primary')} type="button" onClick={generate} disabled={busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name={apiKey ? 'refresh' : 'plus'} sm />}
          {apiKey ? 'Regénérer' : 'Générer une clé'}
        </button>
        {apiKey && (
          <button className="btn btn-ghost" type="button" onClick={revoke}>
            <Icon name="trash" sm />
            Révoquer
          </button>
        )}
      </div>
    </section>
  );
}
