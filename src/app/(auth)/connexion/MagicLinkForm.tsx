'use client';

import { FieldError } from '@/components/forms';
import { checkEmail, type LoginFlow } from './useLoginFlow';

export default function MagicLinkForm({ f }: { f: LoginFlow }) {
  const { magicEmail, setMagicEmail, errs, setErr, busy, onMagic, live, fieldCls } = f;
  return (
    <form id="formMagic" role="tabpanel" aria-labelledby="tabMagic" noValidate onSubmit={onMagic}>
      <p className="muted">Reçois un lien de connexion à usage unique. Pas de mot de passe à retenir.</p>
      <div className={fieldCls('magicEmail')}>
        <label className="label" htmlFor="magicEmail">
          Adresse email<span className="req" aria-hidden="true">*</span>
        </label>
        <input
          className="input"
          id="magicEmail"
          type="email"
          autoComplete="email"
          placeholder="toi@example.com"
          required
          aria-describedby="magicErr"
          value={magicEmail}
          onChange={(e) => {
            setMagicEmail(e.target.value);
            if (errs.magicEmail) setErr('magicEmail', checkEmail(e.target.value));
          }}
          {...live('magicEmail', checkEmail)}
        />
        <FieldError id="magicErr" msg={errs.magicEmail} />
      </div>
      <button className="btn btn-primary submit" type="submit" disabled={busy === 'magic'}>
        {busy === 'magic' ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Envoi…
          </>
        ) : (
          'Recevoir le lien'
        )}
      </button>
    </form>
  );
}
