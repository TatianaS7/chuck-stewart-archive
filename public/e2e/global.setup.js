import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TEST_EMAIL, TEST_PASSWORD } from "./testCredentials.js";

const AUTH_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth",
  "state.json",
);

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

  // Login via API and capture JWT token
  const loginRes = await fetch("http://localhost:8000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed during global setup: ${loginRes.status}`);
  }

  const loginPayload = await loginRes.json();
  const token = loginPayload?.token;
  const user = loginPayload?.user;

  if (!token) {
    throw new Error("Login payload did not include JWT token");
  }

  // Launch browser, persist auth localStorage, and save authenticated state
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("http://localhost:5173");
  await page.evaluate(
    ({ jwtToken, email, userData }) => {
      localStorage.setItem("archiveAuthToken", jwtToken);
      localStorage.setItem(
        "archiveAuthSession",
        JSON.stringify({
          isAuthenticated: true,
          email,
          userData: userData || null,
        }),
      );
    },
    {
      jwtToken: token,
      email: TEST_EMAIL,
      userData: user || null,
    },
  );

  await page.reload();

  await page.waitForSelector("#print-count", { timeout: 10000 });

  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
