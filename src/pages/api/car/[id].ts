import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  const DB = locals.runtime?.env?.DB;
  if (!DB) return new Response(JSON.stringify({ error: 'No DB' }), { status: 500 });

  const id = Number(params.id);
  if (!id) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });

  try {
    const car = await DB.prepare(
      'SELECT c.*, ci.image_url as primary_image FROM cars c LEFT JOIN car_images ci ON c.id = ci.car_id AND ci.is_primary = 1 WHERE c.id = ?'
    ).bind(id).first();

    if (!car) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(car), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
