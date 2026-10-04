import { useEffect } from 'react';

/** Comptage des clics : beacon vers /api/click, le lien garde sa vraie destination. */
export function useClickTracking() {
  useEffect(() => {
    const inPreview = window.top !== window.self;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-id]');
      if (!a || inPreview) return;
      const body = JSON.stringify({ id: a.dataset.id, ref: document.referrer });
      try {
        if (!navigator.sendBeacon?.('/api/click', body)) {
          fetch('/api/click', { method: 'POST', body, keepalive: true }).catch(() => {});
        }
      } catch {
        // statistiques non bloquantes
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
