-- DAG Auto D1 Database Schema
-- Run with: wrangler d1 execute dagauto --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  price INTEGER NOT NULL,
  mileage INTEGER NOT NULL DEFAULT 0,
  fuel_type TEXT NOT NULL DEFAULT 'Diesel',
  transmission TEXT NOT NULL DEFAULT 'Manuală',
  body_type TEXT NOT NULL DEFAULT 'Berlină',
  color TEXT DEFAULT '',
  engine_size TEXT DEFAULT '',
  power INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  features TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','sold','reserved')),
  old_price INTEGER DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  -- Câmpuri noi v2
  doors INTEGER DEFAULT 0,
  seats INTEGER DEFAULT 5,
  drivetrain TEXT DEFAULT '',
  vin TEXT DEFAULT '',
  country_origin TEXT DEFAULT '',
  nr_owners INTEGER DEFAULT 0,
  service_history INTEGER NOT NULL DEFAULT 0,
  accident_free INTEGER NOT NULL DEFAULT 1,
  euro_standard TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS car_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('published','draft')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_type TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_make ON cars(make);
CREATE INDEX IF NOT EXISTS idx_cars_slug ON cars(slug);
CREATE INDEX IF NOT EXISTS idx_car_images_car_id ON car_images(car_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_read ON form_submissions(read_at);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(year);
CREATE INDEX IF NOT EXISTS idx_cars_mileage ON cars(mileage);

-- Migration v2: adaugă coloanele noi în baze existente (rulați manual dacă DB există deja)
-- ALTER TABLE cars ADD COLUMN doors INTEGER DEFAULT 0;
-- ALTER TABLE cars ADD COLUMN seats INTEGER DEFAULT 5;
-- ALTER TABLE cars ADD COLUMN drivetrain TEXT DEFAULT '';
-- ALTER TABLE cars ADD COLUMN vin TEXT DEFAULT '';
-- ALTER TABLE cars ADD COLUMN country_origin TEXT DEFAULT '';
-- ALTER TABLE cars ADD COLUMN nr_owners INTEGER DEFAULT 0;
-- ALTER TABLE cars ADD COLUMN service_history INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE cars ADD COLUMN accident_free INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE cars ADD COLUMN euro_standard TEXT DEFAULT '';

-- Default admin user (password: admin123 - CHANGE THIS!)
-- SHA-256 of "admin123" = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a
INSERT OR IGNORE INTO users (username, password_hash)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a');
