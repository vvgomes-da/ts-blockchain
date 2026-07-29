/**
 * HTTP layer: an Express app exposing the blockchain as a REST API.
 *
 * This is the side-effecting edge. It owns the shared mutable state (a single
 * blockchain reference held in a closure) and defers all domain logic to the
 * pure `blockchain` module. This mirrors the `IORef`/atom + pure-core split of
 * the sibling Haskell and Clojure projects.
 *
 * `createApp` is a factory so tests can spin up an isolated app with fresh state
 * (no globals), which supertest drives directly without opening a port.
 */

import express, { Express, Request, Response } from "express";
import * as bc from "./blockchain";

export const createApp = (): Express => {
  const app = express();
  app.use(express.json());

  // The whole blockchain lives in this single mutable reference. Pure functions
  // compute the next value; we reassign atomically within a single handler.
  // Node's single-threaded event loop means each handler body runs to
  // completion without interleaving, so no locking is needed.
  let state: bc.Blockchain = bc.initialBlockchain;

  // GET /chain -> the full chain of blocks.
  app.get("/chain", (_req: Request, res: Response) => {
    res.json(state.chain);
  });

  // POST /transactions -> queue a transaction; return the index of the block
  // that will contain it. The body is validated before use.
  app.post("/transactions", (req: Request, res: Response) => {
    if (!bc.isTransaction(req.body)) {
      res.status(400).json({ error: "invalid transaction" });
      return;
    }
    const [index, nextState] = bc.newTransaction(req.body, state);
    state = nextState;
    res.json({ index });
  });

  // POST /mine -> run proof-of-work, forge a block (including a mining reward),
  // and return the new block.
  app.post("/mine", (_req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const lastProof = bc.lastBlock(state).proof;
    const proof = bc.proofOfWork(lastProof);

    const reward = bc.transaction("0", "node", 1);
    const stateWithReward: bc.Blockchain = {
      ...state,
      pendingTransactions: [...state.pendingTransactions, reward],
    };

    const [block, nextState] = bc.newBlock(timestamp, proof, stateWithReward);
    state = nextState;
    res.json(block);
  });

  return app;
};
