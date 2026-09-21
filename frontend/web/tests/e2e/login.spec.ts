/**
 * E2E Test - User Login
 */
import { test, expect } from '@playwright/test';
import { testUser } from './helpers';

test('login: successful authentication', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);

  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Should be redirected after login
  await page.waitForURL(/\/(home|dashboard|)/);

  // User should be visible in authenticated state
  const userName = page.getByText(testUser.name);
  await expect(userName).toBeVisible();
});

test('login: invalid credentials', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/email/i).fill('wrong@email.com');
  await page.getByLabel(/password/i).fill('WrongPass123');

  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Should show error
  const error = page.locator('text=invalid|incorrect|wrong');
  await expect(error).toBeVisible();

  // Should stay on login page
  await expect(page).toHaveURL(/\/login/);
});
