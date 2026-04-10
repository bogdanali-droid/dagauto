import type { APIRoute } from 'astro';

// One-time migration: download WP images → upload to R2 → update DB URLs
// Protected with a secret key passed as ?key=SECRET
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

  const results: any[] = [];
  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get all images with WP URLs
    const images = await DB.prepare(
      `SELECT id, car_id, image_url, is_primary FROM car_images
       WHERE image_url LIKE '%wp-content/uploads%'
       ORDER BY car_id, id`
    ).all();

    const records = (images.results || []) as any[];

    for (const img of records) {
      const wpUrl: string = img.image_url;

      try {
        // Fetch the image from WP server
        const response = await fetch(wpUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 DAGAuto-Migration/1.0' }
        });

        if (!response.ok) {
          results.push({ id: img.id, url: wpUrl, status: `fetch_failed_${response.status}` });
          failed++;
          continue;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();

        // Build R2 key from original filename
        const filename = wpUrl.split('/').pop() || `img-${img.id}.jpg`;
        const r2Key = `cars/${img.car_id}/${filename}`;

        // Upload to R2
        await IMAGES.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType }
        });

        const newUrl = `/images/${r2Key}`;

        // Update DB
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

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    summary: { migrated, failed, skipped, total: migrated + failed + skipped },
    results
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
