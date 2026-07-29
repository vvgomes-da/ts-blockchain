import request from "supertest";
import { createApp } from "../src/server";

describe("GET /chain", () => {
  it("returns the chain with just the genesis block", async () => {
    const app = createApp();
    const res = await request(app).get("/chain");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      index: 1,
      previousHash: null,
      proof: 100,
    });
  });
});

describe("POST /transactions", () => {
  it("queues a valid transaction and returns the next block index", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/transactions")
      .send({ sender: "alice", recipient: "bob", amount: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ index: 2 });
  });

  it("rejects an invalid transaction with 400", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/transactions")
      .send({ sender: "alice", recipient: "bob", amount: "five" });

    expect(res.status).toBe(400);
  });
});

describe("POST /mine", () => {
  it("forges a block containing the pending tx and the mining reward", async () => {
    const app = createApp();

    await request(app)
      .post("/transactions")
      .send({ sender: "alice", recipient: "bob", amount: 5 });

    const res = await request(app).post("/mine");

    expect(res.status).toBe(200);
    expect(res.body.index).toBe(2);
    expect(res.body.proof).toBe(35293);
    expect(res.body.previousHash).not.toBeNull();
    expect(res.body.transactions).toEqual([
      { sender: "alice", recipient: "bob", amount: 5 },
      { sender: "0", recipient: "node", amount: 1 },
    ]);
  });

  it("grows the chain to two linked blocks", async () => {
    const app = createApp();
    await request(app).post("/mine");
    const res = await request(app).get("/chain");

    expect(res.body).toHaveLength(2);
    expect(res.body[1].previousHash).not.toBeNull();
  });
});
