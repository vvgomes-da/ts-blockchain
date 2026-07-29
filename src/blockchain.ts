/**
 * Pure blockchain domain logic: types and functions, no I/O, no shared state.
 *
 * This mirrors the pure core of the sibling `haskell-blockchain` and
 * `clojure-blockchain` projects. Although TypeScript favours classes, this is
 * written in a functional style: data is modelled with plain (readonly) types
 * and every function is a pure transform that returns new values rather than
 * mutating its inputs. Shared mutable state lives at the HTTP edge (server.ts).
 */

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Data model (mirrors the Haskell records / Clojure maps)
// ---------------------------------------------------------------------------

export interface Transaction {
  readonly sender: string;
  readonly recipient: string;
  readonly amount: number;
}

export interface Block {
  readonly index: number;
  readonly timestamp: string; // ISO-8601
  readonly transactions: readonly Transaction[];
  readonly previousHash: string | null; // null for the genesis block
  readonly proof: number;
}

export interface Blockchain {
  readonly chain: readonly Block[];
  readonly pendingTransactions: readonly Transaction[];
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export const transaction = (
  sender: string,
  recipient: string,
  amount: number
): Transaction => ({ sender, recipient, amount });

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** SHA-256 of a string, rendered as a lowercase hex string. */
const sha256Hex = (s: string): string =>
  createHash("sha256").update(s, "utf8").digest("hex");

/**
 * Deterministic SHA-256 hex of a block. The block is serialized to JSON first,
 * mirroring `hashBlock` in the Haskell/Clojure versions.
 */
export const hashBlock = (block: Block): string =>
  sha256Hex(JSON.stringify(block));

/** SHA-256 hex of an arbitrary string. Mirrors `hashString`. */
export const hashString = (s: string): string => sha256Hex(s);

// ---------------------------------------------------------------------------
// Core logic (pure)
// ---------------------------------------------------------------------------

/** The most recent block in the chain. */
export const lastBlock = (bc: Blockchain): Block =>
  bc.chain[bc.chain.length - 1];

/**
 * Queue a transaction. Returns a tuple [index, blockchain'] where `index` is the
 * index of the block that will hold it. Mirrors `newTransaction`, keeping the
 * result-first tuple convention of the Haskell/Clojure versions.
 */
export const newTransaction = (
  tx: Transaction,
  bc: Blockchain
): [number, Blockchain] => {
  const blockchain: Blockchain = {
    ...bc,
    pendingTransactions: [...bc.pendingTransactions, tx],
  };
  const index = lastBlock(bc).index + 1;
  return [index, blockchain];
};

/** True when SHA-256 of (lastProof + proof) begins with "0000". */
export const validProof = (lastProof: number, proof: number): boolean =>
  hashString(`${lastProof}${proof}`).startsWith("0000");

/**
 * Find the smallest proof p (from 0 upward) such that validProof(lastProof, p).
 * Mirrors `proofOfWork`.
 */
export const proofOfWork = (lastProof: number): number => {
  let proof = 0;
  while (!validProof(lastProof, proof)) {
    proof += 1;
  }
  return proof;
};

/**
 * Forge a new block from the pending transactions and append it to the chain,
 * clearing the pending list. Returns a tuple [block, blockchain'].
 * Mirrors `newBlock`; the timestamp is injected (I/O stays at the edge).
 */
export const newBlock = (
  timestamp: string,
  proof: number,
  bc: Blockchain
): [Block, Blockchain] => {
  const block: Block = {
    index: bc.chain.length + 1,
    timestamp,
    transactions: bc.pendingTransactions,
    previousHash: hashBlock(lastBlock(bc)),
    proof,
  };
  const blockchain: Blockchain = {
    chain: [...bc.chain, block],
    pendingTransactions: [],
  };
  return [block, blockchain];
};

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/**
 * The hardcoded first block. It has no predecessor, represented as null
 * (mirroring `previousHash :: Maybe Text = Nothing`).
 */
export const genesisBlock: Block = {
  index: 1,
  timestamp: "2026-07-28T00:00:00Z",
  transactions: [],
  previousHash: null,
  proof: 100,
};

/** A fresh blockchain containing only the genesis block. */
export const initialBlockchain: Blockchain = {
  chain: [genesisBlock],
  pendingTransactions: [],
};

/** Runtime validation of an untrusted transaction payload (used at the HTTP edge). */
export const isTransaction = (x: unknown): x is Transaction => {
  if (typeof x !== "object" || x === null) return false;
  const t = x as Record<string, unknown>;
  return (
    typeof t.sender === "string" &&
    typeof t.recipient === "string" &&
    typeof t.amount === "number"
  );
};
