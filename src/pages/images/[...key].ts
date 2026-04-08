import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const IMAGES = locals.runtime?.env?.IMAGES;
  if (!IMAGES) return new Response('Storage unavailable', { status: 503 });

  const key = params.key;
  if (!key) return new Response('Not found', { status: 404 });

  const object = await IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
};
