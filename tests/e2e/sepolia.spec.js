const { test, expect } = require('@playwright/test');
const { SEPOLIA_RPC, hasSepoliaArtifacts, sepoliaArtifacts, seedProfile } = require('./helpers/profiles');
const { assertRpcReady, assertCodeExists } = require('./helpers/rpc');

test.describe('dashboard · sepolia profile', () => {
  test.skip(!hasSepoliaArtifacts(), 'sepolia artifacts are not available in the local staple repo');
  test.beforeAll(async () => {
    const { productionSupport, testSupport } = sepoliaArtifacts();
    await assertRpcReady(SEPOLIA_RPC, '0xaa36a7');
    await assertCodeExists(SEPOLIA_RPC, productionSupport.controller);
    await assertCodeExists(SEPOLIA_RPC, productionSupport.uiPoolDataProvider);
    await assertCodeExists(SEPOLIA_RPC, testSupport.addressProvider);
  });

  test('environment page shows sepolia profile with version-bound address provider data', async ({ page }) => {
    const { deployVersion, testSupport } = sepoliaArtifacts();
    await seedProfile(page, 1);
    await page.goto('/src/pages/environment/index.html');

    await expect(page.locator('#current-block-info')).toContainText('Chain');
    await expect(page.locator('#current-block-info')).toContainText('11155111');

    await page.locator('.nav-item', { hasText: 'Resolved Addresses' }).click();
    await expect(page.locator('#override-panel')).toContainText(deployVersion);
    await expect(page.locator('#override-panel')).toContainText(testSupport.addressProvider);
  });

  test('default state keeps manual Bondify and Jr Pricing configuration while rpc switching stays consistent', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/src/pages/environment/index.html');

    await expect(page.locator('#current-block-info')).toContainText('Chain');

    await page.selectOption('#rpc-select', '1');
    await expect(page.locator('#current-block-info')).toContainText('Ethereum PublicNode');

    await page.selectOption('#rpc-select', '0');
    await expect(page.locator('#current-block-info')).toContainText('Sepolia PublicNode');

    await page.fill('#rpc-form-name', 'Temp RPC');
    await page.fill('#rpc-form-url', 'https://ethereum-sepolia-rpc.publicnode.com');
    await page.click('#btn-save-rpc');
    await expect(page.locator('#rpc-select option')).toHaveCount(3);
    await expect(page.locator('#current-block-info')).toContainText('Temp RPC');

    const tempRpcRow = page.locator('#rpc-directory .user-item', { hasText: 'Temp RPC' }).first();
    await tempRpcRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('#rpc-select option')).toHaveCount(2);
    await expect(page.locator('#current-block-info')).toContainText('Ethereum PublicNode');
  });

  test('jr pricing page reports missing manual configuration on sepolia profile', async ({ page }) => {
    await seedProfile(page, 1);
    await page.goto('/src/pages/jr-pricing/index.html');

    await expect(page.locator('#jr-status')).toContainText('JR Pricing factory is not configured for the current environment');
    await expect(page.locator('#jr-tbody')).toContainText('JR Pricing factory is not configured for the current environment');
    await expect(page.locator('#oracle-tbody')).toContainText('JR Pricing factory is not configured for the current environment');
    await expect(page.locator('#btn-create-oracle')).toBeDisabled();
  });

  test('test token page reads ETH balance on sepolia without network-changed errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await seedProfile(page, 1, { userAddress: '0x000000000000000000000000000000000000dEaD' });
    await page.goto('/src/pages/testtoken/index.html');

    await expect(page.locator('#eth-display')).not.toHaveText('-', { timeout: 60000 });
    await expect(page.locator('#tokens-tbody')).toContainText('No tokens found');

    const networkChangedErrors = consoleErrors.filter((text) =>
      text.includes('underlying network changed') || text.includes('refreshEthBalance failed underlying network changed')
    );
    expect(networkChangedErrors).toEqual([]);
  });
});
