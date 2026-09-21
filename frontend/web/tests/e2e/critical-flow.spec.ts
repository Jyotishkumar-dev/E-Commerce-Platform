/**
 * Critical E2E Flow: Register → Login → Browse → Add to Cart → Checkout → Confirm
 */
import { test, expect } from '@playwright/test';
import { testUser } from './helpers';

test('critical flow: registration to order confirmation', async ({ page }) => {
  // 1. Register
  await page.goto('/register');
  await page.getByLabel(/name/i).fill(testUser.name);
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);
  await page.getByLabel(/confirm password/i).fill(testUser.password);
  await page.getByRole('button', { name: /sign up|register/i }).click();
  await page.waitForURL(/\/(home|dashboard|)/);

  // 2. Login (if redirected to login after registration)
  if (page.url().includes('/login')) {
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/password/i).fill(testUser.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(/\/(home|dashboard|)/);
  }

  // 3. Browse product
  await page.goto('/');
  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards.first()).toBeVisible();
  await productCards.first().click();
  await expect(page).toHaveURL(/\/product\/.*/);

  // 4. Add to cart
  await page.getByRole('button', { name: /add to cart/i }).click();
  const cartBadge = page.locator('[data-testid="cart-count"]');
  await expect(cartBadge).not.toHaveText('0');

  // 5. Open cart
  await page.getByRole('link', { name: /cart|shopping cart/i }).click();
  await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible();

  // 6. Checkout
  await page.getByRole('button', { name: /checkout|proceed to checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // 7. Add address
  const addressSection = page.locator('[data-testid="address-section"]');
  if (await addressSection.isVisible()) {
    await page.getByRole('button', { name: /add address|select address/i }).click();
    await page.getByLabel(/full name/i).fill(testUser.name);
    await page.getByLabel(/phone/i).fill('+919876543210');
    await page.getByLabel(/address line 1/i).fill('123 Main Street');
    await page.getByLabel(/city/i).fill('Bangalore');
    await page.getByLabel(/state/i).fill('Karnataka');
    await page.getByLabel(/pincode|postal/i).fill('560001');
    await page.getByRole('button', { name: /save|continue/i }).click();
  }

  // 8. Review order
  await page.getByRole('button', { name: /review|continue/i }).first().click();

  // 9. Select COD payment
  await page.getByRole('radio', { name: /cash on delivery|cod/i }).check();

  // 10. Place order
  await page.getByRole('button', { name: /place order|confirm order/i }).click();

  // 11. Order confirmation
  await expect(page.getByText(/order placed|order confirmed|thank you/i)).toBeVisible();
});
