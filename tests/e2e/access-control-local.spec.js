const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { assertRpcReady, assertCodeExists } = require('./helpers/rpc');

const dashboardRoot = path.resolve(__dirname, '..', '..');
const stapleRoot = path.resolve(process.env.STAPLE_REPO_ROOT || path.join(dashboardRoot, '..', 'staple'));
const supportPath = path.join(stapleRoot, 'deployments', '260519-mainnet-fork-check', 'production-support', 'production-support.json');
const ACCESS_CONTROL_RPC = String(process.env.DASHBOARD_ACCESS_CONTROL_RPC || process.env.DASHBOARD_MAINNET_RPC || '').trim();
const ADMIN = '0x8FA9aa69a6e94c1cd49FbF214C833B2911D02553';
const TARGET = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const DEPOSIT_ROLE = '0x2561bf26f818282a3be40719542054d2173eb0d38539e8a8d3cff22f29fd2384';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function requireSupport() {
  if (!fs.existsSync(supportPath)) {
    throw new Error(`Missing production-support JSON: ${supportPath}`);
  }
  return readJson(supportPath);
}

async function seedAccessControlProfile(page, { rpcUrl, addressProvider }) {
  await page.addInitScript(({ rpcUrl, addressProvider, admin, target }) => {
    localStorage.setItem('staple_env_rpc_v6', JSON.stringify({
      list: [{ id: 'local-mainnet-fork', name: 'Local Mainnet Fork', url: rpcUrl }],
      selectedIndex: 0
    }));
    localStorage.setItem('staple_env_config_v7', JSON.stringify({
      name: 'Local Mainnet Fork',
      sections: {
        bondify: { mode: 'fixed', addresses: {} },
        jrPricing: { mode: 'fixed', addresses: {} },
        staple: {
          mode: 'address-provider',
          addresses: {},
          versions: [{
            id: 'ver-mainnet-fork',
            label: '260519-mainnet-fork-check',
            version: '260519-mainnet-fork-check',
            addressProvider
          }],
          selectedVersionId: 'ver-mainnet-fork'
        }
      }
    }));
    localStorage.setItem('staple_env_discovery_v6', JSON.stringify({}));
    localStorage.setItem('staple_env_access_v2', JSON.stringify({}));
    localStorage.setItem('staple_env_user_v2', JSON.stringify({
      userList: [
        { address: admin, nickname: 'Access Admin', tags: ['admin'] },
        { address: target, nickname: 'Access Target', tags: ['member'] }
      ],
      selectedUser: admin
    }));
  }, { rpcUrl, addressProvider, admin: ADMIN, target: TARGET });
}

async function openAccessControl(page, support) {
  await seedAccessControlProfile(page, { rpcUrl: ACCESS_CONTROL_RPC, addressProvider: support.addressProvider });
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.nav-item[data-tab="authorization-management"]').click();
  await page.fill('#grant-role-contract', support.router);
  await page.fill('#grant-role-bytes32', DEPOSIT_ROLE);
  await expect(page.locator('#access-control-user-can-manage')).toHaveText('Yes', { timeout: 30000 });
  await expect(page.locator('#access-control-role-note')).toContainText('can add or remove members', { timeout: 30000 });
}

async function grantDepositRole(page, router, targetAddress) {
  return page.evaluate(async ({ router, role, admin, targetAddress }) => {
    const signer = await window.stapleCommon.resolveSigner(admin);
    const contract = new ethers.Contract(router, [
      'function hasRole(bytes32,address) view returns (bool)',
      'function grantRole(bytes32,address)'
    ], signer);
    const hasRole = await contract.hasRole(role, targetAddress);
    if (hasRole) return 'already-granted';
    const tx = await contract.grantRole(role, targetAddress);
    await tx.wait();
    return tx.hash;
  }, { router, role: DEPOSIT_ROLE, admin: ADMIN, targetAddress });
}

async function revokeDepositRole(page, router, targetAddress) {
  return page.evaluate(async ({ router, role, admin, targetAddress }) => {
    const signer = await window.stapleCommon.resolveSigner(admin);
    const contract = new ethers.Contract(router, [
      'function hasRole(bytes32,address) view returns (bool)',
      'function revokeRole(bytes32,address)'
    ], signer);
    const hasRole = await contract.hasRole(role, targetAddress);
    if (!hasRole) return 'already-revoked';
    const tx = await contract.revokeRole(role, targetAddress);
    await tx.wait();
    return tx.hash;
  }, { router, role: DEPOSIT_ROLE, admin: ADMIN, targetAddress });
}

async function hasDepositRole(page, router, targetAddress) {
  return page.evaluate(async ({ router, role, targetAddress }) => {
    const provider = window.stapleCommon.getRpcProvider();
    const contract = new ethers.Contract(router, ['function hasRole(bytes32,address) view returns (bool)'], provider);
    return await contract.hasRole(role, targetAddress);
  }, { router, role: DEPOSIT_ROLE, targetAddress });
}

async function connectInjectedMetaMask(page, address) {
  await page.addInitScript(({ walletAddress }) => {
    const provider = {
      isMetaMask: true,
      providerInfo: { name: 'MetaMask', rdns: 'io.metamask' },
      request: async ({ method }) => {
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_revokePermissions') return [];
        if (method === 'eth_requestAccounts') return [walletAddress];
        if (method === 'eth_accounts') return [walletAddress];
        if (method === 'eth_chainId') return '0x1';
        return [];
      },
      on: () => {}
    };
    window.ethereum = provider;
  }, { walletAddress: address });
}

test.describe('environment · access control remove role on local rpc', () => {
  test.skip(!ACCESS_CONTROL_RPC, 'set DASHBOARD_ACCESS_CONTROL_RPC (or DASHBOARD_MAINNET_RPC) to a local fork RPC before running this spec');
  test.skip(!fs.existsSync(supportPath), `missing production-support JSON: ${supportPath}`);

  test.beforeAll(async () => {
    const support = requireSupport();
    await assertRpcReady(ACCESS_CONTROL_RPC);
    await assertCodeExists(ACCESS_CONTROL_RPC, support.addressProvider);
    await assertCodeExists(ACCESS_CONTROL_RPC, support.router);
  });

  test('remove role completes on local rpc without browser dialogs', async ({ page }) => {
    const support = requireSupport();
    await openAccessControl(page, support);
    await grantDepositRole(page, support.router, TARGET);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.nav-item[data-tab="authorization-management"]').click();
    await page.fill('#grant-role-contract', support.router);
    await page.fill('#grant-role-bytes32', DEPOSIT_ROLE);

    const removeButton = page.locator(`[data-access-control-revoke="${TARGET}"]`).first();
    await expect(removeButton).toBeVisible({ timeout: 30000 });

    await removeButton.click();
    await expect(removeButton).toHaveText('Confirm Remove', { timeout: 10000 });
    await expect(page.locator('.env-toast__text').last()).toContainText('Click Confirm Remove again', { timeout: 10000 });

    await removeButton.click();
    await expect.poll(async () => await hasDepositRole(page, support.router, TARGET), { timeout: 30000 }).toBe(false);
    await expect(page.locator('.env-toast__text').last()).toContainText('Member removed successfully and the list has been refreshed.', { timeout: 30000 });
    await expect(removeButton).toHaveCount(0, { timeout: 30000 });
  });

  test('remove role failure surfaces a real access-control error instead of generic operation failed', async ({ page }) => {
    const support = requireSupport();
    await openAccessControl(page, support);
    await grantDepositRole(page, support.router, TARGET);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.nav-item[data-tab="authorization-management"]').click();
    await page.fill('#grant-role-contract', support.router);
    await page.fill('#grant-role-bytes32', DEPOSIT_ROLE);

    const removeButton = page.locator(`[data-access-control-revoke="${TARGET}"]`).first();
    await expect(removeButton).toBeVisible({ timeout: 30000 });

    await page.evaluate(() => {
      if (window.__accessControlOriginalResolveSigner) return;
      window.__accessControlOriginalResolveSigner = window.stapleCommon.resolveSigner;
      window.stapleCommon.resolveSigner = async () => {
        throw new Error('unsupported operation: contract runner does not support sending transactions');
      };
    });

    await removeButton.click();
    await expect(removeButton).toHaveText('Confirm Remove', { timeout: 10000 });
    await removeButton.click();

    const expectedMessage = 'Current user cannot sign transactions on this RPC. Connect the matching wallet or use an impersonation-capable local RPC.';
    await expect(page.locator('.env-toast__text').last()).toHaveText(expectedMessage, { timeout: 30000 });
    await expect(page.locator('.env-toast__text').last()).not.toHaveText('Operation failed.');

    await page.evaluate(() => {
      if (window.__accessControlOriginalResolveSigner) {
        window.stapleCommon.resolveSigner = window.__accessControlOriginalResolveSigner;
        delete window.__accessControlOriginalResolveSigner;
      }
    });
    await revokeDepositRole(page, support.router, TARGET);
  });

  test('use admin hides when a different connected wallet controls signing', async ({ page }) => {
    const support = requireSupport();
    await connectInjectedMetaMask(page, TARGET);
    await openAccessControl(page, support);

    await page.evaluate(async () => {
      const wallets = window.environment.listBrowserWallets();
      const metaMask = wallets.find((item) => item.label === 'MetaMask');
      await window.environment.connectBrowserWallet(metaMask.id);
    });

    await page.fill('#grant-role-contract', support.router);
    await page.fill('#grant-role-bytes32', DEPOSIT_ROLE);

    await expect(page.locator('#access-control-user-can-manage')).toHaveText('No', { timeout: 30000 });
    await expect(page.locator('#btn-access-control-use-admin')).toBeHidden();
    await expect(page.locator('#access-control-role-note')).toContainText('connected browser wallet currently controls signing', { timeout: 30000 });
  });
});
