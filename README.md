# Don't Press It

A private multiplayer game built for the Inco Summer Game Jam. Every player secretly chooses **PRESS IT** or **DON'T PRESS**. Choices remain encrypted onchain until the entire squad has committed.

## The game loop

1. A host creates a room for 2–4 players and shares its numeric room ID.
2. Players join and the host starts a 10-minute round.
3. Each player submits an encrypted boolean with Inco Lightning. No player can inspect another player's choice while the round is active.
4. When everyone submits, the contract reveals the round handles. Any connected player attested-decrypts the public result and finalizes it onchain.
5. If exactly one player pressed, they win the room's mission points. If no one pressed, the points grow; otherwise the squad continues.
6. If someone abandons a round, anyone can safely expire it after the deadline. Submitted choices are never revealed.

Mission points are in-game points only—there are no real-money prizes or deposits.

## Inco integration

`DontPressIt.sol` stores each decision as an `ebool`, computes the encrypted press count and sole-presser index, and only reveals those values after all players have submitted. Finalization verifies Inco covalidator decryption attestations onchain.

## Run locally

```bash
npm install
npm run contracts:compile
npm run contracts:test:game
npm run dev
```

## Deploy to Base Sepolia

Set `PRIVATE_KEY_BASE_SEPOLIA` and `BASE_SEPOLIA_RPC_URL` in `contracts/.env`, then:

```bash
npm run contracts:deploy:game:testnet
```

Current Base Sepolia deployment: [`0xeF96d53d72E89431631A30Dcd2646ac2C67394Ca`](https://sepolia-explorer.base.org/address/0xeF96d53d72E89431631A30Dcd2646ac2C67394Ca)

Copy the resulting address into the deployment platform's environment variables:

```bash
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_DONT_PRESS_IT_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

Then deploy the `frontend` app. Players can share rooms as `https://your-site.example/?room=1`.

## Verification

```bash
npm run contracts:compile
npm run contracts:test:game
npm run build
```
