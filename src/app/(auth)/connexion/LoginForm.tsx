'use client';

import Link from 'next/link';
import { Icon } from '@/lib/icons';
import { ToastProvider } from '@/components/Toasts';
import { ErrorSummary } from '@/components/forms';
import type { LoginModes } from '@/lib/features';
import ForgotForm from './ForgotForm';
import MagicLinkForm from './MagicLinkForm';
import PasswordForm from './PasswordForm';
import SentView from './SentView';
import { useLoginFlow } from './useLoginFlow';

export default function LoginForm({ modes }: { modes: LoginModes }) {
  return (
    <ToastProvider>
      <Login modes={modes} />
    </ToastProvider>
  );
}

function Login({ modes }: { modes: LoginModes }) {
  const f = useLoginFlow();
  const magic = modes.magicLink && f.magic;
  return (
    <>
      <Link className="back" href="/">
        <Icon name="arrowRight" sm />
        Retour à ma page
      </Link>

      {f.view === 'login' && (
        <section className="od-stack" style={{ ['--od-gap' as string]: '24px' }} aria-labelledby="loginTitle">
          <div className="panel-head">
            <h1 id="loginTitle">Connexion</h1>
            <p>Accède à ton espace pour gérer tes liens.</p>
          </div>

          {modes.magicLink && (
            <div
              className="segmented"
              role="tablist"
              aria-label="Méthode de connexion"
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  f.setTab(!f.magic);
                  setTimeout(() => document.getElementById(!f.magic ? 'tabMagic' : 'tabPw')?.focus());
                }
              }}
            >
              <button type="button" role="tab" id="tabPw" aria-selected={!f.magic} aria-controls="formPw" tabIndex={f.magic ? -1 : 0} onClick={() => f.setTab(false)}>
                Mot de passe
              </button>
              <button type="button" role="tab" id="tabMagic" aria-selected={f.magic} aria-controls="formMagic" tabIndex={f.magic ? 0 : -1} onClick={() => f.setTab(true)}>
                Lien magique
              </button>
            </div>
          )}

          <ErrorSummary title={f.summaryTitle} items={f.summary} />

          {!magic ? <PasswordForm f={f} canReset={modes.reset} /> : <MagicLinkForm f={f} />}
        </section>
      )}

      {f.view === 'sent' && <SentView f={f} />}
      {f.view === 'forgot' && modes.reset && <ForgotForm f={f} />}
    </>
  );
}
