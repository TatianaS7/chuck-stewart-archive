// @ts-check
import { test, expect } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD } from "./testCredentials.js";

// All tests here run with a fresh (unauthenticated) browser context.
// The setup project ensures the test user exists before this suite runs.

test.describe("Auth - unauthenticated state", () => {
  test("shows the login form on initial load", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#admin-login")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#sign-in-btn")).toBeVisible();
  });

  test("login button is enabled before submission", async ({ page }) => {
    await page.goto("/");

    // Button should be present and not disabled before filling fields
    await expect(page.locator("#sign-in-btn")).toBeEnabled();
  });
});

test.describe("Auth - login validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#admin-login")).toBeVisible();
  });

  test("shows validation error for invalid email format", async ({ page }) => {
    await page.fill("#email", "not-an-email");
    await page.fill("#password", "somepassword");
    await page.click("#sign-in-btn");

    // express-validator rejects malformed emails with 400
    await expect(page.locator("#error-msg")).toBeVisible({ timeout: 5000 });
  });

  test("shows error when user does not exist", async ({ page }) => {
    await page.fill("#email", "nonexistent-user@archive.com");
    await page.fill("#password", "WrongPassword123");
    await page.click("#sign-in-btn");

    await expect(page.locator("#error-msg")).toBeVisible({ timeout: 5000 });
  });

  test("shows error for incorrect password", async ({ page }) => {
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", "WrongPassword999!");
    await page.click("#sign-in-btn");

    await expect(page.locator("#error-msg")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Auth - successful login and logout", () => {
  test("logs in with valid credentials and shows prints view", async ({
    page,
  }) => {
    await page.goto("/");

    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click("#sign-in-btn");

    // Prints view should load after successful login
    await expect(page.locator("#print-count")).toBeVisible({ timeout: 10000 });

    // Login form should be gone
    await expect(page.locator("#admin-login")).not.toBeVisible();
  });

  test("logout returns to the login form", async ({ page }) => {
    await page.goto("/");

    // Log in first
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click("#sign-in-btn");
    await expect(page.locator("#print-count")).toBeVisible({ timeout: 10000 });

    // Log out
    await page.click("#sign-out-btn");

    // Login form should appear again
    await expect(page.locator("#admin-login")).toBeVisible({ timeout: 5000 });
  });
});
