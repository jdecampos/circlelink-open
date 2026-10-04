import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';

// Healthcheck (docker-compose.yml, hébergeur) : l'app répond ET joint sa base.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    // le détail (adresse, identifiants) ne sort jamais : seulement l'état
    return Response.json({ ok: false, error: 'base injoignable' }, { status: 503 });
  }
}
