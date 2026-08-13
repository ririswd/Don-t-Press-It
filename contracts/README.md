# Don’t Press It contract

The game contract is [`contracts/DontPressIt.sol`](./contracts/DontPressIt.sol). It stores private player decisions as Inco Lightning `ebool` values, calculates the encrypted round outcome, and verifies the final TEE-backed decryption attestation.

## Commands

```bash
npm install
npm run compile
npm run test:game
npm run test:coverage
```

## Deploy to Base Sepolia

Copy `.env.sample` to `.env` and set:

```bash
PRIVATE_KEY_BASE_SEPOLIA=0x...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

Then deploy:

```bash
npm run deploy:game:testnet
```

Record the emitted address in the frontend deployment environment as `NEXT_PUBLIC_DONT_PRESS_IT_ADDRESS`.

The deployed address is recorded in the project root README. Never commit `.env` files, private keys, or Ignition deployment artifacts.
