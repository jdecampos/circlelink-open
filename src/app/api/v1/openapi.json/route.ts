import { openApiDocument } from '@/lib/api/openapi';

// Public : le document ne contient aucun secret, et chaque route exige une clé.
export function GET() {
  return Response.json(openApiDocument());
}
