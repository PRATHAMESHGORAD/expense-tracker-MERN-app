require("./setup");
const request = require("supertest");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
process.env.NODE_ENV = "test";

const app = require("../server");

const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

describe("Auth", () => {
  it("registers a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe(validUser.email);
  });

  it("rejects registration with a duplicate email", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.statusCode).toBe(400);
  });

  it("rejects registration with a short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, password: "123" });
    expect(res.statusCode).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("rejects login with the wrong password", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "wrongpassword" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects access to a protected route with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toBe(401);
  });

  it("allows access to a protected route with a valid token", async () => {
    const registerRes = await request(app).post("/api/auth/register").send(validUser);
    const token = registerRes.body.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe(validUser.email);
  });

  it("rejects access to a protected route with a malformed token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not.a.valid.token");
    expect(res.statusCode).toBe(401);
  });
});
