# Staple Dashboard Prod

## Overview

`staple-dashboard-prod` is the production-oriented static dashboard for Staple.

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
- Ledger through either a compatible injected wallet or a direct WebHID connection flow

## Local Startup

The app must be opened over HTTP. Do not open it via `file://`.

```bash
npm install
npm run build:ledger-direct
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
- **JR Pricing Factory** is also bound to the selected Staple version
- JR Pricing writes for pair-level default **Non-Flash Params** now go through the configured factory (`setOracleDefaultNonFlashLoanParams`) in both production and test environments, so operators can update defaults without relying on direct oracle roles
- The dashboard must continue working even when production environments do not expose a `Test Token Factory`
- On the **Test Tokens** page, missing `Test Token Factory` only blocks mint/create flows on normal environments; when the RPC is a recognizable local **Anvil / Hardhat style** runtime (including forked-mainnet local testing, even if the saved environment is otherwise marked production because the RPC URL is not localhost), **Mint All** and **Mint ETH** stay available through local state-override minting, and **Mint All** prefers that local override path even if a `Test Token Factory` is configured

## Wallets and Signing

The **Wallet & Accounts** section on the Environment page includes three account-related sources:

1. **Browser Wallet**
   - Does not auto-connect by default; a session is established only after the user explicitly clicks connect
   - Supports both injected wallets and Ledger Direct over WebHID when the browser environment allows it
   - Ledger Direct is served from the local bundled runtime in `src/lib/ledgerDirect.bundle.js`, so it does not depend on fetching remote ESM modules at connect time
   - Once a browser wallet is connected, all write operations must prefer and enforce that wallet signer
   - If the connected wallet chain ID does not match the current RPC chain ID, wallet-backed writes are blocked until the wallet is switched to the correct chain

2. **Saved Accounts**
   - Still useful for fork / local / admin debugging flows
   - Store only metadata such as address, nickname, and tags; manual private-key configuration is no longer accepted
   - Wallets generated through Random reveal their private key only once temporarily, and the frontend never persists it
   - When a browser wallet is connected, selecting a saved account does **not** replace the active actor immediately; it is queued as the fallback user to restore after the wallet disconnects

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
- **Production-marked RPCs are not judged by URL alone**: if the node itself identifies as a local **Anvil / Hardhat** runtime, write flows may still use local impersonation / state-override paths even when the saved environment is marked production
- **Once a browser wallet is connected**: it immediately becomes the current actor and the only write signer, and silent fallback is no longer allowed
- **If a saved account is selected while a wallet is connected**: the UI treats it as **selected after disconnect**, so displayed current-user panels stay aligned with the connected wallet until disconnect happens

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
- Whether environment-dependent Test Token behavior still separates production/no-factory restrictions from local Anvil/Hardhat mint fallback
- Whether the Arbitrage page remains accessible

`staple-dashboard-prod` still keeps development- and test-oriented Playwright suites and scripts for fork, local, and multi-environment validation. `prod-smoke` is only one fast regression subset within that broader test set.
