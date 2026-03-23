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
  return value;
}

async function seedPrint(overrides = {}) {
  const catalog = overrides.catalog_number || uniqueCatalog("bulk");

  const record = await Print.create({
    status: "Available",
    catalog_number: catalog,
    artist: "Test Artist",
    image: null,
    blob_name: null,
    certificate: null,
    certificate_blob_name: null,
    date: "1980",
    size: "11x14",
    location: "Test Location",
    instrument: "Piano",
    notes: "Bulk upload test",
    date_sold: null,
    category: "Musicians",
    signed: false,
    ...overrides,
  });

  createdCatalogs.add(record.catalog_number);
  return record;
}

describe("Bulk upload endpoints", () => {
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

  it("POST /api/prints/bulk/validate returns 400 with empty rows", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .send({ rows: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Provide at least one row to validate.",
    );
    expect(response.body.summary.totalRows).toBe(0);
  });

  it("POST /api/prints/bulk/validate returns validation summary for valid row", async () => {
    const testCatalog = uniqueCatalog("validate");
    createdCatalogs.add(testCatalog);

    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .send({
        rows: [
          {
            status: "Available",
            catalog_number: testCatalog,
            artist: "Test Artist",
            date: "1985",
            size: "11x14",
            location: "New York",
            instrument: "Saxophone",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("rows");
    expect(response.body).toHaveProperty("summary");
    expect(response.body.summary).toHaveProperty("totalRows");
    expect(response.body.summary).toHaveProperty("validRows");
    expect(response.body.summary).toHaveProperty("invalidRows");
  });

  it("POST /api/prints/bulk/validate detects missing required fields", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .send({
        rows: [
          {
            // Missing required fields: status, catalog_number, artist, date, size
            location: "New York",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.summary.invalidRows).toBeGreaterThan(0);
  });

  it("POST /api/prints/bulk/validate detects invalid status", async () => {
    const testCatalog = uniqueCatalog("validate-status");
    createdCatalogs.add(testCatalog);

    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .send({
        rows: [
          {
            status: "InvalidStatus",
            catalog_number: testCatalog,
            artist: "Test Artist",
            date: "1985",
            size: "11x14",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.summary.invalidRows).toBeGreaterThan(0);
  });

  it("POST /api/prints/bulk/validate detects invalid size", async () => {
    const testCatalog = uniqueCatalog("validate-size");
    createdCatalogs.add(testCatalog);

    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .send({
        rows: [
          {
            status: "Available",
            catalog_number: testCatalog,
            artist: "Test Artist",
            date: "1985",
            size: "InvalidSize",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.summary.invalidRows).toBeGreaterThan(0);
  });

  it("POST /api/prints/bulk/assets/validate returns 400 with invalid assetType", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .send({
        assetType: "invalid",
        files: [{ fileName: "test.jpg" }],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "assetType must be either images or certificates.",
    );
  });

  it("POST /api/prints/bulk/assets/validate returns 400 with empty files", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .send({
        assetType: "images",
        files: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Provide at least one file to validate.",
    );
  });

  it("POST /api/prints/bulk/assets/validate returns validation summary for images", async () => {
    const testCatalog = uniqueCatalog("assets-validate");
    createdCatalogs.add(testCatalog);

    // Create a print first for the asset to be linked to
    await seedPrint({ catalog_number: testCatalog });

    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .send({
        assetType: "images",
        files: [
          {
            fileName: `${testCatalog}.jpg`,
            base64Data: "data:image/jpg;base64,/9j/4AAQSkZJRgABA==",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("rows");
    expect(response.body).toHaveProperty("summary");
    expect(response.body.summary).toHaveProperty("totalFiles");
  });

  it("POST /api/prints/bulk/assets/validate returns validation summary for certificates", async () => {
    const testCatalog = uniqueCatalog("cert-validate");
    createdCatalogs.add(testCatalog);

    // Create a print first for the certificate to be linked to
    await seedPrint({ catalog_number: testCatalog });

    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .send({
        assetType: "certificates",
        files: [
          {
            fileName: `${testCatalog}.pdf`,
            base64Data: "data:application/pdf;base64,JVBERi0xLjQK",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("rows");
    expect(response.body).toHaveProperty("summary");
  });

  it("POST /api/prints/bulk/import returns 400 with empty rows", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/import")
      .send({ rows: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Provide at least one reviewed row to import.",
    );
  });

  it("POST /api/prints/bulk/import returns 400 with invalid rows", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/import")
      .send({
        rows: [
          {
            // Missing required fields
            status: "InvalidStatus",
          },
        ],
      });

    expect(response.status).toBe(400);
  });

  it("POST /api/prints/bulk/images/import returns 400 with invalid request", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/images/import")
      .send({
        // Missing required fields
      });

    expect(response.status).toBe(400);
  });

  it("POST /api/prints/bulk/assets/import returns 400 with invalid assetType", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/assets/import")
      .send({
        assetType: "invalid",
        imports: [],
      });

    expect(response.status).toBe(400);
  });

  it("POST /api/prints/bulk/assets/import returns 400 with empty imports", async () => {
    const response = await request(app)
      .post("/api/prints/bulk/assets/import")
      .send({
        assetType: "images",
        imports: [],
      });

    expect(response.status).toBe(400);
  });
});
