// @ts-check
import { test, expect } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./testCredentials.js";

test.use({ storageState: "./e2e/.auth/state.json" });

const API = "http://localhost:8000/api";

async function getAuthToken(request) {
  await request.post(`${API}/auth`, {
    data: {
      first_name: "E2E",
      last_name: "Test",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  const loginRes = await request.post(`${API}/auth/login`, {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });

  const payload = await loginRes.json();
  return payload.token;
}

// These tests run with a pre-authenticated browser context (saved by globalSetup).
// The app loads directly into the prints view — no login step needed.

test.describe("Prints view - layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#print-count")).toBeVisible({ timeout: 10000 });
  });

  test("shows the print count", async ({ page }) => {
    await expect(page.locator("#print-count")).toBeVisible();
  });

  test("shows the search input", async ({ page }) => {
    await expect(page.locator("#prints-search-input")).toBeVisible();
  });

  test("shows the filter row with all dropdowns", async ({ page }) => {
    await expect(page.locator("#prints-filter-row")).toBeVisible();

    const selects = page.locator("#prints-filter-row select");
    await expect(selects).toHaveCount(4);
  });

  test("shows the prints container", async ({ page }) => {
    await expect(page.locator("#prints-container")).toBeVisible();
  });

  test("shows view toggle buttons", async ({ page }) => {
    await expect(page.locator("#toggle-views")).toBeVisible();
  });
});

test.describe("Prints view - search and filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#print-count")).toBeVisible({ timeout: 10000 });
  });

  test("typing in the search input filters the print count", async ({
    page,
  }) => {
    const countBefore = await page.locator("#print-count").textContent();

    await page.fill("#prints-search-input", "XXXXXUNMATCHEDXXXXX");

    // Either the count changes or the no-prints message appears
    const noMsg = page.locator("#no-prints-message");
    const countAfter = await page.locator("#print-count").textContent();

    const filtered = (await noMsg.isVisible()) || countBefore !== countAfter;
    expect(filtered).toBe(true);
  });

  test("clearing the search restores all prints", async ({ page }) => {
    const countBefore = await page.locator("#print-count").textContent();

    await page.fill("#prints-search-input", "XXXXXUNMATCHEDXXXXX");
    await page.fill("#prints-search-input", "");

    await expect(page.locator("#print-count")).toHaveText(countBefore ?? "", {
      timeout: 3000,
    });
  });

  test("status filter dropdown changes visible prints", async ({ page }) => {
    const statusSelect = page.locator("#prints-filter-row select").first();

    const countBefore = await page.locator("#print-count").textContent();

    await statusSelect.selectOption("Sold");

    const countAfter = await page.locator("#print-count").textContent();
    const noMsg = page.locator("#no-prints-message");

    // Either a different count or no-prints message means the filter worked
    const filtered = (await noMsg.isVisible()) || countBefore !== countAfter;
    expect(filtered).toBe(true);
  });
});

test.describe("Prints view - Add Print form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#toggle-views")).toBeVisible({ timeout: 10000 });

    // Switch to Add Print view
    await page
      .locator("#toggle-views .view-title", { hasText: "Add Print" })
      .click();
    await expect(page.locator("#add-records-form")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows the Add Print form when toggled", async ({ page }) => {
    await expect(page.locator("#add-records-form")).toBeVisible();
  });

  test("shows all required fields", async ({ page }) => {
    await expect(page.locator("#catalog_number")).toBeVisible();
    await expect(page.locator("#artist")).toBeVisible();
    await expect(page.locator("#date")).toBeVisible();
    await expect(page.locator("#status-dropdown")).toBeVisible();
    await expect(page.locator("#size-dropdown")).toBeVisible();
  });

  test("submit button is disabled when required fields are empty", async ({
    page,
  }) => {
    await expect(page.locator("#submit-record-btn")).toBeDisabled();
  });

  test("submit button becomes enabled when all required fields are filled", async ({
    page,
  }) => {
    await page.selectOption("#status-dropdown", "Available");
    await page.fill("#catalog_number", "E2E-TEST-TEMP");
    await page.fill("#artist", "E2E Artist");
    await page.fill("#date", "1999");
    await page.selectOption("#size-dropdown", "11x14");

    await expect(page.locator("#submit-record-btn")).toBeEnabled();
  });

  test("can submit and delete a new print", async ({ page, request }) => {
    const catalog = `E2E-${Date.now()}`;

    await page.selectOption("#status-dropdown", "Available");
    await page.fill("#catalog_number", catalog);
    await page.fill("#artist", "E2E Playwright Artist");
    await page.fill("#date", "1975");
    await page.selectOption("#size-dropdown", "11x14");

    await page.click("#submit-record-btn");

    // Should switch back to prints view and show the new print count
    await expect(page.locator("#prints-container")).toBeVisible({
      timeout: 8000,
    });

    // Clean up: delete the test print via API
    const token = await getAuthToken(request);
    await request.delete(`${API}/prints/${encodeURIComponent(catalog)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });
});

test.describe("Prints view - Update Print certificate conversion flow", () => {
  test("submits DOCX certificate payload with filename from update form", async ({
    page,
    request,
  }) => {
    const catalog = `E2E-UPDATE-CERT-${Date.now()}`;
    const token = await getAuthToken(request);

    const createRes = await request.post(`${API}/prints`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        status: "Available",
        catalog_number: catalog,
        artist: "E2E Update Cert Artist",
        date: "1977",
        size: "11x14",
      },
    });
    expect(createRes.status()).toBe(200);

    let capturedPayload = null;

    await page.route("**/api/prints/update/**", async (route) => {
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...capturedPayload,
        }),
      });
    });

    await page.goto("/");
    await expect(page.locator("#prints-container")).toBeVisible({
      timeout: 10000,
    });

    const card = page.locator(".card", { hasText: catalog }).first();
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.scrollIntoViewIfNeeded();
    await card.getByRole("button", { name: "Edit" }).click();

    const updateModal = page.locator(".modal.show").first();
    await expect(updateModal).toBeVisible({ timeout: 8000 });
    await expect(
      updateModal.locator(".modal-title", { hasText: "Update Print" }),
    ).toBeVisible();

    await updateModal
      .getByRole("button", { name: "+ Add Certificate" })
      .click();

    const docxBytes = Buffer.from("PK\u0003\u0004E2E-DOCX-CONTENT");
    await updateModal.locator("#certificate").setInputFiles({
      name: "single-certificate.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docxBytes,
    });

    await updateModal.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => capturedPayload !== null).toBe(true);
    expect(capturedPayload?.certificateFileName).toBe(
      "single-certificate.docx",
    );
    expect(capturedPayload?.certificate).toContain(
      "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,",
    );

    await request.delete(`${API}/prints/${encodeURIComponent(catalog)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });
});
