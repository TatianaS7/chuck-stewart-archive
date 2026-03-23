import { test, expect } from "@playwright/test";

test.use({ storageState: './e2e/.auth/state.json' });

/** @typedef {import('@playwright/test').APIRequestContext} APIRequestContext */

// All tests run with the pre-authenticated browser context from global.setup.js.

const API = "http://localhost:8000/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {string} prefix */
function uniqueCatalog(prefix) {
  return `E2E-BULK-${prefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

/**
 * POST /api/prints/bulk/import with a single clean row.
 * Returns the catalog_number that was created so the caller can clean up.
 * @param {APIRequestContext} request
 * @param {Record<string, unknown>} overrides
 */
async function bulkImportRecord(request, overrides = {}) {
  const catalog = /** @type {string} */ (overrides.catalog_number) || uniqueCatalog("RECORD");

  const res = await request.post(`${API}/prints/bulk/import`, {
    data: {
      rows: [
        {
          status: overrides.status || "Available",
          catalog_number: catalog,
          artist: overrides.artist || "Bulk E2E Artist",
          date: overrides.date || "1978",
          size: overrides.size || "11x14",
          location: overrides.location || null,
          instrument: overrides.instrument || null,
          notes: overrides.notes || "Created by Playwright",
          date_sold: overrides.date_sold || null,
          category: overrides.category || "Musicians",
          signed: overrides.signed || false,
        },
      ],
    },
  });

  return { res, catalog };
}

/**
 * Fetch a single print record by catalog number. Returns null when not found.
 * @param {APIRequestContext} request
 * @param {string} catalog
 */
async function getPrint(request, catalog) {
  const all = await request.get(`${API}/prints/all`);
  const body = await all.json();
  const prints = body.allPrints ?? body;
  return (
    /** @type {Record<string, unknown>[]} */ (Array.isArray(prints) ? prints : []).find(
      (p) => p.catalog_number === catalog,
    ) ?? null
  );
}

/**
 * Delete a print via the API. Silently ignores 404.
 * @param {APIRequestContext} request
 * @param {string} catalog
 */
async function deletePrint(request, catalog) {
  await request.delete(
    `${API}/prints/${encodeURIComponent(catalog)}`,
  );
}

// ---------------------------------------------------------------------------
// UI — Bulk Upload section layout
// ---------------------------------------------------------------------------

test.describe("Bulk Upload – UI layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#print-count")).toBeVisible({ timeout: 10000 });

    // Navigate: profile button → Bulk Upload sidebar item
    await page.click("#profile-btn");
    await expect(
      page.locator(".view-title", { hasText: "Admin Controls" }),
    ).toBeVisible({ timeout: 5000 });

    await page.locator(".admin-panel-btn", { hasText: "Bulk Upload" }).click();
    await expect(page.locator("#bulk-upload-mode")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows the upload type dropdown with three modes", async ({ page }) => {
    const select = page.locator("#bulk-upload-mode");
    await expect(select).toBeVisible();

    const options = await select.locator("option").allTextContents();
    expect(options).toContain("Print Records (CSV)");
    expect(options).toContain("Print Images");
    expect(options).toContain("Certificates");
  });

  test("shows the file input for records mode", async ({ page }) => {
    await page.selectOption("#bulk-upload-mode", "records");
    await expect(page.locator("#bulk-upload-file")).toBeVisible();
  });

  test("shows the file input for images mode", async ({ page }) => {
    await page.selectOption("#bulk-upload-mode", "images");
    await expect(page.locator("#bulk-upload-file")).toBeVisible();
  });

  test("shows the file input for certificates mode", async ({ page }) => {
    await page.selectOption("#bulk-upload-mode", "certificates");
    await expect(page.locator("#bulk-upload-file")).toBeVisible();
  });

  test("Validate button is disabled when no file is selected", async ({
    page,
  }) => {
    // Button text is "Validate File" in records mode — it's the first .btn-outline-light
    const validateBtn = page
      .locator(".bulk-upload-actions .btn-outline-light")
      .first();
    await expect(validateBtn).toBeDisabled();
  });

  test("Save button is disabled before validation runs", async ({ page }) => {
    const saveBtn = page.locator(".bulk-upload-actions .btn-dark");
    await expect(saveBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// API — Bulk validate: row-level validation rules
// ---------------------------------------------------------------------------

test.describe("Bulk Upload – validate endpoint rules", () => {
  test("rejects a row with a missing required field", async ({ request }) => {
    const res = await request.post(`${API}/prints/bulk/validate`, {
      data: {
        rows: [
          {
            // status is intentionally omitted
            catalog_number: uniqueCatalog("MISSING"),
            artist: "Test Artist",
            date: "1980",
            size: "11x14",
          },
        ],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.summary.invalidRows).toBe(1);
    expect(body.rows[0].issues).toContain("status is required.");
  });

  test("rejects a row with an invalid status value", async ({ request }) => {
    const res = await request.post(`${API}/prints/bulk/validate`, {
      data: {
        rows: [
          {
            status: "NotAStatus",
            catalog_number: uniqueCatalog("STATUS"),
            artist: "Test Artist",
            date: "1980",
            size: "11x14",
          },
        ],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.rows[0].issues.some((i) => i.includes("Status must be"))).toBe(
      true,
    );
  });

  test("rejects a row with an invalid size value", async ({ request }) => {
    const res = await request.post(`${API}/prints/bulk/validate`, {
      data: {
        rows: [
          {
            status: "Available",
            catalog_number: uniqueCatalog("SIZE"),
            artist: "Test Artist",
            date: "1980",
            size: "GIANT",
          },
        ],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.rows[0].issues.some((i) => i.includes("Size must be"))).toBe(
      true,
    );
  });

  test("flags date_sold set when status is not Sold", async ({ request }) => {
    const res = await request.post(`${API}/prints/bulk/validate`, {
      data: {
        rows: [
          {
            status: "Available",
            catalog_number: uniqueCatalog("SOLD"),
            artist: "Test Artist",
            date: "1980",
            size: "11x14",
            date_sold: "2020-01-01",
          },
        ],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(
      body.rows[0].issues.some((i) => i.includes("Date sold")),
    ).toBe(true);
  });

  test("flags duplicate catalog numbers within the same batch", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("DUPE");

    const res = await request.post(`${API}/prints/bulk/validate`, {
      data: {
        rows: [
          {
            status: "Available",
            catalog_number: catalog,
            artist: "Artist A",
            date: "1980",
            size: "11x14",
          },
          {
            status: "Available",
            catalog_number: catalog,
            artist: "Artist B",
            date: "1983",
            size: "11x14",
          },
        ],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.summary.duplicateFileCatalogs).toBe(1);
    expect(
      body.rows.every((row) =>
        row.issues.some((i) =>
          i.includes("Catalog number appears more than once"),
        ),
      ),
    ).toBe(true);
  });

  test("flags a catalog that already exists in the archive", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("EXIST");

    // Create the record first
    const { res: createRes } = await bulkImportRecord(request, {
      catalog_number: catalog,
    });
    expect(createRes.status()).toBe(201);

    try {
      const res = await request.post(`${API}/prints/bulk/validate`, {
        data: {
          rows: [
            {
              status: "Available",
              catalog_number: catalog,
              artist: "Duplicate Artist",
              date: "1980",
              size: "11x14",
            },
          ],
        },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.summary.existingCatalogDuplicates).toBe(1);
      expect(
        body.rows[0].issues.some((i) =>
          i.includes("already exists in the archive"),
        ),
      ).toBe(true);
    } finally {
      await deletePrint(request, catalog);
    }
  });
});

// ---------------------------------------------------------------------------
// API — Bulk import: CRUD consistency
// ---------------------------------------------------------------------------

test.describe("Bulk Upload – CRUD consistency", () => {
  test("bulk import creates a new print record in the archive", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("CREATE");

    try {
      const { res } = await bulkImportRecord(request, {
        catalog_number: catalog,
      });

      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.importedCount).toBe(1);
      expect(body.importedCatalogNumbers).toContain(catalog);

      // Verify the record was persisted
      const print = await getPrint(request, catalog);
      expect(print).not.toBeNull();
      expect(print.catalog_number).toBe(catalog);
    } finally {
      await deletePrint(request, catalog);
    }
  });

  test("bulk import stores correct field values", async ({ request }) => {
    const catalog = uniqueCatalog("FIELDS");

    try {
      await bulkImportRecord(request, {
        catalog_number: catalog,
        artist: "Field Verify Artist",
        date: "1965",
        size: "16x20",
        status: "Sold",
        date_sold: "2001-06-15",
        location: "Chicago",
        instrument: "Trumpet",
        category: "Musicians",
        signed: false,
      });

      const print = await getPrint(request, catalog);
      expect(print.artist).toBe("Field Verify Artist");
      expect(print.date).toBe("1965");
      expect(print.size).toBe("16x20");
      expect(print.status).toBe("Sold");
      expect(print.location).toBe("Chicago");
      expect(print.instrument).toBe("Trumpet");
    } finally {
      await deletePrint(request, catalog);
    }
  });

  test("deleting a print removes it from the archive completely", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("DELETE");
    await bulkImportRecord(request, { catalog_number: catalog });

    // Confirm it exists before deletion
    const before = await getPrint(request, catalog);
    expect(before).not.toBeNull();

    const delRes = await request.delete(
      `${API}/prints/${encodeURIComponent(catalog)}`,
    );
    expect(delRes.status()).toBe(200);

    // Confirm it no longer exists
    const after = await getPrint(request, catalog);
    expect(after).toBeNull();
  });

  test("deleting the same print twice returns 404 on the second attempt", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("DOUBLE-DEL");
    await bulkImportRecord(request, { catalog_number: catalog });

    await request.delete(`${API}/prints/${encodeURIComponent(catalog)}`);

    const secondDelete = await request.delete(
      `${API}/prints/${encodeURIComponent(catalog)}`,
    );
    // Route returns 404 — prevents double Azure deleteBlob calls that would error
    expect(secondDelete.status()).toBe(404);
  });

  test("deleting a print clears its blob_name so no dead image reference remains", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("BLOB");

    // Create with simulated blob metadata by directly using the update endpoint
    // (bulk/import without image sets blob_name to null, so we update it manually)
    await bulkImportRecord(request, { catalog_number: catalog });

    // Simulate attaching a fake blob reference via the update endpoint
    await request.put(
      `${API}/prints/update/${encodeURIComponent(catalog)}`,
      {
        data: {
          status: "Available",
          catalog_number: catalog,
          artist: "Blob Test Artist",
          date: "1970",
          size: "11x14",
          blob_name: `fake-blob-${catalog}.jpg`,
          image: null,
          certificate: null,
          certificate_blob_name: null,
        },
      },
    );

    // Delete the print
    const delRes = await request.delete(
      `${API}/prints/${encodeURIComponent(catalog)}`,
    );
    expect(delRes.status()).toBe(200);

    // The record must be gone — no dead DB row retaining a blob reference
    const print = await getPrint(request, catalog);
    expect(print).toBeNull();
  });

  test("deleting a print clears its certificate_blob_name so no dead certificate reference remains", async ({
    request,
  }) => {
    const catalog = uniqueCatalog("CERT");

    await bulkImportRecord(request, { catalog_number: catalog });

    await request.put(
      `${API}/prints/update/${encodeURIComponent(catalog)}`,
      {
        data: {
          status: "Available",
          catalog_number: catalog,
          artist: "Cert Test Artist",
          date: "1970",
          size: "11x14",
          blob_name: null,
          image: null,
          certificate: null,
          certificate_blob_name: `fake-cert-${catalog}.pdf`,
        },
      },
    );

    const delRes = await request.delete(
      `${API}/prints/${encodeURIComponent(catalog)}`,
    );
    expect(delRes.status()).toBe(200);

    // The record must be gone — no dead DB row retaining a certificate reference
    const print = await getPrint(request, catalog);
    expect(print).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// API — Asset-level validate: image and certificate rules
// ---------------------------------------------------------------------------

test.describe("Bulk Upload – asset validation rules", () => {
  test("rejects images with invalid file extension", async ({ request }) => {
    const res = await request.post(`${API}/prints/bulk/assets/validate`, {
      data: {
        assetType: "images",
        files: [{ fileName: "1978 CS 0042.docx" }],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    const row = body.rows[0];
    expect(
      row.issues.some((i) =>
        i.includes("Image files must be"),
      ),
    ).toBe(true);
  });

  test("rejects certificates with Word file extension", async ({ request }) => {
    const res = await request.post(`${API}/prints/bulk/assets/validate`, {
      data: {
        assetType: "certificates",
        files: [{ fileName: `${uniqueCatalog("WORD")}.docx` }],
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    // May get "could not match catalog" issue too, but Word error must be present
    expect(
      body.rows[0].issues.some((i) =>
        i.includes("Word files must be converted"),
      ),
    ).toBe(true);
  });

  test("rejects certificates with non-PDF extension", async ({ request }) => {
    const catalog = uniqueCatalog("PDFONLY");
    await bulkImportRecord(request, { catalog_number: catalog });

    try {
      const res = await request.post(`${API}/prints/bulk/assets/validate`, {
        data: {
          assetType: "certificates",
          files: [{ fileName: `${catalog}.jpg` }],
        },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(
        body.rows[0].issues.some((i) =>
          i.includes("Certificate files must be PDF"),
        ),
      ).toBe(true);
    } finally {
      await deletePrint(request, catalog);
    }
  });
});
