import type { APIRoute } from 'astro';
import { deleteCarImage } from '../../lib/db';
import { getSessionToken, verifySessionToken } from '../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB, SESSION_SECRET } = locals.runtime.env;

  const token = getSessionToken(request);
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const userId = await verifySessionToken(token, SESSION_SECRET || 'fallback-secret');
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { image_id } = await request.json() as { image_id: number };
    if (!image_id) return new Response(JSON.stringify({ error: 'Missing image_id' }), { status: 400 });

    await deleteCarImage(DB, image_id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
};
