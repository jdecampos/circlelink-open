'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/lib/icons';
import { logout as endSession } from '@/lib/auth/logout';

export default function Forbidden() {
  const router = useRouter();
  async function logout() {
    await endSession();
    router.push('/connexion');
    router.refresh();
  }
  return (
    <main className="main">
      <div className="main-inner">
        <div className="empty">
          <h2>Espace réservé</h2>
          <p>Ce compte n’est pas le propriétaire de cette page. Connecte-toi avec l’adresse du propriétaire.</p>
          <button className="btn btn-primary" type="button" onClick={logout}>
            <Icon name="logout" sm />
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}
