const { test, expect } = require('@playwright/test');
const { MAINNET_RPC, hasMainnetForkArtifacts, mainnetForkArtifacts, seedProfile } = require('./helpers/profiles');
const { assertRpcReady, assertCodeExists } = require('./helpers/rpc');

test.describe('dashboard · local rpc profile', () => {
  test.skip(!MAINNET_RPC, 'set DASHBOARD_MAINNET_RPC to a fresh fork RPC before running this spec');
  test.skip(!hasMainnetForkArtifacts(), 'mainnet-fork test setup artifacts are not available in the local staple repo');

  test.beforeAll(async () => {
    const { testSetup } = mainnetForkArtifacts();
    await assertRpcReady(MAINNET_RPC);
    await assertCodeExists(MAINNET_RPC, testSetup.addressProvider);
  });

  test('environment page resolves Address Provider data for local rpc', async ({ page }) => {
    test.slow();
    const { deployVersion, testSetup } = mainnetForkArtifacts();
    await seedProfile(page, 0);
    await page.goto('/src/pages/environment/index.html');

    await expect(page.locator('#current-block-info')).toContainText('Chain');
    await expect(page.locator('#current-block-info')).not.toContainText('Not connected');

    await page.locator('.nav-item', { hasText: 'Resolved Addresses' }).click();
    await expect(page.locator('#override-panel')).toContainText(deployVersion);
    await expect(page.locator('#override-panel')).toContainText(testSetup.addressProvider);
    const stapleHeader = page.locator('.addr-group-header', { hasText: 'Staple' }).first();
    await stapleHeader.click();

    const stapleBody = page.locator('#addr-group-staple');
    await expect(page.locator('#fixed-addresses-container')).toContainText(testSetup.addressProvider);
    await expect(stapleBody.locator('.addr-row').filter({ hasText: /^Controller/ }).first()).not.toContainText('—');
    await expect(stapleBody.locator('.addr-row').filter({ hasText: /^UI Pool Data Provider/ }).first()).not.toContainText('—');
  });
});
