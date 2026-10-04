'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/lib/icons';

export type FieldErr = { id: string; msg: string };

/** Message d'erreur sous un champ (affiché par .field.has-error). */
export function FieldError({ id, msg, style }: { id: string; msg?: string; style?: React.CSSProperties }) {
  return (
    <p className="error" id={id} style={style}>
      {msg && (
        <>
          <Icon name="alert" sm />
          <span>{msg}</span>
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
