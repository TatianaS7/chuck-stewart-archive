// @ts-check
import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/.auth/state.json' });

// These tests run with a pre-authenticated browser context (saved by globalSetup).

test.describe('Profile view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#print-count')).toBeVisible({ timeout: 10000 });
  });

  test('profile button is visible in the navbar when logged in', async ({
    page,
  }) => {
    await expect(page.locator('#profile-btn')).toBeVisible();
  });

  test('clicking the profile button navigates to the profile view', async ({
    page,
  }) => {
    await page.click('#profile-btn');

    // Profile view shows "Admin Controls" heading
    await expect(
      page.locator('.view-title', { hasText: 'Admin Controls' }),
    ).toBeVisible({ timeout: 5000 });
  });

  test('profile view shows the profile layout', async ({ page }) => {
    await page.click('#profile-btn');

    await expect(page.locator('#profile-layout')).toBeVisible({ timeout: 5000 });
  });

  test('navigating back from profile returns to prints view', async ({
    page,
  }) => {
    await page.click('#profile-btn');
    await expect(
      page.locator('.view-title', { hasText: 'Admin Controls' }),
    ).toBeVisible({ timeout: 5000 });

    // Click "All Prints" toggle to go back
    await page.locator('#toggle-views .view-title', { hasText: 'All Prints' }).click();

    await expect(page.locator('#prints-container')).toBeVisible({
      timeout: 5000,
    });
  });
});
