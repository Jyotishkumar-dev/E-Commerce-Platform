import { test as base, expect } from '@playwright/test';

export const testUser = {
  email: 'test-user@shopvibe.store',
  password: 'Test@123456',
  name: 'Test User',
};

export const testAdmin = {
  email: 'admin@shopvibe.store',
  password: 'Admin@123456',
  name: 'Admin User',
};

export type TestUser = typeof testUser;

export const test = base.extend<{ testUser: TestUser }>({
  testUser: [{ ...testUser }],
});

export { expect, base };
