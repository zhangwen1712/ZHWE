import { defineConfig } from 'astro/config';
// The review deployment uses pages.dev until the owner connects the custom domain.
export default defineConfig({ site: process.env.SITE_URL || 'https://zhwe-blog.pages.dev', trailingSlash: 'always' });
