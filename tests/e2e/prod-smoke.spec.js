const { test, expect } = require('@playwright/test');

test('home page exposes multi-environment navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Staple Dashboard Prod/i);
  await expect(page.getByRole('heading', { name: /Staple Dashboard Prod/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Environment', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Test Tokens', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Swap', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pools & Positions', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Arbitrage', exact: true })).toBeVisible();
  await expect(page.getByText(/production-oriented Staple dashboard/i)).toBeVisible();
});

test('environment page ships wallet connection workspace markup', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#wallet-status-card')).toHaveCount(1);
  await expect(page.locator('#wallet-provider-select')).toHaveCount(1);
  await expect(page.locator('#btn-connect-wallet')).toHaveCount(1);
  await expect(page.locator('#btn-refresh-wallets')).toHaveCount(1);
  await expect(page.locator('#btn-switch-wallet-network')).toHaveCount(1);
  await expect(page.locator('#btn-disconnect-wallet')).toHaveCount(1);
  await expect(page.locator('.wallet-action-row')).toHaveCount(1);
  await expect(page.locator('.env-sidebar .nav-item[data-tab="authorization-management"]')).toHaveCount(1);
  await expect(page.locator('.env-sidebar .nav-item[data-tab="minter-v2"]')).toHaveCount(1);
  await expect(page.locator('#remember-chainlink-session')).toHaveCount(1);
  await expect(page.locator('#btn-clear-chainlink-session')).toHaveCount(1);
});

test('chainlink credentials can be remembered for this browser session without localStorage persistence', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.check('#remember-chainlink-session');
  await page.fill('#input-chainlink-key', 'demo-key');
  await page.click('#submit-chainlink-key');
  await page.fill('#input-chainlink-secret', 'demo-secret');
  await page.click('#submit-chainlink-secret');

  const stored = await page.evaluate(() => ({
    local: localStorage.getItem('staple_env_chainlink_v4'),
    session: sessionStorage.getItem('staple_env_chainlink_session_v1'),
    keyText: document.getElementById('current-chainlink-key')?.textContent || '',
    secretText: document.getElementById('current-chainlink-secret')?.textContent || ''
  }));

  expect(stored.local).toBeFalsy();
  expect(stored.session).toContain('demo-key');
  expect(stored.session).toContain('demo-secret');
  expect(stored.keyText).toBe('demo-key');
  expect(stored.secretText).toBe('***');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#remember-chainlink-session')).toBeChecked();
  await expect(page.locator('#current-chainlink-key')).toHaveText('demo-key');
  await expect(page.locator('#current-chainlink-secret')).toHaveText('***');
});

test('environment page can detect OKX wallet injection fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const okxProvider = {
      isOkxWallet: true,
      request: async ({ method }) => {
        if (method === 'eth_accounts') return [];
        if (method === 'eth_chainId') return '0x1';
        if (method === 'net_version') return '1';
        return [];
      }
    };
    window.okxwallet = { ethereum: okxProvider };
    window.ethereum = window.ethereum || okxProvider;
  });
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#wallet-status-card')).toContainText('OKX Wallet');
  await expect(page.locator('#wallet-provider-select')).toContainText('OKX Wallet');
});

test('environment page does not auto-connect from previously exposed wallet accounts', async ({ page }) => {
  await page.addInitScript(() => {
    const priorAddress = '0x1111111111111111111111111111111111111111';
    const provider = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_accounts') return [priorAddress];
        if (method === 'eth_requestAccounts') return [priorAddress];
        if (method === 'eth_chainId') return '0x1';
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        return [];
      },
      on: () => {}
    };
    window.ethereum = provider;
  });
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#wallet-status-card')).not.toContainText('Connected Wallet');
  await expect(page.locator('#wallet-status-card')).toContainText('Ready to connect');
  await expect(page.locator('#wallet-status-card')).not.toContainText('0x1111111111111111111111111111111111111111');
});

test('environment page connects the concrete MetaMask provider instead of an aggregate wallet proxy', async ({ page }) => {
  const metaMaskAddress = '0x2222222222222222222222222222222222222222';

  await page.addInitScript(() => {
    window.__walletCalls = [];
    const metaMaskAddress = '0x2222222222222222222222222222222222222222';
    const okxAddress = '0x3333333333333333333333333333333333333333';

    const metaMaskProvider = {
      isMetaMask: true,
      providerInfo: { name: 'MetaMask', rdns: 'io.metamask' },
      request: async ({ method }) => {
        window.__walletCalls.push(`metamask:${method}`);
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_revokePermissions') return [];
        if (method === 'eth_requestAccounts') return [metaMaskAddress];
        if (method === 'eth_chainId') return '0x1';
        return [];
      },
      on: () => {}
    };

    const okxProvider = {
      isOkxWallet: true,
      providerInfo: { name: 'OKX Wallet', rdns: 'com.okex.wallet' },
      request: async ({ method }) => {
        window.__walletCalls.push(`okx:${method}`);
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_revokePermissions') return [];
        if (method === 'eth_requestAccounts') return [okxAddress];
        if (method === 'eth_chainId') return '0x1';
        return [];
      },
      on: () => {}
    };

    const aggregateProvider = {
      isMetaMask: true,
      providers: [metaMaskProvider, okxProvider],
      request: async ({ method }) => {
        window.__walletCalls.push(`aggregate:${method}`);
        return okxProvider.request({ method });
      },
      on: () => {}
    };

    window.ethereum = aggregateProvider;
    window.okxwallet = { ethereum: okxProvider };
  });

  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#wallet-provider-select option')).toHaveCount(2);

  const result = await page.evaluate(async () => {
    const wallets = window.environment.listBrowserWallets();
    const metaMask = wallets.find((item) => item.label === 'MetaMask');
    await window.environment.connectBrowserWallet(metaMask.id);
    return {
      calls: window.__walletCalls.slice(),
      walletState: window.environment.getWalletState()
    };
  });

  expect(result.calls.some((entry) => entry.startsWith('metamask:eth_requestAccounts'))).toBeTruthy();
  expect(result.calls.some((entry) => entry.startsWith('aggregate:eth_requestAccounts'))).toBeFalsy();
  expect(result.calls.some((entry) => entry.startsWith('okx:eth_requestAccounts'))).toBeFalsy();
  expect(result.walletState.address).toBe(metaMaskAddress);
  expect(result.walletState.providerLabel).toBe('MetaMask');
  await expect(page.locator('#wallet-status-card')).toContainText(metaMaskAddress);
  await expect(page.locator('#wallet-status-card')).toContainText('MetaMask');
});

test('connected wallet can be recovered after refreshing environment and after leaving the page', async ({ page }) => {
  const metaMaskAddress = '0x4444444444444444444444444444444444444444';

  await page.addInitScript(() => {
    const metaMaskAddress = '0x4444444444444444444444444444444444444444';
    const provider = {
      isMetaMask: true,
      providerInfo: { name: 'MetaMask', rdns: 'io.metamask' },
      request: async ({ method }) => {
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_revokePermissions') return [];
        if (method === 'eth_requestAccounts') return [metaMaskAddress];
        if (method === 'eth_accounts') return [metaMaskAddress];
        if (method === 'eth_chainId') return '0x1';
        return [];
      },
      on: () => {}
    };
    window.ethereum = provider;
  });

  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const wallets = window.environment.listBrowserWallets();
    const metaMask = wallets.find((item) => item.label === 'MetaMask');
    await window.environment.connectBrowserWallet(metaMask.id);
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.environment?.getWalletState?.().connected === true);
  const refreshedEnvironmentState = await page.evaluate(() => ({
    walletState: window.environment.getWalletState(),
    user: window.environment.getAllParams().user
  }));
  expect(refreshedEnvironmentState.walletState.connected).toBeTruthy();
  expect(refreshedEnvironmentState.walletState.address).toBe(metaMaskAddress);
  expect(refreshedEnvironmentState.user).toBe(metaMaskAddress);

  await page.goto('/src/pages/swap/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.environment?.getWalletState?.().connected === true);
  const walletState = await page.evaluate(() => window.environment.getWalletState());
  expect(walletState.connected).toBeTruthy();
  expect(walletState.address).toBe(metaMaskAddress);
  expect(walletState.providerLabel).toBe('MetaMask');
});

test('connected wallet signer is preferred over saved user and does not fall back to impersonation', async ({ page }) => {
  const metaMaskAddress = '0x5555555555555555555555555555555555555555';

  await page.addInitScript(() => {
    const metaMaskAddress = '0x5555555555555555555555555555555555555555';
    const provider = {
      isMetaMask: true,
      providerInfo: { name: 'MetaMask', rdns: 'io.metamask' },
      request: async ({ method }) => {
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_revokePermissions') return [];
        if (method === 'eth_requestAccounts') return [metaMaskAddress];
        if (method === 'eth_accounts') return [metaMaskAddress];
        if (method === 'eth_chainId') return '0x1';
        return [];
      },
      on: () => {}
    };
    window.ethereum = provider;
  });

  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    const wallets = window.environment.listBrowserWallets();
    const metaMask = wallets.find((item) => item.label === 'MetaMask');
    await window.environment.connectBrowserWallet(metaMask.id);

    const saved = ethers.Wallet.createRandom();
    window.environment.addUser(saved.address, 'Saved Local User');

    const signer = await window.stapleCommon.resolveSigner(saved.address);
    return {
      resolvedAddress: signer ? await signer.getAddress() : '',
      walletState: window.environment.getWalletState(),
      userListLength: window.environment.getUserList().length
    };
  });

  expect(result.userListLength).toBeGreaterThan(0);
  expect(result.walletState.address).toBe(metaMaskAddress);
  expect(result.resolvedAddress).toBe(metaMaskAddress);
});

test('environment page exposes rebuilt access control tab', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.env-sidebar .nav-item[data-tab="authorization-management"]').click();
  await expect(page.getByRole('heading', { name: 'Access Control', exact: true })).toBeVisible();
  await expect(page.locator('#grant-role-current-user')).toHaveCount(1);
  await expect(page.locator('#grant-role-contract')).toHaveCount(1);
  await expect(page.locator('#grant-role-bytes32')).toHaveCount(1);
  await expect(page.locator('#access-control-members')).toHaveCount(1);
  await expect(page.locator('#access-control-role-exists')).toHaveCount(1);
  await expect(page.locator('#access-control-user-can-manage')).toHaveCount(1);
  await expect(page.locator('#access-control-manage-card')).toHaveCount(1);
  await expect(page.locator('#btn-access-control-add')).toHaveCount(1);
});

test('environment page still exposes minter tab', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.env-sidebar .nav-item[data-tab="minter-v2"]').click();
  await expect(page.getByRole('heading', { name: 'Minter', exact: true })).toBeVisible();
  await expect(page.locator('#btn-minter-v2-execute')).toHaveCount(1);
  await expect(page.locator('#minter-v2-token')).toHaveCount(1);
  await expect(page.locator('#minter-v2-receiver')).toHaveCount(1);
  await expect(page.locator('#minter-v2-amount')).toHaveCount(1);
  await expect(page.locator('#btn-minter-v2-refresh-native')).toHaveCount(1);
  await expect(page.locator('#minter-v2-native-refresh-note')).toHaveCount(1);
});

test('normal notifications do not render as error toasts', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.stapleCommon.notifyUser('Connected MetaMask');
    window.stapleCommon.notifyUser('Wallet network switched to match the selected RPC');
    window.stapleCommon.notifyUser('Browser wallet disconnected');
    window.stapleCommon.notifyUser('Current user cannot sign transactions on this RPC. Connect the matching wallet or use an impersonation-capable local RPC.');
  });

  const toasts = page.locator('.env-toast');
  await expect(toasts).toHaveCount(4);
  await expect(toasts.nth(0)).toHaveClass(/env-toast--success|env-toast--info/);
  await expect(toasts.nth(1)).toHaveClass(/env-toast--success|env-toast--info/);
  await expect(toasts.nth(2)).toHaveClass(/env-toast--success|env-toast--info/);
  await expect(toasts.nth(3)).toHaveClass(/env-toast--error/);
});

test('environment page rejects manual private-key style saved-account input', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#input-user-pk')).toHaveCount(0);

  const outcome = await page.evaluate(() => {
    const privateKey = ethers.Wallet.createRandom().privateKey;
    try {
      window.environment.addUser(privateKey, 'Should Fail');
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String(error?.message || error) };
    }
  });

  expect(outcome.ok).toBeFalsy();
  expect(outcome.message).toContain('Manual private key configuration is disabled');
});

test('random wallet private key is shown once and not persisted in saved accounts or localStorage', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.nav-item[data-tab="user-settings"]').click();
  await expect(page.locator('#btn-generate-random')).toBeVisible();
  await page.click('#btn-generate-random');

  const generated = await page.evaluate(() => ({
    preview: document.getElementById('generated-user-private-key')?.value || '',
    address: document.getElementById('input-user-address')?.value || '',
    nickname: document.getElementById('input-user-nickname')?.value || '',
    storedUserRaw: localStorage.getItem('staple_env_user_v2'),
    userList: window.environment.getUserList()
  }));

  expect(generated.preview).toMatch(/^0x[0-9a-fA-F]{64}$/);
  expect(generated.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  expect(generated.nickname).toContain('Random 0x');
  expect(generated.userList).toEqual([]);
  expect(generated.storedUserRaw || '').not.toContain(generated.preview);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#generated-user-secret-panel')).toBeHidden();
  await expect(page.locator('#input-user-address')).toHaveValue('');
});

test('chainlink session can be forgotten explicitly', async ({ page }) => {
  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.check('#remember-chainlink-session');
  await page.fill('#input-chainlink-key', 'forget-me-key');
  await page.click('#submit-chainlink-key');
  await page.fill('#input-chainlink-secret', 'forget-me-secret');
  await page.click('#submit-chainlink-secret');
  await page.click('#btn-clear-chainlink-session');

  const stored = await page.evaluate(() => ({
    session: sessionStorage.getItem('staple_env_chainlink_session_v1'),
    keyText: document.getElementById('current-chainlink-key')?.textContent || '',
    secretText: document.getElementById('current-chainlink-secret')?.textContent || '',
    rememberChecked: !!document.getElementById('remember-chainlink-session')?.checked
  }));

  expect(stored.session).toBeFalsy();
  expect(stored.keyText).toBe('Not Set');
  expect(stored.secretText).toBe('Not Set');
  expect(stored.rememberChecked).toBeFalsy();
});

test('testtoken page still exposes mint actions', async ({ page }) => {
  await page.goto('/src/pages/testtoken/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Test Tokens/i })).toBeVisible();
  await expect(page.locator('#btn-set-eth')).toHaveCount(1);
  await expect(page.locator('#btn-mint-all')).toHaveCount(1);
  await expect(page.locator('#btn-create-token-card')).toHaveCount(1);
});

test('arbitrage page remains accessible for test environments', async ({ page }) => {
  await page.goto('/src/pages/arbitrage/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'External Arbitrage', exact: true })).toBeVisible();
  await expect(page.locator('#execute-arb-btn')).toHaveCount(1);
});
