import { createRequire } from "node:module";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const app = require("../src/app");
const Print = require("../models/print");
const { db } = require("../db/connection");

const createdCatalogs = new Set();

function uniqueCatalog(prefix) {
  const value = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  createdCatalogs.add(value);
  return value;
}

async function seedPrint(overrides = {}) {
  const catalog = overrides.catalog_number || uniqueCatalog("search");

  const record = await Print.create({
    status: "Available",
    catalog_number: catalog,
    artist: "Search Test Artist",
    image: null,
    blob_name: null,
    certificate: null,
    certificate_blob_name: null,
    date: "1972",
    size: "11x14",
    location: "New York",
    instrument: "Saxophone",
    notes: "Search route integration test",
    date_sold: null,
    category: "Musicians",
    signed: false,
    ...overrides,
  });

  createdCatalogs.add(record.catalog_number);
  return record;
}

describe("Search endpoints", () => {
  beforeAll(async () => {
    await db.sync();
  });

  afterEach(async () => {
    if (!createdCatalogs.size) return;

    await Print.destroy({
      where: {
        catalog_number: [...createdCatalogs],
      },
    });

    createdCatalogs.clear();
  });

  it("GET /api/search finds a print by exact catalog number", async () => {
    const created = await seedPrint();

    const response = await request(app).get(
      `/api/search?query=${encodeURIComponent(created.catalog_number)}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThan(0);
    expect(Array.isArray(response.body.rows)).toBe(true);
    expect(
      response.body.rows.some(
        (row) => row.catalog_number === created.catalog_number,
      ),
    ).toBe(true);
  });

  it("GET /api/search finds prints by partial artist text", async () => {
    const created = await seedPrint({
      artist: "John Searchington Quartet",
    });

    const response = await request(app).get("/api/search?query=Searchington");

    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThan(0);
    expect(
      response.body.rows.some(
        (row) => row.catalog_number === created.catalog_number,
      ),
    ).toBe(true);
  });

  it("GET /api/search returns 404 when no prints match", async () => {
    const response = await request(app).get(
      `/api/search?query=${encodeURIComponent("NO_MATCH_EXPECTED_123456")}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("No Prints Found.");
  });
});
