import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const AUTH_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth",
  "state.json",
);

export const TEST_EMAIL =
  process.env.E2E_TEST_EMAIL || "e2e-test@archive.com";
export const TEST_PASSWORD =
  process.env.E2E_TEST_PASSWORD || "E2eTestPass123!";

export default async function globalSetup() {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create the test user via API (409 is fine if it already exists)
  const res = await fetch("http://localhost:8000/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "E2E",
      last_name: "Test",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  const status = res.status;
  if (status !== 201 && status !== 409) {
    throw new Error(`Unexpected status ${status} when creating test user`);
  }

  // Launch browser, log in, and save authenticated state
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:5173");
  await page.waitForSelector("#admin-login", { timeout: 10000 });

  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click("#sign-in-btn");

  await page.waitForSelector("#print-count", { timeout: 10000 });

  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
