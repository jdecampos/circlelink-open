'use client';

import { FieldError } from '@/components/forms';
import { checkEmail, type LoginFlow } from './useLoginFlow';

export default function ForgotForm({ f }: { f: LoginFlow }) {
  const { forgotEmail, setForgotEmail, errs, setErr, busy, onForgot, back, live, fieldCls, forgotTitle } = f;
  return (
    <section className="od-stack" style={{ ['--od-gap' as string]: '24px' }} aria-labelledby="forgotTitle">
      <div className="panel-head">
        <h1 id="forgotTitle" tabIndex={-1} ref={forgotTitle}>
          Mot de passe oublié
        </h1>
        <p>Indique ton email : on t’envoie un lien pour en choisir un nouveau.</p>
      </div>
      <form noValidate onSubmit={onForgot}>
        <div className={fieldCls('forgotEmail')}>
          <label className="label" htmlFor="forgotEmail">
            Adresse email<span className="req" aria-hidden="true">*</span>
          </label>
          <input
            className="input"
            id="forgotEmail"
            type="email"
            autoComplete="email"
            placeholder="toi@example.com"
            required
            aria-describedby="forgotErr"
            value={forgotEmail}
            onChange={(e) => {
              setForgotEmail(e.target.value);
              if (errs.forgotEmail) setErr('forgotEmail', checkEmail(e.target.value));
            }}
            {...live('forgotEmail', checkEmail)}
          />
          <FieldError id="forgotErr" msg={errs.forgotEmail} />
        </div>
        <button className="btn btn-primary submit" type="submit" disabled={busy === 'forgot'}>
          {busy === 'forgot' ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Envoi…
            </>
          ) : (
            'Envoyer le lien'
          )}
        </button>
      </form>
      <button className="linkbtn" type="button" style={{ justifySelf: 'start' }} onClick={back}>
        Retour à la connexion
      </button>
    </section>
  );
}
