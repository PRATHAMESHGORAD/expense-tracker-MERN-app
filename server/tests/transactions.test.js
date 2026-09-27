require("./setup");
const request = require("supertest");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key";
process.env.NODE_ENV = "test";

const app = require("../server");
const Account = require("../models/Account");

async function registerAndLogin(email) {
  const res = await request(app).post("/api/auth/register").send({
    name: "User " + email,
    email,
    password: "password123",
  });
  return { token: res.body.token, userId: res.body._id };
}

describe("Transactions", () => {
  let userA, userB, userAAccountId;

  beforeEach(async () => {
    userA = await registerAndLogin("usera@example.com");
    userB = await registerAndLogin("userb@example.com");

    // Registration auto-creates a "Cash" account for each user.
    const account = await Account.findOne({ user: userA.userId });
    userAAccountId = account._id.toString();
  });

  it("creates a transaction for the authenticated user", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: 500, type: "expense", category: "Food", account: userAAccountId, note: "Lunch" });

    expect(res.statusCode).toBe(201);
    expect(res.body.amount).toBe(500);
    expect(res.body.category).toBe("Food");
  });

  it("rejects creating a transaction with a negative amount", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: -10, type: "expense", category: "Food", account: userAAccountId });
    expect(res.statusCode).toBe(400);
  });

  it("rejects creating a transaction against another user's account", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ amount: 100, type: "expense", category: "Food", account: userAAccountId });
    expect(res.statusCode).toBe(400);
  });

  it("does not let user B see user A's transactions", async () => {
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: 500, type: "expense", category: "Food", account: userAAccountId });

    const res = await request(app).get("/api/transactions").set("Authorization", `Bearer ${userB.token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.transactions).toHaveLength(0);
  });

  it("does not let user B update or delete user A's transaction by guessing its id", async () => {
    const createRes = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: 500, type: "expense", category: "Food", account: userAAccountId });
    const txnId = createRes.body._id;

    const updateRes = await request(app)
      .put(`/api/transactions/${txnId}`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ amount: 1 });
    expect(updateRes.statusCode).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/transactions/${txnId}`)
      .set("Authorization", `Bearer ${userB.token}`);
    expect(deleteRes.statusCode).toBe(404);

    // Confirm it's untouched.
    const stillThereRes = await request(app)
      .get("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`);
    expect(stillThereRes.body.transactions).toHaveLength(1);
    expect(stillThereRes.body.transactions[0].amount).toBe(500);
  });

  it("paginates results instead of returning the whole collection", async () => {
    for (let i = 0; i < 15; i++) {
      await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ amount: 10 + i, type: "expense", category: "Food", account: userAAccountId });
    }

    const res = await request(app)
      .get("/api/transactions?page=1&limit=10")
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.body.transactions).toHaveLength(10);
    expect(res.body.pagination.total).toBe(15);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it("filters combinably by type, category, and amount range", async () => {
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: 500, type: "expense", category: "Food", account: userAAccountId });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: 2000, type: "income", category: "Salary", account: userAAccountId });
    await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ amount: 50, type: "expense", category: "Travel", account: userAAccountId });

    const res = await request(app)
      .get("/api/transactions?type=expense&category=Food&amountMin=100&amountMax=1000")
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].category).toBe("Food");
  });

  it("rejects a NoSQL-injection-style filter payload", async () => {
    const res = await request(app)
      .get("/api/transactions")
      .query({ category: { $ne: null } })
      .set("Authorization", `Bearer ${userA.token}`);
    // express-validator's isString() rejects the object query value before it ever
    // reaches a Mongoose filter.
    expect(res.statusCode).toBe(400);
  });
});
