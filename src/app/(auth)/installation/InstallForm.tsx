'use client';

import { useState, useTransition } from 'react';
import { Icon } from '@/lib/icons';
import { ErrorSummary } from '@/components/forms';
import { install } from './actions';

type Field = { id: 'code' | 'name' | 'email' | 'password'; label: string; type: string; autoComplete: string; hint?: string; placeholder?: string };

const FIELDS: Field[] = [
  { id: 'code', label: 'Code d’installation', type: 'text', autoComplete: 'off', placeholder: 'XXXX-XXXX-…', hint: 'Affiché dans les journaux du conteneur au démarrage (Coolify : onglet « Logs » ; Docker : docker compose logs app).' },
  { id: 'name', label: 'Ton nom', type: 'text', autoComplete: 'name', hint: 'Affiché en haut de ta page. Modifiable ensuite.' },
  { id: 'email', label: 'Adresse email', type: 'email', autoComplete: 'email', placeholder: 'toi@example.com' },
  { id: 'password', label: 'Mot de passe', type: 'password', autoComplete: 'new-password', hint: '8 caractères minimum.' },
];

export default function InstallForm() {
  const [values, setValues] = useState({ code: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      // en cas de succès, l'action redirige vers l'admin
      const res = await install(values);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <section className="od-stack" style={{ ['--od-gap' as string]: '24px' }} aria-labelledby="installTitle">
      <div className="panel-head">
        <h1 id="installTitle">Installation</h1>
        <p>Crée le compte qui gérera cette page. Cet écran ne sert qu’une fois.</p>
      </div>
      <ErrorSummary title="Installation refusée" items={error ? [{ id: 'code', msg: error }] : []} />
      <form noValidate onSubmit={onSubmit}>
        {FIELDS.map((f) => (
          <div className="field" key={f.id}>
            <label className="label" htmlFor={f.id}>
              {f.label}
              <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              className="input"
              id={f.id}
              name={f.id}
              type={f.type}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              required
              spellCheck={false}
              aria-describedby={f.hint ? f.id + 'Hint' : undefined}
              value={values[f.id]}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
            />
            {f.hint && (
              <p className="hint" id={f.id + 'Hint'}>
                {f.hint}
              </p>
            )}
          </div>
        ))}
        <button className="btn btn-primary submit" type="submit" disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Création du compte…
            </>
          ) : (
            <>
              <Icon name="check" sm />
              Créer mon compte
            </>
          )}
        </button>
      </form>
    </section>
  );
}
