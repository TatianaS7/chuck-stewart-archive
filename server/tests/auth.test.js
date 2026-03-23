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

async function registerAndLogin(overrides = {}) {
  const email = overrides.email || uniqueEmail("login");
  const password = overrides.password || "TestPassword123!";
  createdEmails.add(email);

  const register = await request(app).post("/api/auth").send({
    first_name: "Auth",
    last_name: "Tester",
    email,
    password,
  });

  expect([201, 409]).toContain(register.status);

  const login = await request(app).post("/api/auth/login").send({
    email,
    password,
  });

  expect(login.status).toBe(200);
  return {
    token: login.body.token,
    user: login.body.user,
    email,
    password,
  };
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

    const response = await request(app).post("/api/auth").send({
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
    expect(response.body.password).toBeUndefined();
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
    const response = await request(app).post("/api/auth").send({
      first_name: "Jane",
      last_name: "Doe",
      email: email,
      password: "TestPassword123",
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("User with that email exists");
  });

  it("POST /api/auth/login returns 400 for invalid email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "invalid-email",
      password: "TestPassword123",
    });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.error)).toBe(true);
  });

  it("POST /api/auth/login returns 400 for empty password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "",
    });

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.error)).toBe(true);
  });

  it("POST /api/auth/login returns 401 when user not found", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "nonexistent@example.com",
      password: "TestPassword123",
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("User not found");
  });

  it("POST /api/auth/profile retrieves user profile by email", async () => {
    const { token, user } = await registerAndLogin();

    const response = await request(app)
      .post("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(user.email);
    expect(response.body.first_name).toBe(user.first_name);
    expect(response.body.last_name).toBe(user.last_name);
  });

  it("POST /api/auth/profile returns 401 when no token is provided", async () => {
    const response = await request(app).post("/api/auth/profile").send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing auth token");
  });

  it("POST /api/auth/profile returns 401 when token user is missing", async () => {
    const { token, email } = await registerAndLogin();

    await User.destroy({
      where: {
        email,
      },
    });

    const response = await request(app)
      .post("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("No user found");
  });

  it("GET /api/auth/logout returns success when authenticated", async () => {
    const { token } = await registerAndLogin();
    const response = await request(app)
      .get("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Logout Successful");
  });

  it("GET /api/auth/session returns 401 without token", async () => {
    const response = await request(app).get("/api/auth/session");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing auth token");
  });

  it("POST /api/auth/login returns token and safe user payload", async () => {
    const email = uniqueEmail("signin");
    const password = "SecretPassword123!";
    createdEmails.add(email);

    await request(app).post("/api/auth").send({
      first_name: "Sign",
      last_name: "In",
      email,
      password,
    });

    const response = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.password).toBeUndefined();
  });

  it("GET /api/auth/session returns current user when token is valid", async () => {
    const { token, user } = await registerAndLogin();

    const response = await request(app)
      .get("/api/auth/session")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(user.email);
  });

  it("PUT /api/auth/change-password updates password for token user", async () => {
    const { token, email, password } = await registerAndLogin();
    const newPassword = "UpdatedPassword123!";

    const response = await request(app)
      .put("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        current_password: password,
        new_password: newPassword,
        confirm_password: newPassword,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password updated successfully");

    const loginWithNewPassword = await request(app)
      .post("/api/auth/login")
      .send({
        email,
        password: newPassword,
      });
    expect(loginWithNewPassword.status).toBe(200);
  });
});
