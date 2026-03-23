import { createRequire } from "node:module";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const app = require("../src/app");
const Print = require("../models/print");
const PrintChangeLog = require("../models/printChangeLog");
const { db } = require("../db/connection");

const createdCatalogs = new Set();

function uniqueCatalog(prefix) {
	const value = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
	createdCatalogs.add(value);
	return value;
}

describe("Print endpoints", () => {
	beforeAll(async () => {
		await db.sync();
	});

	afterEach(async () => {
		if (!createdCatalogs.size) return;

		await PrintChangeLog.destroy({
			where: {
				print_catalog_number: [...createdCatalogs],
			},
		});

		await Print.destroy({
			where: {
				catalog_number: [...createdCatalogs],
			},
		});

		createdCatalogs.clear();
	});

	it("GET /api/prints/all returns archive payload", async () => {
		const response = await request(app).get("/api/prints/all");

		expect(response.status).toBe(200);
		expect(typeof response.body.count).toBe("number");
		expect(Array.isArray(response.body.allPrints)).toBe(true);
	});

	it("POST /api/prints validates required fields", async () => {
		const response = await request(app).post("/api/prints").send({
			status: "Available",
			date: "1972",
			size: "11x14",
		});

		expect(response.status).toBe(400);
		expect(Array.isArray(response.body.error)).toBe(true);
	});

	it("POST /api/prints creates a print", async () => {
		const catalog = uniqueCatalog("create");

		const response = await request(app).post("/api/prints").send({
			status: "Available",
			catalog_number: catalog,
			artist: "Miles Davis",
			date: "1969",
			size: "11x14",
			category: "Musicians",
			signed: "true",
		});

		expect(response.status).toBe(200);
		expect(response.body.catalog_number).toBe(catalog);
		expect(response.body.signed).toBe(true);

		const created = await Print.findOne({ where: { catalog_number: catalog } });
		expect(created).toBeTruthy();
	});

	it("GET /api/prints/change-log can filter by catalog", async () => {
		const catalog = uniqueCatalog("log");

		await request(app).post("/api/prints").send({
			status: "Available",
			catalog_number: catalog,
			artist: "Dizzy Gillespie",
			date: "1955",
			size: "16x20",
			email: "owner@example.com",
		});

		const response = await request(app).get(
			`/api/prints/change-log?catalog=${encodeURIComponent(catalog)}`,
		);

		expect(response.status).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);
		expect(response.body.length).toBeGreaterThan(0);
		expect(response.body[0].print_catalog_number).toContain(catalog);
	});

	it("PUT /api/prints/update/:catalogNumber updates an existing print", async () => {
		const catalog = uniqueCatalog("update");

		await request(app).post("/api/prints").send({
			status: "Available",
			catalog_number: catalog,
			artist: "Nina Simone",
			date: "1962",
			size: "11x14",
		});

		const response = await request(app)
			.put(`/api/prints/update/${encodeURIComponent(catalog)}`)
			.send({
				status: "Sold",
				catalog_number: catalog,
				artist: "Nina Simone",
				date: "1962",
				size: "11x14",
				date_sold: "1970-01-01",
			});

		expect(response.status).toBe(200);
		expect(response.body.status).toBe("Sold");
		expect(response.body.date_sold).toBe("1970-01-01");
	});

	it("DELETE /api/prints/:catalogNumber deletes an existing print", async () => {
		const catalog = uniqueCatalog("delete");

		await request(app).post("/api/prints").send({
			status: "Available",
			catalog_number: catalog,
			artist: "Sarah Vaughan",
			date: "1961",
			size: "11x14",
		});

		const response = await request(app).delete(
			`/api/prints/${encodeURIComponent(catalog)}`,
		);

		expect(response.status).toBe(200);
		expect(response.body.message).toBe("Print deleted successfully!");

		const deleted = await Print.findOne({ where: { catalog_number: catalog } });
		expect(deleted).toBeNull();
		createdCatalogs.delete(catalog);
	});
});

