'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon } from '@/lib/icons';

type Action = { label: string; run: () => void };
type Toast = { id: number; msg: string; action?: Action; leaving: boolean };
export type ToastApi = { show: (msg: string, action?: Action) => void; list: Toast[]; close: (id: number) => void };

export function useToasts(): ToastApi {
  const [list, setList] = useState<Toast[]>([]);
  const seq = useRef(0);

  const close = useCallback((id: number) => {
    setList((l) => l.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 160);
  }, []);

  const show = useCallback(
    (msg: string, action?: Action) => {
      const id = ++seq.current;
      setList((l) => [...l, { id, msg, action, leaving: false }]);
      setTimeout(() => close(id), action ? 6000 : 3200);
    },
    [close],
  );

  return useMemo(() => ({ show, list, close }), [show, list, close]);
}

export function Toasts({ api }: { api: ToastApi }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {api.list.map((t) => (
        <div key={t.id} className={'toast' + (t.leaving ? ' is-leaving' : '')}>
          <Icon name="check" sm />
          <span className="toast-msg">{t.msg}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                api.close(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const ToastContext = createContext<ToastApi['show']>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const api = useToasts();
  return (
    <ToastContext.Provider value={api.show}>
      {children}
      <Toasts api={api} />
    </ToastContext.Provider>
  );
}
