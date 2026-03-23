import { createRequire } from "node:module";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const app = require("../src/app");
const User = require("../models/user");
const { db } = require("../db/connection");

const createdEmails = new Set();

function uniqueEmail(prefix) {
  const value = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`;
  return value;
}

async function seedUser(overrides = {}) {
  const email = overrides.email || uniqueEmail("auth");
  createdEmails.add(email);

  const record = await User.create({
    first_name: "Test",
    last_name: "User",
    email: email,
    password: "hashedPassword123", // Note: This is already hashed in real scenarios
    ...overrides,
  });

  return record;
}

describe("Auth endpoints", () => {
  beforeAll(async () => {
    await db.sync();
  });

  afterEach(async () => {
    if (!createdEmails.size) return;

    await User.destroy({
      where: {
        email: [...createdEmails],
      },
    });

    createdEmails.clear();
  });

  it("POST /api/auth creates a new user account", async () => {
    const email = uniqueEmail("create");
    createdEmails.add(email);

    const response = await request(app)
      .post("/api/auth")
      .send({
        first_name: "John",
        last_name: "Doe",
        email: email,
        password: "TestPassword123",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe(email);
    expect(response.body.first_name).toBe("John");
    expect(response.body.last_name).toBe("Doe");
  });

  it("POST /api/auth returns 409 if user with email already exists", async () => {
    const email = uniqueEmail("duplicate");
    createdEmails.add(email);

    // Create first user
    await User.create({
      first_name: "John",
      last_name: "Doe",
      email: email,
      password: "hashedPassword123",
    });

    // Try to create duplicate
    const response = await request(app)
      .post("/api/auth")
      .send({
        first_name: "Jane",
        last_name: "Doe",
        email: email,
        password: "TestPassword123",
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("User with that email exists");
  });

  it("POST /api/auth/login returns 400 for invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "invalid-email",
        password: "TestPassword123",
      });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.error)).toBe(true);
  });

  it("POST /api/auth/login returns 400 for empty password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "",
      });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.error)).toBe(true);
  });

  it("POST /api/auth/login returns 401 when user not found", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent@example.com",
        password: "TestPassword123",
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("User not found");
  });

  it("POST /api/auth/profile retrieves user profile by email", async () => {
    const email = uniqueEmail("profile");
    createdEmails.add(email);

    await seedUser({ email: email });

    const response = await request(app)
      .post("/api/auth/profile")
      .send({ email: email });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(email);
    expect(response.body.first_name).toBe("Test");
    expect(response.body.last_name).toBe("User");
  });

  it("POST /api/auth/profile returns 401 when no email provided", async () => {
    const response = await request(app)
      .post("/api/auth/profile")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("No active session");
  });

  it("POST /api/auth/profile returns 401 when user not found", async () => {
    const response = await request(app)
      .post("/api/auth/profile")
      .send({ email: "nonexistent@example.com" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("No user found");
  });

  it("GET /api/auth/logout clears session and returns success", async () => {
    const response = await request(app).get("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Logout Successful");
  });

  it("GET /api/auth/session returns 401 without active session", async () => {
    const response = await request(app).get("/api/auth/session");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("No active session");
  });
});
