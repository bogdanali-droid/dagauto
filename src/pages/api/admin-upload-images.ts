import type { APIRoute } from 'astro';

// Admin endpoint: upload images to R2 and update DB
// Matches by filename to existing car_images records
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const DB = env?.DB;
  const IMAGES = env?.IMAGES;

  if (!DB || !IMAGES) {
    return new Response(JSON.stringify({ error: 'Missing DB or IMAGES binding' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  const formData = await request.formData();
  const results: any[] = [];

  const files = formData.getAll('images') as File[];

  if (!files || files.length === 0) {
    return new Response(JSON.stringify({ error: 'No files uploaded' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  for (const file of files) {
    const filename = file.name;

    try {
      // Find matching DB record by filename in URL
      const record = await DB.prepare(
        `SELECT id, car_id, image_url FROM car_images
         WHERE image_url LIKE ?`
      ).bind(`%${filename}`).first() as any;

      if (!record) {
        results.push({ filename, status: 'no_match' });
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const contentType = file.type || 'image/jpeg';
      const r2Key = `cars/${record.car_id}/${filename}`;

      await IMAGES.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType }
      });

      const newUrl = `/images/${r2Key}`;

      await DB.prepare(
        'UPDATE car_images SET image_url = ? WHERE id = ?'
      ).bind(newUrl, record.id).run();

      results.push({ filename, car_id: record.car_id, status: 'ok', new_url: newUrl });

    } catch (err: any) {
      results.push({ filename, status: 'error', error: err.message });
    }
  }

  const ok = results.filter(r => r.status === 'ok').length;
  const noMatch = results.filter(r => r.status === 'no_match').length;
  const errors = results.filter(r => r.status === 'error').length;

  return new Response(JSON.stringify({
    summary: { ok, no_match: noMatch, errors, total: results.length },
    results
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
