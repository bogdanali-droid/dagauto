import type { APIRoute } from 'astro';

// Returns list of WP image records for browser-side migration
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  if (url.searchParams.get('key') !== 'migrate2024dagauto') {
    return new Response('Unauthorized', { status: 401 });
  }

  const DB = locals.runtime?.env?.DB;
  if (!DB) {
    return new Response(JSON.stringify({ error: 'No DB' }), { status: 503 });
  }

  const result = await DB.prepare(
    `SELECT id, car_id, image_url FROM car_images
     WHERE image_url LIKE '%wp-content/uploads%'
     ORDER BY car_id, id`
  ).all();

  const images = ((result.results || []) as any[]).map((row: any) => ({
    id: row.id,
    car_id: row.car_id,
    url: row.image_url,
    filename: row.image_url.split('/').pop(),
  }));

  return new Response(JSON.stringify({ images, total: images.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
