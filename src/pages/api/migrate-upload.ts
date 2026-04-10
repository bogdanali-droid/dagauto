import type { APIRoute } from 'astro';

// Receives a single image from browser, uploads to R2, updates DB
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const DB = env?.DB;
  const IMAGES = env?.IMAGES;

  if (!DB || !IMAGES) {
    return new Response('Missing bindings', { status: 503 });
  }

  const formData = await request.formData();
  const id = formData.get('id') as string;
  const car_id = formData.get('car_id') as string;
  const filename = formData.get('filename') as string;
  const imageFile = formData.get('image') as File;

  if (!id || !car_id || !filename || !imageFile) {
    return new Response('Missing fields', { status: 400 });
  }

  const arrayBuffer = await imageFile.arrayBuffer();
  const contentType = imageFile.type || 'image/jpeg';
  const r2Key = `cars/${car_id}/${filename}`;

  await IMAGES.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType }
  });

  const newUrl = `/images/${r2Key}`;

  await DB.prepare(
    'UPDATE car_images SET image_url = ? WHERE id = ?'
  ).bind(newUrl, parseInt(id)).run();

  return new Response(JSON.stringify({ ok: true, new_url: newUrl }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
