import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    db: {
      provider: 'postgresql',
      adapter: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tfxhub_demo',
    },
  },
});
