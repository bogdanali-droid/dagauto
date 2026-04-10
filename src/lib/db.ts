export interface Car {
  id: number;
  title: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  body_type: string;
  color: string;
  engine_size: string;
  power: number;
  description: string;
  features: string;
  status: 'available' | 'sold' | 'reserved';
  old_price?: number;
  featured?: number;
  // Câmpuri noi v2
  doors?: number;
  seats?: number;
  drivetrain?: string;
  vin?: string;
  country_origin?: string;
  nr_owners?: number;
  service_history?: number;
  accident_free?: number;
  euro_standard?: string;
  created_at: string;
  updated_at: string;
}

export interface CarImage {
  id: number;
  car_id: number;
  image_url: string;
  is_primary: number;
  sort_order: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url: string;
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: number;
  form_type: string;
  data: string;
  created_at: string;
  read_at: string | null;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

// Cars
export async function getCars(db: D1Database, filters?: {
  make?: string;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  min_price?: number;
  max_price?: number;
  min_year?: number;
  max_year?: number;
  min_power?: number;
  max_power?: number;
  drivetrain?: string;
  accident_free?: boolean;
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  let query = 'SELECT c.*, ci.image_url as primary_image FROM cars c LEFT JOIN car_images ci ON c.id = ci.car_id AND ci.is_primary = 1 WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.make) { query += ' AND c.make = ?'; params.push(filters.make); }
  if (filters?.fuel_type) { query += ' AND c.fuel_type = ?'; params.push(filters.fuel_type); }
  if (filters?.transmission) { query += ' AND c.transmission = ?'; params.push(filters.transmission); }
  if (filters?.body_type) { query += ' AND c.body_type = ?'; params.push(filters.body_type); }
  if (filters?.min_price) { query += ' AND c.price >= ?'; params.push(filters.min_price); }
  if (filters?.max_price) { query += ' AND c.price <= ?'; params.push(filters.max_price); }
  if (filters?.min_year) { query += ' AND c.year >= ?'; params.push(filters.min_year); }
  if (filters?.max_year) { query += ' AND c.year <= ?'; params.push(filters.max_year); }
  if (filters?.min_power) { query += ' AND c.power >= ?'; params.push(filters.min_power); }
  if (filters?.max_power) { query += ' AND c.power <= ?'; params.push(filters.max_power); }
  if (filters?.drivetrain) { query += ' AND c.drivetrain = ?'; params.push(filters.drivetrain); }
  if (filters?.accident_free) { query += ' AND c.accident_free = 1'; }
  if (filters?.status) { query += ' AND c.status = ?'; params.push(filters.status); }
  else { query += ' AND c.status = \'available\''; }

  const sortMap: Record<string, string> = {
    'price_asc': 'c.price ASC',
    'price_desc': 'c.price DESC',
    'year_desc': 'c.year DESC',
    'mileage_asc': 'c.mileage ASC',
    'newest': 'c.created_at DESC',
  };
  query += ` ORDER BY ${sortMap[filters?.sort || ''] || 'c.created_at DESC'}`;
  if (filters?.limit) { query += ' LIMIT ?'; params.push(filters.limit); }
  if (filters?.offset) { query += ' OFFSET ?'; params.push(filters.offset); }

  return db.prepare(query).bind(...params).all<Car & { primary_image: string }>();
}

export async function getCarBySlug(db: D1Database, slug: string) {
  return db.prepare('SELECT * FROM cars WHERE slug = ?').bind(slug).first<Car>();
}

export async function getCarById(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM cars WHERE id = ?').bind(id).first<Car>();
}

export async function getCarImages(db: D1Database, carId: number) {
  return db.prepare('SELECT * FROM car_images WHERE car_id = ? ORDER BY sort_order ASC').bind(carId).all<CarImage>();
}

export async function createCar(db: D1Database, car: Omit<Car, 'id' | 'created_at' | 'updated_at'>) {
  return db.prepare(`
    INSERT INTO cars (title, slug, make, model, year, price, mileage, fuel_type, transmission, body_type, color, engine_size, power, description, features, status, old_price, featured, doors, seats, drivetrain, vin, country_origin, nr_owners, service_history, accident_free, euro_standard)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    car.title, car.slug, car.make, car.model, car.year, car.price, car.mileage,
    car.fuel_type, car.transmission, car.body_type, car.color, car.engine_size,
    car.power, car.description, car.features, car.status,
    car.old_price || 0, car.featured || 0,
    car.doors || 0, car.seats || 5, car.drivetrain || '', car.vin || '',
    car.country_origin || '', car.nr_owners || 0,
    car.service_history || 0, car.accident_free ?? 1, car.euro_standard || ''
  ).run();
}

export async function updateCar(db: D1Database, id: number, car: Partial<Omit<Car, 'id' | 'created_at'>>) {
  const fields = Object.keys(car).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(car), new Date().toISOString(), id];
  return db.prepare(`UPDATE cars SET ${fields}, updated_at = ? WHERE id = ?`).bind(...values).run();
}

export async function deleteCar(db: D1Database, id: number) {
  return db.prepare('DELETE FROM cars WHERE id = ?').bind(id).run();
}

export async function addCarImage(db: D1Database, carId: number, imageUrl: string, isPrimary = false, sortOrder = 0) {
  if (isPrimary) {
    await db.prepare('UPDATE car_images SET is_primary = 0 WHERE car_id = ?').bind(carId).run();
  }
  return db.prepare('INSERT INTO car_images (car_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)')
    .bind(carId, imageUrl, isPrimary ? 1 : 0, sortOrder).run();
}

export async function deleteCarImage(db: D1Database, id: number) {
  return db.prepare('DELETE FROM car_images WHERE id = ?').bind(id).run();
}

export async function getDistinctMakes(db: D1Database) {
  return db.prepare('SELECT DISTINCT make FROM cars WHERE status = \'available\' ORDER BY make').all<{ make: string }>();
}

// Blog
export async function getBlogPosts(db: D1Database, status = 'published', limit = 10, offset = 0) {
  return db.prepare('SELECT * FROM blog_posts WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(status, limit, offset).all<BlogPost>();
}

export async function getBlogPostBySlug(db: D1Database, slug: string) {
  return db.prepare('SELECT * FROM blog_posts WHERE slug = ?').bind(slug).first<BlogPost>();
}

export async function getBlogPostById(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM blog_posts WHERE id = ?').bind(id).first<BlogPost>();
}

export async function createBlogPost(db: D1Database, post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) {
  return db.prepare('INSERT INTO blog_posts (title, slug, content, excerpt, image_url, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(post.title, post.slug, post.content, post.excerpt, post.image_url, post.status).run();
}

export async function updateBlogPost(db: D1Database, id: number, post: Partial<Omit<BlogPost, 'id' | 'created_at'>>) {
  const fields = Object.keys(post).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(post), new Date().toISOString(), id];
  return db.prepare(`UPDATE blog_posts SET ${fields}, updated_at = ? WHERE id = ?`).bind(...values).run();
}

export async function deleteBlogPost(db: D1Database, id: number) {
  return db.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();
}

// Form submissions
export async function createFormSubmission(db: D1Database, formType: string, data: Record<string, unknown>) {
  return db.prepare('INSERT INTO form_submissions (form_type, data) VALUES (?, ?)')
    .bind(formType, JSON.stringify(data)).run();
}

export async function getFormSubmissions(db: D1Database, formType?: string, limit = 50, offset = 0) {
  if (formType) {
    return db.prepare('SELECT * FROM form_submissions WHERE form_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(formType, limit, offset).all<FormSubmission>();
  }
  return db.prepare('SELECT * FROM form_submissions ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset).all<FormSubmission>();
}

export async function markSubmissionRead(db: D1Database, id: number) {
  return db.prepare('UPDATE form_submissions SET read_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id).run();
}

// Users
export async function getUserByUsername(db: D1Database, username: string) {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
}

// Slug generation
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ă/g, 'a').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/ș/g, 's').replace(/ț/g, 't')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
