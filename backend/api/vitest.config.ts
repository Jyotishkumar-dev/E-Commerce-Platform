import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
    globals: true,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        'postgresql://smart_commerce:smart_commerce@localhost:5432/smart_commerce?schema=public',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test-secret-key-for-testing-at-least-32-chars-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-at-least-32-chars-long',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-api-key',
      CLOUDINARY_API_SECRET: 'test-api-secret',
    },
  },
});
