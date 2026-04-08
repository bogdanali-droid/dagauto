/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  SESSION_SECRET: string;
}

declare namespace App {
  interface Locals extends Runtime {
    user?: { id: number; username: string } | null;
  }
}
