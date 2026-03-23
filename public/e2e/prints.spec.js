// @ts-check
import { test, expect } from '@playwright/test';

test.use({ storageState: './e2e/.auth/state.json' });

// These tests run with a pre-authenticated browser context (saved by globalSetup).
// The app loads directly into the prints view — no login step needed.

test.describe('Prints view - layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#print-count')).toBeVisible({ timeout: 10000 });
  });

  test('shows the print count', async ({ page }) => {
    await expect(page.locator('#print-count')).toBeVisible();
  });

  test('shows the search input', async ({ page }) => {
    await expect(page.locator('#prints-search-input')).toBeVisible();
  });

  test('shows the filter row with all dropdowns', async ({ page }) => {
    await expect(page.locator('#prints-filter-row')).toBeVisible();

    const selects = page.locator('#prints-filter-row select');
    await expect(selects).toHaveCount(4);
  });

  test('shows the prints container', async ({ page }) => {
    await expect(page.locator('#prints-container')).toBeVisible();
  });

  test('shows view toggle buttons', async ({ page }) => {
    await expect(page.locator('#toggle-views')).toBeVisible();
  });
});

test.describe('Prints view - search and filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#print-count')).toBeVisible({ timeout: 10000 });
  });

  test('typing in the search input filters the print count', async ({
    page,
  }) => {
    const countBefore = await page.locator('#print-count').textContent();

    await page.fill('#prints-search-input', 'XXXXXUNMATCHEDXXXXX');

    // Either the count changes or the no-prints message appears
    const noMsg = page.locator('#no-prints-message');
    const countAfter = await page.locator('#print-count').textContent();

    const filtered = (await noMsg.isVisible()) || countBefore !== countAfter;
    expect(filtered).toBe(true);
  });

  test('clearing the search restores all prints', async ({ page }) => {
    const countBefore = await page.locator('#print-count').textContent();

    await page.fill('#prints-search-input', 'XXXXXUNMATCHEDXXXXX');
    await page.fill('#prints-search-input', '');

    await expect(page.locator('#print-count')).toHaveText(
      countBefore ?? '',
      { timeout: 3000 },
    );
  });

  test('status filter dropdown changes visible prints', async ({ page }) => {
    const statusSelect = page.locator('#prints-filter-row select').first();

    const countBefore = await page.locator('#print-count').textContent();

    await statusSelect.selectOption('Sold');

    const countAfter = await page.locator('#print-count').textContent();
    const noMsg = page.locator('#no-prints-message');

    // Either a different count or no-prints message means the filter worked
    const filtered = (await noMsg.isVisible()) || countBefore !== countAfter;
    expect(filtered).toBe(true);
  });
});

test.describe('Prints view - Add Print form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#toggle-views')).toBeVisible({ timeout: 10000 });

    // Switch to Add Print view
    await page.locator('#toggle-views .view-title', { hasText: 'Add Print' }).click();
    await expect(page.locator('#add-records-form')).toBeVisible({
      timeout: 5000,
    });
  });

  test('shows the Add Print form when toggled', async ({ page }) => {
    await expect(page.locator('#add-records-form')).toBeVisible();
  });

  test('shows all required fields', async ({ page }) => {
    await expect(page.locator('#catalog_number')).toBeVisible();
    await expect(page.locator('#artist')).toBeVisible();
    await expect(page.locator('#date')).toBeVisible();
    await expect(page.locator('#status-dropdown')).toBeVisible();
    await expect(page.locator('#size-dropdown')).toBeVisible();
  });

  test('submit button is disabled when required fields are empty', async ({
    page,
  }) => {
    await expect(page.locator('#submit-record-btn')).toBeDisabled();
  });

  test('submit button becomes enabled when all required fields are filled', async ({
    page,
  }) => {
    await page.selectOption('#status-dropdown', 'Available');
    await page.fill('#catalog_number', 'E2E-TEST-TEMP');
    await page.fill('#artist', 'E2E Artist');
    await page.fill('#date', '1999');
    await page.selectOption('#size-dropdown', '11x14');

    await expect(page.locator('#submit-record-btn')).toBeEnabled();
  });

  test('can submit and delete a new print', async ({ page, request }) => {
    const catalog = `E2E-${Date.now()}`;

    await page.selectOption('#status-dropdown', 'Available');
    await page.fill('#catalog_number', catalog);
    await page.fill('#artist', 'E2E Playwright Artist');
    await page.fill('#date', '1975');
    await page.selectOption('#size-dropdown', '11x14');

    await page.click('#submit-record-btn');

    // Should switch back to prints view and show the new print count
    await expect(page.locator('#prints-container')).toBeVisible({
      timeout: 8000,
    });

    // Clean up: delete the test print via API
    await request.delete(
      `http://localhost:8000/api/prints/${encodeURIComponent(catalog)}`,
    );
  });
});
