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

  app.get("/chain", (_: Request, res: Response) => {
    res.json(state.chain);
  });

  app.post("/transactions", (req: Request, res: Response) => {
    if (!bc.isTransaction(req.body)) {
      res.status(400).json({ error: "invalid transaction" });
      return;
    }

    const [index, nextState] = bc.newTransaction(req.body, state);
    state = nextState;
    res.json({ index });
  });

  app.post("/mine", (_: Request, res: Response) => {
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
