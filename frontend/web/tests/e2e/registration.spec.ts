/**
 * E2E Test - User Registration
 */
import { test, expect } from '@playwright/test';
import { testUser } from './helpers';

test('registration: successful account creation', async ({ page }) => {
  // Navigate to registration page
  await page.goto('/register');

  // Fill registration form
  await page.getByLabel(/name/i).fill(testUser.name);
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);
  await page.getByLabel(/confirm password/i).fill(testUser.password);

  // Submit form
  await page.getByRole('button', { name: /sign up|register|create account/i }).click();

  // Should redirect to home or dashboard after successful registration
  await page.waitForURL(/\/(home|dashboard|)/);

  // User should be visible (authenticated state)
  const userName = page.getByText(testUser.name);
  await expect(userName).toBeVisible();

  // Verify account exists by checking authenticated state
  await expect(page.getByLabel(/email/i)).toHaveValue(testUser.email);
});

test('registration: rejects duplicate email', async ({ page }) => {
  await page.goto('/register');

  await page.getByLabel(/name/i).fill('Another User');
  await page.getByLabel(/email/i).fill('test@shopvibe.store'); // Known existing email
  await page.getByLabel(/password/i).fill('Password123');
  await page.getByLabel(/confirm password/i).fill('Password123');

  await page.getByRole('button', { name: /sign up|register/i }).click();

  // Should show error message
  const error = page.locator('text=already exists|email is taken|duplicate');
  await expect(error).toBeVisible();
});
