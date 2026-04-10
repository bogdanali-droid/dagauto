import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env;
  const DB = env?.DB;
  const IMAGES = env?.IMAGES;

  let carCount = 0;
  let imageCount = 0;
  let sampleImages: any[] = [];
  let sampleCars: any[] = [];

  try {
    if (DB) {
      const cars = await DB.prepare('SELECT COUNT(*) as cnt FROM cars').first<{cnt: number}>();
      carCount = cars?.cnt || 0;

      const imgs = await DB.prepare('SELECT COUNT(*) as cnt FROM car_images').first<{cnt: number}>();
      imageCount = imgs?.cnt || 0;

      const sample = await DB.prepare('SELECT id, title, slug FROM cars LIMIT 5').all();
      sampleCars = sample.results || [];

      const sampleImg = await DB.prepare('SELECT car_id, image_url, is_primary FROM car_images LIMIT 5').all();
      sampleImages = sampleImg.results || [];
    }
  } catch (e: any) {
    sampleCars = [{ error: e.message }];
  }

  let r2Test = 'not tested';
  try {
    if (IMAGES) {
      const list = await IMAGES.list({ limit: 3 });
      r2Test = `OK - ${list.objects?.length ?? 0} objects found`;
    } else {
      r2Test = 'IMAGES binding missing!';
    }
  } catch (e: any) {
    r2Test = `ERROR: ${e.message}`;
  }

  return new Response(JSON.stringify({
    runtime: !!locals.runtime,
    DB_available: !!DB,
    IMAGES_available: !!IMAGES,
    r2_test: r2Test,
    db_cars_count: carCount,
    db_images_count: imageCount,
    sample_cars: sampleCars,
    sample_images: sampleImages,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
