import type { APIRoute } from 'astro';
import { addCarImage } from '../../lib/db';
import { getSessionToken, verifySessionToken } from '../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB, IMAGES, SESSION_SECRET } = locals.runtime.env;

  // Auth check
  const token = getSessionToken(request);
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const userId = await verifySessionToken(token, SESSION_SECRET || 'fallback-secret');
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const carId = Number(formData.get('car_id'));
    const isPrimary = formData.get('is_primary') === 'true';

    if (!file || !carId) {
      return new Response(JSON.stringify({ error: 'Missing file or car_id' }), { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `cars/${carId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    await IMAGES.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const imageUrl = `/images/${key}`;
    const sortOrder = Number(formData.get('sort_order') || 0);

    await addCarImage(DB, carId, imageUrl, isPrimary, sortOrder);

    return new Response(JSON.stringify({ success: true, url: imageUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
};
