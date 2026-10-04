'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/lib/icons';
import { EMAIL_RE } from '@/lib/links';
import { subscribe } from '@/lib/newsletter/subscribe';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    try {
      const already = localStorage.getItem('cb-subscribed');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage local après hydratation
      if (already) setDone(already);
    } catch {
      // stockage indisponible
    }
  }, []);

  function validate(v = email) {
    const t = v.trim();
    let msg = '';
    if (!t) msg = 'Indique ton adresse email pour t’inscrire.';
    else if (!EMAIL_RE.test(t)) msg = 'Cette adresse semble incomplète. Exemple : prenom@example.com';
    setErr(msg);
    return !msg;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      document.getElementById('nlEmail')?.focus();
      return;
    }
    setBusy(true);
    const v = email.trim();
    const res = await subscribe({ email: v, referrer: document.referrer });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    try {
      localStorage.setItem('cb-subscribed', v);
    } catch {
      // mode privé
    }
    setDone(v);
  }

  return (
    <section className="newsletter" aria-labelledby="nlTitle">
      <h2 id="nlTitle">Recevoir les nouveautés</h2>
      <p>Un email quand une formation, un template ou un live sort. Pas plus.</p>
      {done ? (
        <div className="nl-success" role="status">
          <Icon name="check" />
          <div>
            <strong>C’est noté !</strong>
            <p>Tu recevras les nouveautés à {done}.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className={'field' + (err ? ' has-error' : '')}>
            <label className="label" htmlFor="nlEmail">
              Ton adresse email
            </label>
            <div className="nl-row">
              <input
                className="input"
                id="nlEmail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="toi@example.com"
                aria-describedby="nlErr"
                aria-invalid={!!err}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (err) validate(e.target.value);
                }}
                onBlur={() => email.trim() && validate()}
              />
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Inscription…
                  </>
                ) : (
                  'M’inscrire'
                )}
              </button>
            </div>
            <p className="error" id="nlErr">
              {err && (
                <>
                  <Icon name="alert" sm />
                  <span>{err}</span>
                </>
              )}
            </p>
          </div>
        </form>
      )}
      <p className="hint">En t’inscrivant, tu acceptes de recevoir ces emails. Désinscription en un clic, à tout moment.</p>
    </section>
  );
}
