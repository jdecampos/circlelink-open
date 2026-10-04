'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/lib/icons';

export type FieldErr = { id: string; msg: string };

/**
 * Aide d'un champ, en icône à côté du libellé : le texte s'affiche au survol et au focus clavier,
 * sans occuper de ligne sous le champ. Lu par les lecteurs d'écran via `id` (aria-describedby du champ).
 */
export function InfoTip({ id, text }: { id: string; text: string }) {
  return (
    <span className="tip">
      <button className="tip-btn" type="button" aria-label="Aide" aria-describedby={id}>
        <Icon name="info" sm />
      </button>
      <span className="tip-text" role="tooltip" id={id}>
        {text}
      </span>
    </span>
  );
}

/** Message d'erreur d'un champ, sur la ligne du libellé (affiché par .field.has-error). */
export function FieldError({ id, msg, style }: { id: string; msg?: string; style?: React.CSSProperties }) {
  return (
    <p className="error" id={id} style={style}>
      {msg && (
        <>
          <Icon name="alert" sm />
          <span title={msg}>{msg}</span>
        </>
      )}
    </p>
  );
}

/** Résumé d'erreurs : prend le focus, chaque entrée renvoie au champ concerné. */
export function ErrorSummary({ title, items }: { title: string; items: FieldErr[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (items.length) ref.current?.focus();
  }, [items]);
  return (
    <div className={'error-summary' + (items.length ? ' is-visible' : '')} tabIndex={-1} role="alert" ref={ref}>
      <h3>{title}</h3>
      <ul>
        {items.map((i) => (
          <li key={i.id + i.msg}>
            <a
              href={'#' + i.id}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(i.id)?.focus();
              }}
            >
              {i.msg}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
