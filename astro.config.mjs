import { defineConfig } from 'astro/config';
// Production uses the custom domain; SITE_URL can still override it for previews.
export default defineConfig({ site: process.env.SITE_URL || 'https://zhwe.top', trailingSlash: 'always' });
