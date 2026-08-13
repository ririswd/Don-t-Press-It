# Don’t Press It

**Don’t Press It** is a browser multiplayer game for the [Inco Summer Game Jam](https://www.inco.org/blog/summer-game-jam-resources-and-what-to-build). Every player secretly chooses **PRESS IT** or **DON’T PRESS**. Decisions stay encrypted onchain until every player has committed, so nobody can react to another player’s choice.

Play it: [dont-press-it-cyan.vercel.app](https://dont-press-it-cyan.vercel.app)

## How to play

1. Connect a wallet on **Base Sepolia**.
2. Create an operation for 2–4 players.
3. Share the generated invite code or use **COPY INVITE**.
4. Once at least two players have joined, the host starts the round.
5. Each player signs one encrypted choice transaction: **PRESS IT** or **DON’T PRESS**.
6. After every choice is locked, any player verifies the Inco attestation and finalizes the round.

Exactly one presser wins the room’s points. If nobody presses, the points grow. If two or more players press, the room continues. Points are in-game only—there are no deposits, tokens, or real-money prizes.

## Privacy model

The game uses Inco Lightning’s TEE-backed encrypted state:

- A player’s boolean choice is encrypted in the browser for the game contract.
- The contract computes the press count and winning player index over encrypted values.
- It reveals only the aggregate outcome after all players have submitted.
- The final result is accepted only with an Inco covalidator decryption attestation.

This is encrypted onchain state decrypted in a TEE; it is not an FHE or zero-knowledge system.

## Stack

- Solidity + Hardhat
- `@inco/lightning` and `@inco/lightning-js`
- Next.js, Wagmi, RainbowKit, and Viem
- Base Sepolia

## Contract

Current Base Sepolia contract: [`0xeF96d53d72E89431631A30Dcd2646ac2C67394Ca`](https://sepolia-explorer.base.org/address/0xeF96d53d72E89431631A30Dcd2646ac2C67394Ca)

The deployed contract is intentionally non-custodial: it accepts only the Inco fee required for an encrypted input. The game has no payable prize pool and no transfer or withdrawal functionality.

## Local setup

Prerequisites: Node.js 18+ and a wallet with Base Sepolia test ETH.

```bash
npm install
cp frontend/.env.example frontend/.env.local
cp contracts/.env.sample contracts/.env
npm run dev
```

Set the following in `frontend/.env.local`:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_DONT_PRESS_IT_ADDRESS=0xeF96d53d72E89431631A30Dcd2646ac2C67394Ca
```

To deploy a new game contract to Base Sepolia, set `PRIVATE_KEY_BASE_SEPOLIA` and `BASE_SEPOLIA_RPC_URL` in `contracts/.env`, then run:

```bash
npm run contracts:deploy:game:testnet
```

## Verification

The full submission check runs contract compilation, contract lifecycle tests, frontend unit tests, linting, type checking, and a production build:

```bash
npm run check
```

Useful focused commands:

```bash
npm run contracts:test:game
npm run contracts:coverage
npm run test --workspace=frontend
```

## Repository layout

```text
contracts/  Solidity game contract, deployment module, and lifecycle tests
frontend/   Next.js game client, wallet integration, and unit tests
```
