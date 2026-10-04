import { redirect } from 'next/navigation';
import { loginModes } from '@/lib/features';
import { hasOwner } from '@/lib/setup/owner';
import LoginForm from './LoginForm';

// Dépend de la base (propriétaire créé ou non) : rendue à la requête.
export const dynamic = 'force-dynamic';

export default async function ConnexionPage() {
  if (!(await hasOwner())) redirect('/installation');
  return <LoginForm modes={loginModes()} />;
}
