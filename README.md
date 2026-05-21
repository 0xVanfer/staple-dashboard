# Staple Dashboard Prod

## Overview

`staple-dashboard` is the production-oriented static dashboard for Staple.

Compared with the original test-oriented dashboard, this version:

- Uses **Address Provider** as the entry point for Staple addresses
- Targets **production / mainnet / formal deployments** by default
- No longer treats **Test Token Factory** as a runtime prerequisite
- Supports **browser-wallet signing flows** for production interactions
- Retains the core pages for environment checks, address resolution, JR Pricing, Pools / Positions, Swap, Calculator, and Errors

The frontend now includes baseline browser-wallet support for:

- MetaMask (injected wallet)
- OKX Wallet (injected wallet)
- Compatible injected wallets
- Ledger through a compatible injected wallet or wallet-side bridge flow

## Local Startup

The app must be opened over HTTP. Do not open it via `file://`.

```bash
npm install
npm run start:local
```

Default URL:

```text
http://127.0.0.1:8787
```

If the port is already in use:

```bash
PORT=39001 npm run start:local
```

## Pages

The current production navigation keeps:

- Home
- Environment
- JR Pricing
- Pools & Positions
- Swap
- Calculator
- Errors

This dashboard must remain compatible with both production and test environments, so it intentionally keeps:

- Pages for production / live-chain usage
- Pages for local fork / Anvil / test deployments, such as Test Tokens and Arbitrage

Whether a page is actually usable depends on the current RPC, Address Provider, factory availability, and signer availability, rather than on hard-removing entries from the navigation.

## Environment and Address Rules

- **RPC** only determines where requests are sent
- **Staple addresses** are resolved from the saved `Version / Address Provider`
- **Bondify / JR Pricing** are still read from fixed frontend address entry points
- The dashboard must continue working even when production environments do not expose a `Test Token Factory`

## Wallets and Signing

The **Wallet & Accounts** section on the Environment page includes three account-related sources:

1. **Browser Wallet**
   - Does not auto-connect by default; a session is established only after the user explicitly clicks connect
   - Once a browser wallet is connected, all write operations must prefer and enforce that wallet signer
   - If the connected wallet chain ID does not match the current RPC chain ID, wallet-backed writes are blocked until the wallet is switched to the correct chain

2. **Saved Accounts**
   - Still useful for fork / local / admin debugging flows
   - Store only metadata such as address, nickname, and tags; manual private-key configuration is no longer accepted
   - Wallets generated through Random reveal their private key only once temporarily, and the frontend never persists it

3. **Chainlink Stream Credentials**
   - No longer stored in localStorage
   - Can optionally be kept with **Remember for this session**, which stores them only for the current browser session
   - Using a password manager for autofill is preferred over keeping credentials in the frontend long term

The signer resolution rules are now:

1. **If a browser wallet is connected**: always use that wallet signer; do not fall back to private keys or local impersonation
2. **If no browser wallet is connected and the environment is not production**: local impersonation fallback is still allowed
3. **In production without a connected browser wallet**: no signer is resolved from Saved Accounts

That means:

- **Anvil / local fork**: local signer / impersonation flows can still be used when no wallet is connected
- **Production**: write operations require an explicitly connected browser wallet
- **Once a browser wallet is connected**: it immediately becomes the only write signer, and silent fallback is no longer allowed

## Verification

Baseline smoke coverage is available through:

```bash
npm run test:e2e
```

Or directly:

```bash
npx playwright test tests/e2e/prod-smoke.spec.js
```

That smoke coverage includes:

- Whether the key homepage navigation remains visible
- Whether the wallet connection workspace is rendered on the Environment page
- Whether the mint entry points still exist on the Test Tokens page
- Whether the Arbitrage page remains accessible

`staple-dashboard` still keeps development- and test-oriented Playwright suites and scripts for fork, local, and multi-environment validation. `prod-smoke` is only one fast regression subset within that broader test set.
