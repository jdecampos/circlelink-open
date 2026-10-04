import { trackClick } from '@/lib/db/queries/clicks';
import { detectSource } from '@/lib/source';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Comptage d'un clic, envoyé par navigator.sendBeacon depuis la page publique.
 * Les liens pointent directement vers leur destination (aucune redirection) :
 * c'est ce qui évite les avertissements « lien dangereux » des applis sociales.
 */
export async function POST(req: Request) {
  let id = '';
  let ref: string | null = null;
  try {
    const body = JSON.parse((await req.text()).slice(0, 4096));
    id = String(body.id ?? '');
    ref = typeof body.ref === 'string' ? body.ref.slice(0, 512) : null;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!UUID.test(id)) return new Response(null, { status: 400 });

  const source = detectSource(req.headers.get('user-agent') ?? '', ref);
  // un lien masqué ou inconnu n'est simplement pas compté
  await trackClick(id, source);
  return new Response(null, { status: 204 });
}
