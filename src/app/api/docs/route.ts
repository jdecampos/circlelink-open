// Documentation Scalar de /api/v1. Version épinglée et empreinte SRI : le navigateur refuse
// le script s'il change sur le CDN. Pour monter de version, recalcule l'empreinte :
// curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
const SCALAR = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.72.4/dist/browser/standalone.js';
const SCALAR_SRI = 'sha384-omTRdD9MbjA1vm12DqRUVvqJlr3VzSixvAdF1Jruu9AJOiJKyTKraIB6DyX+m10M';

const config = {
  url: '/api/v1/openapi.json',
  theme: 'default',
  hideClientButton: false,
  authentication: { preferredSecurityScheme: 'bearerAuth' },
  defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
};

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>CircleLink API — documentation</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="${SCALAR}" integrity="${SCALAR_SRI}" crossorigin="anonymous"></script>
    <script>Scalar.createApiReference('#app', ${JSON.stringify(config)});</script>
  </body>
</html>`;

export function GET() {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
