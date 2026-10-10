import type { APIRoute } from 'astro';
import { adsTxt } from '~/lib/ads';

export const GET: APIRoute = () =>
  new Response(adsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
