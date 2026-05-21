const { test, expect } = require('@playwright/test');
const { seedProfile } = require('./helpers/profiles');

const PAGES = [
  { path: '/src/pages/testtoken/index.html', name: 'testtoken', visibleText: /Test Tokens/i },
  { path: '/src/pages/pools-vtps/index.html', name: 'pools-vtps', visibleText: /Pools|Positions/i },
  { path: '/src/pages/swap/index.html', name: 'swap', visibleText: /^Swap$/i },
  { path: '/src/pages/calc/index.html', name: 'calc', visibleText: /Calculator/i },
  { path: '/src/pages/arbitrage/index.html', name: 'arbitrage', visibleText: /External Arbitrage/i },
  { path: '/src/pages/jr-pricing/index.html', name: 'jr-pricing', visibleText: /JR Pricing/i }
];

test.describe('environment dependent page smoke', () => {
  for (const pageDef of PAGES) {
    test(pageDef.name, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`CONSOLE: ${msg.text()}`);
      });

      await seedProfile(page, 0, { userAddress: '0x000000000000000000000000000000000000dEaD' });
      await page.goto(pageDef.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(pageDef.visibleText).first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }
});
