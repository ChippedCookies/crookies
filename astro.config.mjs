// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';

// In dev the Cloudflare adapter runs server code inside workerd, where Keystatic's local mode can't write to disk.
// So dev runs on plain Node and only builds use the adapter (production edits go through GitHub, which works in workerd).
const isDev = process.argv.includes('dev');

export default defineConfig({
  site: 'https://crookies.graypuma145.workers.dev',
  output: 'static',
  // Sessions are unused; leaving them on makes the adapter require a KV namespace.
  session: false,
  adapter: isDev ? undefined : cloudflare({ imageService: 'passthrough' }),
  integrations: [react(), markdoc(), keystatic()],
});
