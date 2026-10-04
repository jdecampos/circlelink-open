'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth/logout';
import { Icon } from '@/lib/icons';
import type { ActionResult, AdminData, LinkItem } from '@/lib/types';
import { ToastProvider, useToast } from '@/components/Toasts';
import { displayName } from '@/lib/brand';
import AdminSidebar, { NAV } from './AdminSidebar';
import ConfirmDialog, { type ConfirmOptions } from './ConfirmDialog';
import LinkEditor from './LinkEditor';


type Admin = {
  data: AdminData;
  /** Filtre actif de la vue « Mes liens » (partagé avec le tiroir pour la catégorie par défaut). */
  filter: string;
  setFilter: (id: string) => void;
  openEditor: (l: LinkItem | null) => void;
  confirm: (o: ConfirmOptions) => Promise<false | { moveTo: string | null }>;
  toast: ReturnType<typeof useToast>;
  /** Lance une action serveur ; en cas d'échec affiche l'erreur. Rafraîchit l'aperçu. */
  run: (fn: () => Promise<ActionResult>, ok?: string, action?: { label: string; run: () => void }) => Promise<boolean>;
};

const AdminContext = createContext<Admin | null>(null);
export const useAdmin = () => useContext(AdminContext)!;

export default function AdminShell(props: { data: AdminData; children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Shell {...props} />
    </ToastProvider>
  );
}

function Shell({ data, children }: { data: AdminData; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const preview = useRef<HTMLIFrameElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<{ link: LinkItem | null; n: number } | null>(null);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: false | { moveTo: string | null }) => void }) | null>(null);

  const nav = NAV.find((n) => n.href === pathname) ?? NAV[0];

  // focus sur le titre à chaque changement de vue (pas au premier chargement)
  const firstView = useRef(true);
  useEffect(() => {
    document.title = nav.title + ' — ' + displayName(data.profile.name);
    if (firstView.current) firstView.current = false;
    else titleRef.current?.focus({ preventScroll: true });
  }, [nav.title, data.profile.name]);

  const reloadPreview = useCallback(() => {
    try {
      preview.current?.contentWindow?.location.reload();
    } catch {
      // aperçu indisponible
    }
  }, []);

  const run = useCallback<Admin['run']>(
    async (fn, ok, action) => {
      const res = await fn();
      if (!res.ok) {
        toast(res.error);
        return false;
      }
      reloadPreview();
      if (ok) toast(ok, action);
      return true;
    },
    [toast, reloadPreview],
  );

  const confirm = useCallback<Admin['confirm']>((o) => new Promise((resolve) => setConfirmState({ ...o, resolve })), []);
  const openEditor = useCallback((link: LinkItem | null) => setEditing((e) => ({ link, n: (e?.n ?? 0) + 1 })), []);

  async function onLogout() {
    await logout();
    router.push('/connexion');
    router.refresh();
  }

  const name = displayName(data.profile.name);
  const initial = name.charAt(0).toUpperCase();

  return (
    <AdminContext.Provider value={{ data, filter, setFilter, openEditor, confirm, toast, run }}>
      <div className="app">
        <AdminSidebar current={nav.href} email={data.email} initial={initial} name={name} onLogout={onLogout} />

        <main className="main" id="main">
          <div className="main-inner">
            <header className="main-head">
              <div>
                <h1 tabIndex={-1} ref={titleRef}>
                  {nav.title}
                </h1>
                <p>{nav.desc}</p>
              </div>
              {nav.href === '/admin' && (
                <button className="btn btn-primary" type="button" onClick={() => openEditor(null)}>
                  <Icon name="plus" sm />
                  Ajouter un lien
                </button>
              )}
            </header>
            <div className="od-stack" style={{ ['--od-gap' as string]: '24px' }}>
              {children}
            </div>
          </div>
        </main>

        <aside className="preview" aria-label="Aperçu de ma page">
          <div className="preview-head">
            <span className="preview-title">
              <span className="live-dot" aria-hidden="true" />
              Aperçu en direct
            </span>
            <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener">
              Ouvrir
              <Icon name="external" sm />
            </a>
          </div>
          <div className="preview-frame">
            <iframe ref={preview} src="/?preview=1" title="Aperçu de ma page publique" />
          </div>
        </aside>
      </div>

      {editing && (
        <LinkEditor
          key={editing.n}
          link={editing.link}
          onClose={() => setEditing(null)}
          onSaved={() => {
            if (pathname !== '/admin') router.push('/admin');
          }}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onDone={(v) => {
            confirmState.resolve(v);
            setConfirmState(null);
          }}
        />
      )}
    </AdminContext.Provider>
  );
}
