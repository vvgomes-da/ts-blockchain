/**
 * Unit tests for the pure blockchain domain logic (src/blockchain.ts).
 *
 * The module is pure (no I/O, no shared state), so these tests are deterministic
 * and need no server. Mirrors the Clojure `blockchain-test` suite.
 */

import * as bc from "../src/blockchain";

describe("transaction", () => {
  it("builds an object with the expected fields", () => {
    expect(bc.transaction("alice", "bob", 5)).toEqual({
      sender: "alice",
      recipient: "bob",
      amount: 5,
    });
  });
});

describe("isTransaction", () => {
  it("accepts a well-formed transaction", () => {
    expect(bc.isTransaction({ sender: "a", recipient: "b", amount: 1 })).toBe(
      true
    );
  });
  it("rejects a non-numeric amount", () => {
    expect(
      bc.isTransaction({ sender: "a", recipient: "b", amount: "1" })
    ).toBe(false);
  });
  it("rejects a missing field", () => {
    expect(bc.isTransaction({ sender: "a", recipient: "b" })).toBe(false);
  });
  it("rejects null", () => {
    expect(bc.isTransaction(null)).toBe(false);
  });
});

describe("hashString", () => {
  it("is deterministic", () => {
    expect(bc.hashString("10035")).toBe(bc.hashString("10035"));
  });
  it("differs for different inputs", () => {
    expect(bc.hashString("a")).not.toBe(bc.hashString("b"));
  });
  it("produces a 64-character hex string (SHA-256)", () => {
    const h = bc.hashString("anything");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashBlock", () => {
  it("is deterministic for the same block", () => {
    expect(bc.hashBlock(bc.genesisBlock)).toBe(bc.hashBlock(bc.genesisBlock));
  });
  it("differs when block contents differ", () => {
    expect(bc.hashBlock(bc.genesisBlock)).not.toBe(
      bc.hashBlock({ ...bc.genesisBlock, proof: 999 })
    );
  });
});

describe("lastBlock", () => {
  it("returns the most recent block", () => {
    expect(bc.lastBlock(bc.initialBlockchain)).toEqual(bc.genesisBlock);
  });
});

describe("newTransaction", () => {
  const tx = bc.transaction("alice", "bob", 5);
  const [index, next] = bc.newTransaction(tx, bc.initialBlockchain);

  it("returns the index of the block that will hold the transaction", () => {
    expect(index).toBe(2);
  });
  it("appends the transaction to the pending list", () => {
    expect(next.pendingTransactions).toEqual([tx]);
  });
  it("does not modify the chain", () => {
    expect(next.chain).toEqual(bc.initialBlockchain.chain);
  });
  it("is pure: the input blockchain is unchanged", () => {
    expect(bc.initialBlockchain.pendingTransactions).toEqual([]);
  });
});

describe("validProof", () => {
  it("passes for a known valid proof (lastProof 100 -> 35293)", () => {
    expect(bc.validProof(100, 35293)).toBe(true);
  });
  it("fails for an invalid proof", () => {
    expect(bc.validProof(100, 0)).toBe(false);
  });
});

describe("proofOfWork", () => {
  const proof = bc.proofOfWork(100);
  it("finds the first valid proof for lastProof 100", () => {
    expect(proof).toBe(35293);
  });
  it("the result is itself a valid proof", () => {
    expect(bc.validProof(100, proof)).toBe(true);
  });
});

describe("newBlock", () => {
  const tx = bc.transaction("alice", "bob", 5);
  const state: bc.Blockchain = {
    ...bc.initialBlockchain,
    pendingTransactions: [tx],
  };
  const [block, next] = bc.newBlock("2026-07-29T00:00:00Z", 35293, state);

  it("has the next index", () => {
    expect(block.index).toBe(2);
  });
  it("carries the pending transactions", () => {
    expect(block.transactions).toEqual([tx]);
  });
  it("uses the injected timestamp and proof", () => {
    expect(block.timestamp).toBe("2026-07-29T00:00:00Z");
    expect(block.proof).toBe(35293);
  });
  it("links previousHash to the prior last block", () => {
    expect(block.previousHash).toBe(bc.hashBlock(bc.genesisBlock));
  });
  it("appends the block and clears pending", () => {
    expect(next.chain).toHaveLength(2);
    expect(bc.lastBlock(next)).toEqual(block);
    expect(next.pendingTransactions).toEqual([]);
  });
});
