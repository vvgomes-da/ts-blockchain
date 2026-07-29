# TypeScript Blockchain

A minimal blockchain implemented as an HTTP API in TypeScript, written in a
**functional style** (plain data types + pure functions, no classes). It uses
[Express](https://expressjs.com/) for the web layer.

It is a port of the sibling [`haskell-blockchain`](../haskell-blockchain) and
[`clojure-blockchain`](../clojure-blockchain) projects — same data model, logic,
and endpoints — so the three can be read side by side.

## What it does

- **Blocks** are chained, each referencing the SHA-256 hash of the previous
  block (`previousHash`). The genesis block has no predecessor (`null`).
- **Transactions** are queued as pending and bundled into the next mined block.
- **Mining** uses a simple Proof-of-Work: find a `proof` such that the SHA-256 of
  `(lastProof + proof)` starts with `"0000"`. Mining also mints a **reward**
  transaction (`sender: "0"`) paid to the node.
- **State** (the chain + pending transactions) is held in memory and resets when
  the process restarts.

### Design: functional, pure core + side-effecting edge

Although TypeScript favours classes, this project models data with `readonly`
types and transforms it with pure functions, mirroring the Haskell/Clojure
versions:

- `src/blockchain.ts` — **pure** domain logic: types (`Transaction`, `Block`,
  `Blockchain`) and pure functions. No I/O, no shared state. Functions return
  new values (e.g. `[index, blockchain']` tuples) instead of mutating.
- `src/server.ts` — the **HTTP edge**. A `createApp` factory holds the single
  mutable blockchain reference in a closure, wires Express routes, and reassigns
  state after applying pure transforms.
- `src/index.ts` — entry point; starts the server on port 5000.

| Concept       | Haskell                        | Clojure                       | TypeScript                    |
|---------------|--------------------------------|-------------------------------|-------------------------------|
| Data model    | records (`data`)               | maps (+ spec)                 | `readonly` interfaces         |
| Shared state  | `IORef` + `atomicModifyIORef'` | `atom` + `swap!`              | closure-held `let` + reassign |
| JSON          | aeson                          | cheshire                      | `JSON` / Express              |
| SHA-256       | `Data.Digest.Pure.SHA`         | `java.security.MessageDigest` | Node `crypto`                 |
| Web framework | Scotty                         | Pedestal                      | Express                       |

## API

| Method | Path             | Description                                                        |
|--------|------------------|--------------------------------------------------------------------|
| GET    | `/chain`         | Return the full chain of blocks.                                   |
| POST   | `/transactions`  | Queue a transaction; returns the index of the block that will contain it. Invalid bodies return 400. |
| POST   | `/mine`          | Run Proof-of-Work, forge a new block (pending + reward), return it. |

The server listens on **port 5000**.

## Running

Requires Node.js and npm.

```sh
npm install
npm run dev        # run with ts-node (no build step)
# or
npm run build && npm start   # compile to dist/ then run
```

The server starts on `http://localhost:5000`; stop it with `Ctrl-C`.

## Testing

```sh
npm test
```

- `test/blockchain.test.ts` — unit tests for the pure domain logic (Jest).
- `test/api.test.ts` — API tests for the Express routes (Jest + supertest).

## Testing with curl

With the server running, in another terminal:

```sh
# 1. Inspect the chain (genesis only)
curl -s localhost:5000/chain

# 2. Queue a transaction
curl -s -X POST localhost:5000/transactions \
  -H 'Content-Type: application/json' \
  -d '{"sender":"alice","recipient":"bob","amount":5}'

# 3. Mine a block
curl -s -X POST localhost:5000/mine

# 4. Inspect the chain again (two linked blocks)
curl -s localhost:5000/chain
```

## Notes / known limitations

- Single node, in-memory state only (no persistence, no peer-to-peer consensus).
- The mining reward recipient is a hardcoded `"node"` identifier.
- Intended as a learning exercise, not for production use.
