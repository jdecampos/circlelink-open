'use client';

import { useState } from 'react';
import { Icon } from '@/lib/icons';
import { PROVIDERS } from '@/lib/newsletter/providers';
import { disconnectNewsletter, setNewsletterEnabled } from '../newsletter-actions';
import { useAdmin } from '../AdminShell';
import ConnectForm from './ConnectForm';

export default function NewsletterView() {
  const { data, run, confirm } = useAdmin();
  const s = data.newsletterSettings;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const connected = !!s.provider && !s.keyUnreadable;
  const info = s.provider ? PROVIDERS[s.provider] : null;

  async function toggle(enabled: boolean) {
    setBusy(true);
    await run(() => setNewsletterEnabled(enabled), enabled ? 'Inscription affichée sur ta page' : 'Inscription masquée');
    setBusy(false);
  }

  async function disconnect() {
    const ok = await confirm({ title: 'Déconnecter ' + (info?.label ?? 'le service') + ' ?', text: 'La clé est effacée et l’inscription disparaît de ta page.', okLabel: 'Déconnecter' });
    if (ok) await run(disconnectNewsletter, 'Service déconnecté');
  }

  return (
    <div className="od-stack" style={{ ['--od-gap' as string]: '24px' }}>
      <section className="card" aria-labelledby="nlOn">
        <div className="card-head">
          <h2 id="nlOn">Inscription sur ma page</h2>
          <p>Le bloc « Recevoir les nouveautés », en bas de ta page.</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={s.enabled} disabled={!connected || busy} onChange={(e) => toggle(e.target.checked)} />
          <span className="switch-track" aria-hidden="true" />
          <span>Afficher l’inscription sur ma page</span>
        </label>
        {!connected && <p className="hint">Connecte d’abord un service ci-dessous.</p>}
      </section>

      {(s.keyRejected || s.keyUnreadable) && info && (
        <div className="notice" role="alert">
          <Icon name="alert" sm />
          <span>
            <strong>{s.keyUnreadable ? 'La clé enregistrée ne peut plus être lue' : info.label + ' refuse la clé'}</strong> :{' '}
            {s.keyUnreadable ? 'le secret du serveur a changé. ' : 'les inscriptions attendent dans la file. '}Reconnecte ton service avec une clé valide.
          </span>
        </div>
      )}

      {connected && !editing && info ? (
        <section className="card" aria-labelledby="nlSvc">
          <div className="card-head">
            <h2 id="nlSvc">Service d’emailing</h2>
            <p>
              Les inscrits arrivent dans {info.label}, {info.audienceLabel} « {s.audienceName} ».
            </p>
          </div>
          <p className="list-meta">
            Clé enregistrée · <code>…{s.keyHint}</code>
          </p>
          <div className="od-cluster">
            <button className="btn btn-secondary" type="button" onClick={() => setEditing(true)}>
              <Icon name="edit" sm />
              Changer de {info.audienceLabel} ou de clé
            </button>
            <button className="btn btn-ghost" type="button" onClick={disconnect}>
              <Icon name="trash" sm />
              Déconnecter
            </button>
          </div>
        </section>
      ) : (
        <ConnectForm current={connected ? s : null} onDone={() => setEditing(false)} onCancel={connected ? () => setEditing(false) : undefined} />
      )}
    </div>
  );
}
