'use client';

import { Icon } from '@/lib/icons';
import type { LoginFlow } from './useLoginFlow';

export default function SentView({ f }: { f: LoginFlow }) {
  const { sent, resendIn, resend, back, sentRef } = f;
  return (
    <section className="sent" aria-labelledby="sentTitle" tabIndex={-1} ref={sentRef}>
      <span className="sent-ico">
        <Icon name="mail" />
      </span>
      <h2 id="sentTitle">{sent.title}</h2>
      <p>{sent.text}</p>
      <div className="actions">
        <button className="btn btn-secondary" type="button" disabled={resendIn > 0} onClick={resend}>
          {resendIn > 0 ? 'Renvoyer (' + resendIn + ' s)' : 'Renvoyer'}
        </button>
      </div>
      <button className="linkbtn" type="button" style={{ justifySelf: 'start' }} onClick={back}>
        Utiliser une autre adresse
      </button>
    </section>
  );
}
