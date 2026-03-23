import { createRequire } from "node:module";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const app = require("../src/app");
const Print = require("../models/print");
const User = require("../models/user");
const { db } = require("../db/connection");

const createdCatalogs = new Set();
const createdEmails = new Set();

function uniqueCatalog(prefix) {
  const value = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return value;
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`;
}

async function getAuthToken() {
  const email = uniqueEmail("bulk");
  const password = "TestPassword123!";
  createdEmails.add(email);

  await request(app).post("/api/auth").send({
    first_name: "Bulk",
    last_name: "Tester",
    email,
    password,
  });

  const login = await request(app).post("/api/auth/login").send({
    email,
    password,
  });

  expect(login.status).toBe(200);
  return login.body.token;
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
    if (createdCatalogs.size) {
      await Print.destroy({
        where: {
          catalog_number: [...createdCatalogs],
        },
      });

      createdCatalogs.clear();
    }

    if (createdEmails.size) {
      await User.destroy({
        where: {
          email: [...createdEmails],
        },
      });

      createdEmails.clear();
    }
  });

  it("POST /api/prints/bulk/validate returns 400 with empty rows", async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Provide at least one row to validate.");
    expect(response.body.summary.totalRows).toBe(0);
  });

  it("POST /api/prints/bulk/validate returns validation summary for valid row", async () => {
    const testCatalog = uniqueCatalog("validate");
    createdCatalogs.add(testCatalog);
    const token = await getAuthToken();

    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();

    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();

    const response = await request(app)
      .post("/api/prints/bulk/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();

    // Create a print first for the asset to be linked to
    await seedPrint({ catalog_number: testCatalog });

    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();

    // Create a print first for the certificate to be linked to
    await seedPrint({ catalog_number: testCatalog });

    const response = await request(app)
      .post("/api/prints/bulk/assets/validate")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Provide at least one reviewed row to import.",
    );
  });

  it("POST /api/prints/bulk/import returns 400 with invalid rows", async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/import")
      .set("Authorization", `Bearer ${token}`)
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
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/images/import")
      .set("Authorization", `Bearer ${token}`)
      .send({
        // Missing required fields
      });

    expect(response.status).toBe(400);
  });

  it("POST /api/prints/bulk/assets/import returns 400 with invalid assetType", async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/assets/import")
      .set("Authorization", `Bearer ${token}`)
      .send({
        assetType: "invalid",
        imports: [],
      });

    expect(response.status).toBe(400);
  });

  it("POST /api/prints/bulk/assets/import returns 400 with empty imports", async () => {
    const token = await getAuthToken();
    const response = await request(app)
      .post("/api/prints/bulk/assets/import")
      .set("Authorization", `Bearer ${token}`)
      .send({
        assetType: "images",
        imports: [],
      });

    expect(response.status).toBe(400);
  });
});
