import { createHash } from "crypto";

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

export const transaction = (
  sender: string,
  recipient: string,
  amount: number
): Transaction => ({ sender, recipient, amount });

const sha256Hex = (s: string): string =>
  createHash("sha256")
    .update(s, "utf8")
    .digest("hex");

export const hashBlock = (block: Block): string =>
  sha256Hex(JSON.stringify(block));

export const hashString = (s: string): string => sha256Hex(s);

export const lastBlock = (bc: Blockchain): Block =>
  bc.chain[bc.chain.length - 1];

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

export const validProof = (lastProof: number, proof: number): boolean =>
  hashString(`${lastProof}${proof}`).startsWith("0000");

export const proofOfWork = (lastProof: number): number => {
  let proof = 0;

  while (!validProof(lastProof, proof)) {
    proof += 1;
  }

  return proof;
};

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

export const genesisBlock: Block = {
  index: 1,
  timestamp: "2026-07-28T00:00:00Z",
  transactions: [],
  previousHash: null,
  proof: 100,
};

export const initialBlockchain: Blockchain = {
  chain: [genesisBlock],
  pendingTransactions: [],
};

export const isTransaction = (x: unknown): x is Transaction => {
  if (typeof x !== "object" || x === null) return false;

  const t = x as Record<string, unknown>;

  return (
    typeof t.sender === "string" &&
    typeof t.recipient === "string" &&
    typeof t.amount === "number"
  );
};
