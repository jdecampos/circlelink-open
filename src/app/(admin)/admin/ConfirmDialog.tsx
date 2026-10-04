'use client';

import { useEffect, useRef, useState } from 'react';

export type ConfirmOptions = {
  title: string;
  text: string;
  okLabel: string;
  /** Liste « Déplacer ses liens vers » affichée lors de la suppression d'une catégorie. */
  moveTo?: { label: string; options: { id: string; name: string }[] };
};

export default function ConfirmDialog({ title, text, okLabel, moveTo, onDone }: ConfirmOptions & { onDone: (v: false | { moveTo: string | null }) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState(moveTo?.options[0]?.id ?? '');

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    cancelBtn.current?.focus();
    return () => {
      if (back && document.contains(back)) back.focus();
    };
  }, []);

  function done(v: false | { moveTo: string | null }) {
    ref.current?.close();
    onDone(v);
  }

  return (
    <dialog
      className="dialog-confirm"
      ref={ref}
      aria-labelledby="cTitle"
      aria-describedby="cText"
      onCancel={(e) => {
        e.preventDefault();
        done(false);
      }}
    >
      <div className="dlg-body">
        <h2 id="cTitle" style={{ fontSize: 'var(--fs-xl)' }}>
          {title}
        </h2>
        <p id="cText" style={{ color: 'var(--fg-2)' }}>
          {text}
        </p>
        {moveTo && (
          <div className="field">
            <label className="label" htmlFor="moveTo">
              {moveTo.label}
            </label>
            <select className="select" id="moveTo" value={target} onChange={(e) => setTarget(e.target.value)}>
              {moveTo.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" type="button" ref={cancelBtn} onClick={() => done(false)}>
          Annuler
        </button>
        <button className="btn btn-danger" type="button" onClick={() => done({ moveTo: moveTo ? target : null })}>
          {okLabel}
        </button>
      </div>
    </dialog>
  );
}
