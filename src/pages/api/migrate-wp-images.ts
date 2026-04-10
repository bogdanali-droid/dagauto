import type { APIRoute } from 'astro';

// One-time migration: download WP images → upload to R2 → update DB URLs
// Protected with a secret key passed as ?key=SECRET
// Use ?offset=0&limit=10 to process in batches
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (key !== 'migrate2024dagauto') {
    return new Response('Unauthorized', { status: 401 });
  }

  const env = locals.runtime?.env;
  const DB = env?.DB;
  const IMAGES = env?.IMAGES;

  if (!DB || !IMAGES) {
    return new Response(JSON.stringify({ error: 'Missing DB or IMAGES binding' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  const results: any[] = [];
  let migrated = 0;
  let failed = 0;

  try {
    // Get batch of images with WP URLs
    const images = await DB.prepare(
      `SELECT id, car_id, image_url, is_primary FROM car_images
       WHERE image_url LIKE '%wp-content/uploads%'
       ORDER BY car_id, id
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    const records = (images.results || []) as any[];

    // Get total count
    const countRow = await DB.prepare(
      `SELECT COUNT(*) as cnt FROM car_images WHERE image_url LIKE '%wp-content/uploads%'`
    ).first<{ cnt: number }>();
    const remaining = (countRow?.cnt || 0) - offset - records.length;

    for (const img of records) {
      const wpUrl: string = img.image_url;

      try {
        const response = await fetch(wpUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 DAGAuto-Migration/1.0' },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          results.push({ id: img.id, url: wpUrl, status: `fetch_failed_${response.status}` });
          failed++;
          continue;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();

        const filename = wpUrl.split('/').pop() || `img-${img.id}.jpg`;
        const r2Key = `cars/${img.car_id}/${filename}`;

        await IMAGES.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType }
        });

        const newUrl = `/images/${r2Key}`;

        await DB.prepare(
          'UPDATE car_images SET image_url = ? WHERE id = ?'
        ).bind(newUrl, img.id).run();

        results.push({ id: img.id, old: wpUrl, new: newUrl, status: 'ok' });
        migrated++;

      } catch (err: any) {
        results.push({ id: img.id, url: wpUrl, status: 'error', error: err.message });
        failed++;
      }
    }

    const nextOffset = offset + records.length;

    return new Response(JSON.stringify({
      summary: { migrated, failed, processed: records.length, offset, nextOffset, remaining },
      next: remaining > 0
        ? `/api/migrate-wp-images?key=migrate2024dagauto&offset=${nextOffset}&limit=${limit}`
        : null,
      results
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
