'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/lib/icons';
import { authClient } from '@/lib/auth/client';
import { ErrorSummary, FieldError } from '@/components/forms';

/** Arrivée depuis l'email « mot de passe oublié » : Better Auth y renvoie avec ?token=… (ou ?error=INVALID_TOKEN). */
export default function NewPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [fail, setFail] = useState('');
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const EXPIRED = 'Ce lien a expiré. Redemande un email depuis la page de connexion.';

  // page statique : le jeton n'est lisible qu'après hydratation
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(q.get('token') ?? '');
    if (q.get('error') || !q.get('token')) setFail(EXPIRED);
  }, [EXPIRED]);

  const check = (v: string) =>
    !v ? 'Choisis un mot de passe.' : v.length < 8 ? 'Le mot de passe fait au moins 8 caractères (' + v.length + ' saisis).' : '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const m = check(pw);
    setErr(m);
    if (m) return document.getElementById('password')?.focus();
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: pw, token });
    setBusy(false);
    if (error) {
      setFail(error.status === 400 ? EXPIRED : 'Enregistrement impossible : ' + (error.message ?? 'réessaie dans un instant.'));
      return;
    }
    // les sessions sont révoquées au changement de mot de passe : on se reconnecte
    router.push('/connexion?mdp=ok');
  }

  return (
    <>
      <a className="back" href="/connexion">
        <Icon name="arrowRight" sm />
        Retour à la connexion
      </a>
      <section className="od-stack" style={{ ['--od-gap' as string]: '24px' }} aria-labelledby="npTitle">
        <div className="panel-head">
          <h1 id="npTitle">Nouveau mot de passe</h1>
          <p>Choisis le mot de passe de ton espace.</p>
        </div>
        <ErrorSummary title="Impossible d’enregistrer" items={fail ? [{ id: 'password', msg: fail }] : []} />
        <form noValidate onSubmit={onSubmit}>
          <div className={'field' + (err ? ' has-error' : '')}>
            <label className="label" htmlFor="password">
              Mot de passe<span className="req" aria-hidden="true">*</span>
            </label>
            <div className="pw-wrap">
              <input
                className="input"
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                aria-describedby="pwErr pwHint"
                aria-invalid={!!err}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  if (err) setErr(check(e.target.value));
                }}
              />
              <button
                className="icon-btn pw-toggle"
                type="button"
                aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={show}
                onClick={() => setShow((s) => !s)}
              >
                <Icon name={show ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            <p className="hint" id="pwHint">
              8 caractères minimum.
            </p>
            <FieldError id="pwErr" msg={err} />
          </div>
          <button className="btn btn-primary submit" type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer et continuer'
            )}
          </button>
        </form>
      </section>
    </>
  );
}
