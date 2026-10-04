'use client';

import { Icon } from '@/lib/icons';
import { FieldError } from '@/components/forms';
import { checkEmail, checkPw, type LoginFlow } from './useLoginFlow';

export default function PasswordForm({ f, canReset }: { f: LoginFlow; canReset: boolean }) {
  const { email, setEmail, pw, setPw, showPw, setShowPw, remember, setRemember, errs, setErr, busy, onPassword, live, fieldCls, setForgotEmail, setView } = f;
  return (
    <form id="formPw" role="tabpanel" aria-labelledby="tabPw" noValidate onSubmit={onPassword}>
      <div className={fieldCls('email')}>
        <label className="label" htmlFor="email">
          Adresse email<span className="req" aria-hidden="true">*</span>
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="toi@example.com"
          required
          aria-describedby="emailErr"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errs.email) setErr('email', checkEmail(e.target.value));
          }}
          {...live('email', checkEmail)}
        />
        <FieldError id="emailErr" msg={errs.email} />
      </div>
      <div className={fieldCls('password')}>
        <label className="label" htmlFor="password">
          Mot de passe<span className="req" aria-hidden="true">*</span>
        </label>
        <div className="pw-wrap">
          <input
            className="input"
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            aria-describedby="pwErr pwHint"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              if (errs.password) setErr('password', checkPw(e.target.value));
            }}
            {...live('password', checkPw)}
          />
          <button
            className="icon-btn pw-toggle"
            type="button"
            aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={showPw}
            onClick={() => setShowPw((s) => !s)}
          >
            <Icon name={showPw ? 'eyeOff' : 'eye'} />
          </button>
        </div>
        <p className="hint" id="pwHint">
          8 caractères minimum.
        </p>
        <FieldError id="pwErr" msg={errs.password} />
      </div>
      <div className="row-between">
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Rester connecté
        </label>
        {canReset && (
          <button
            className="linkbtn"
            type="button"
            onClick={() => {
              setForgotEmail(email);
              setView('forgot');
            }}
          >
            Mot de passe oublié ?
          </button>
        )}
      </div>
      <button className="btn btn-primary submit" type="submit" disabled={!!busy}>
        {busy === 'pw' ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Connexion…
          </>
        ) : busy === 'pw-ok' ? (
          <>
            <Icon name="check" sm />
            Connecté
          </>
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  );
}
