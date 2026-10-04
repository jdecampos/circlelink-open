import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasOwner } from '@/lib/setup/owner';
import InstallForm from './InstallForm';

export const metadata: Metadata = { title: 'Installation — CircleLink' };

// Dépend de la base : jamais pré-rendue (le build n'a pas de base).
export const dynamic = 'force-dynamic';

export default async function InstallationPage() {
  if (await hasOwner()) notFound();
  return <InstallForm />;
}
