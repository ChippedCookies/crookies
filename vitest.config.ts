/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// configFile: false skips astro.config.mjs; its Cloudflare adapter would boot workerd inside the test run.
export default getViteConfig(
  {
    test: {
      include: ['tests/unit/**/*.test.ts'],
    },
  },
  { configFile: false },
);
