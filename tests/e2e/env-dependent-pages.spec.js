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

async function expectNonFlashEditRoutesThroughFactory(page, { isProduction }) {
  const config = {
    isProduction,
    factoryAddress: '0x1000000000000000000000000000000000000001',
    oracleAddress: '0x2000000000000000000000000000000000000002',
    jrToken: '0x3000000000000000000000000000000000000003',
    collateralToken: '0x4000000000000000000000000000000000000004',
    lendingToken: '0x5000000000000000000000000000000000000005',
    adminAddress: '0x6000000000000000000000000000000000000006',
    strategyAddress: '0x7000000000000000000000000000000000000007',
    zeroAddress: '0x0000000000000000000000000000000000000000',
    operatorRole: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
  };

  await page.goto('/src/pages/jr-pricing/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((cfg) => {
    window.__jrPricingCalls = [];

    const providerMock = {
      _isProvider: true,
      getNetwork: async () => ({ chainId: 11155111, name: 'sepolia' }),
      getCode: async (address) => {
        const lower = String(address || '').toLowerCase();
        if ([cfg.factoryAddress, cfg.oracleAddress].map((item) => item.toLowerCase()).includes(lower)) {
          return '0x1234';
        }
        return '0x';
      }
    };

    const factoryWriteInterface = new window.ethers.utils.Interface([
      'function setOracleDefaultNonFlashLoanParams(address,address,(uint64,uint24,address,uint24,uint24))'
    ]);
    const oracleWriteInterface = new window.ethers.utils.Interface([
      'function setJrTokenNonFlashLoanParams(address,(uint64,uint24,address,uint24,uint24))'
    ]);

    const normalizeValue = (value) => {
      if (Array.isArray(value)) return value.map(normalizeValue);
      if (value && typeof value === 'object') {
        if (typeof value.toNumber === 'function') return value.toNumber();
        const output = {};
        for (const [key, inner] of Object.entries(value)) {
          if (/^\d+$/.test(key)) continue;
          output[key] = normalizeValue(inner);
        }
        return output;
      }
      return value;
    };

    const signer = {
      _isSigner: true,
      provider: providerMock,
      getAddress: async () => cfg.adminAddress,
      async sendTransaction(tx) {
        const to = String(tx?.to || '').toLowerCase();
        if (to === cfg.factoryAddress.toLowerCase()) {
          const parsed = factoryWriteInterface.parseTransaction({ data: tx.data, value: tx.value || 0 });
          window.__jrPricingCalls.push({ method: parsed.name, args: normalizeValue(parsed.args) });
        }
        if (to === cfg.oracleAddress.toLowerCase()) {
          const parsed = oracleWriteInterface.parseTransaction({ data: tx.data, value: tx.value || 0 });
          window.__jrPricingCalls.push({ method: parsed.name, args: normalizeValue(parsed.args) });
        }
        return {
          hash: '0x' + '1'.repeat(64),
          wait: async () => ({ status: 1 })
        };
      },
      connect(nextProvider) {
        this.provider = nextProvider;
        return this;
      }
    };

    window.environment.getAllParams = () => ({
      isProduction: cfg.isProduction,
      hasJrPricing: true,
      chainID: 11155111,
      jrPricingFactory: cfg.factoryAddress
    });
    window.environment.getWalletState = () => ({
      connected: true,
      providerId: 'metamask',
      providerLabel: 'MetaMask',
      address: cfg.adminAddress,
      chainId: 11155111
    });
    window.environment.getConnectedWalletSigner = () => signer;

    window.stapleCommon.getRpcProvider = () => providerMock;
    window.stapleCommon.resolveSigner = async () => signer;

    const emptyParams = {
      waitTime: 0,
      borrowRate: 0,
      borrowRateStrategy: cfg.zeroAddress,
      riskFreeRate: 0,
      waitingPeriodRisk: 0
    };
    const defaultParams = {
      waitTime: 86400,
      borrowRate: 80000,
      borrowRateStrategy: cfg.zeroAddress,
      riskFreeRate: 0,
      waitingPeriodRisk: 0
    };

    const resolveCall = (target, method, params = []) => {
      const lower = String(target || '').toLowerCase();
      if (method === 'symbol' && lower === cfg.jrToken.toLowerCase()) return 'JRMOCK';
      if (lower === cfg.factoryAddress.toLowerCase()) {
        if (method === 'getSupportedJrTokens') return [cfg.jrToken];
        if (method === 'getOracle') return cfg.oracleAddress;
        if (method === 'OPERATOR_ROLE') return cfg.operatorRole;
        if (method === 'getRoleMemberCount') return 1;
        if (method === 'getRoleMember') return cfg.adminAddress;
      }
      if (lower === cfg.oracleAddress.toLowerCase()) {
        if (method === 'getConfig') {
          return {
            spotOracle: cfg.zeroAddress,
            collateralToken: cfg.collateralToken,
            lendingToken: cfg.lendingToken,
            principalConverterSplit: cfg.zeroAddress,
            aavePrincipalConverter: cfg.zeroAddress,
            morphoPrincipalConverter: cfg.zeroAddress,
            flashLoanFeeRate: 0,
            slippage: 500,
            slippageProvider: cfg.zeroAddress,
            nonFlashLoanParams: defaultParams
          };
        }
        if (method === 'getSlippage') return 500;
        if (method === 'OPERATOR_ROLE') return cfg.operatorRole;
        if (method === 'getRoleMemberCount') return 1;
        if (method === 'getRoleMember') return cfg.factoryAddress;
        if (method === 'getJrTokenConfig') {
          return {
            supportedExitTypes: 2,
            bondifySourceType: 3,
            bondifyConfigId: '1',
            marketAdjustment: 0,
            hasCustomParams: false,
            customParams: emptyParams
          };
        }
        if (method === 'getBorrowRate') return 80000;
        if (method === 'getNonFlashLoanParams') return defaultParams;
        if (method === 'getSpotPrice') return '1000000000000000000';
        if (method === 'getExitPrice') return '950000000000000000';
      }
      throw new Error(`Unhandled mock call: ${lower}:${method}:${JSON.stringify(params)}`);
    };

    window.RpcManager = {
      call: async (contract, method, params = []) => resolveCall(contract?.address || contract?.target || '', method, params),
      multicall: async (calls) => calls.map((call) => {
        try {
          return resolveCall(call.target, call.method, call.params || []);
        } catch (error) {
          return call.allowFailure ? null : Promise.reject(error);
        }
      })
    };
  }, config);

  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#jr-status')).toContainText('Loaded 1 JR token records');
  await expect(page.getByRole('button', { name: 'Edit Default' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Edit Default' }).first().click();
  await expect(page.locator('#edit-modal-title')).toContainText('Edit Oracle Default Non-Flash Params');

  await page.fill('#modal-wait-time', '3');
  await page.fill('#modal-borrow-rate', '12.5');
  await page.fill('#modal-risk-free-rate', '1');
  await page.fill('#modal-waiting-risk', '0.75');
  await page.fill('#modal-borrow-strategy', config.strategyAddress);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  await expect.poll(async () => page.evaluate(() => window.__jrPricingCalls.slice())).toEqual([
    {
      method: 'setOracleDefaultNonFlashLoanParams',
      args: [
        config.collateralToken,
        config.lendingToken,
        [259200, 125000, config.strategyAddress, 10000, 7500]
      ]
    }
  ]);
}

test('jr-pricing production non-flash edits route through factory defaults', async ({ page }) => {
  await expectNonFlashEditRoutesThroughFactory(page, { isProduction: true });
});

test('jr-pricing test-environment non-flash edits also route through factory defaults', async ({ page }) => {
  await expectNonFlashEditRoutesThroughFactory(page, { isProduction: false });
});

test('jr-pricing falls back to direct oracle reads when batch state loading is partial', async ({ page }) => {
  const cfg = {
    factoryAddress: '0x1000000000000000000000000000000000000001',
    oracleAddress: '0x2000000000000000000000000000000000000002',
    jrToken: '0x3000000000000000000000000000000000000003',
    collateralToken: '0x4000000000000000000000000000000000000004',
    lendingToken: '0x5000000000000000000000000000000000000005',
    adminAddress: '0x6000000000000000000000000000000000000006',
    zeroAddress: '0x0000000000000000000000000000000000000000',
    operatorRole: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
  };

  await page.goto('/src/pages/jr-pricing/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((config) => {
    const providerMock = {
      _isProvider: true,
      getNetwork: async () => ({ chainId: 11155111, name: 'sepolia' }),
      getCode: async (address) => {
        const lower = String(address || '').toLowerCase();
        if ([config.factoryAddress, config.oracleAddress].map((item) => item.toLowerCase()).includes(lower)) return '0x1234';
        return '0x';
      }
    };

    const defaultParams = {
      waitTime: 86400,
      borrowRate: 80000,
      borrowRateStrategy: config.zeroAddress,
      riskFreeRate: 0,
      waitingPeriodRisk: 0
    };

    window.environment.getAllParams = () => ({
      isProduction: true,
      hasJrPricing: true,
      chainID: 11155111,
      jrPricingFactory: config.factoryAddress
    });

    window.stapleCommon.getRpcProvider = () => providerMock;

    const resolveCall = (target, method, params = []) => {
      const lower = String(target || '').toLowerCase();
      if (method === 'symbol' && lower === config.jrToken.toLowerCase()) return 'JRMOCK';
      if (lower === config.factoryAddress.toLowerCase()) {
        if (method === 'getSupportedJrTokens') return [config.jrToken];
        if (method === 'getOracle') return config.oracleAddress;
      }
      if (lower === config.oracleAddress.toLowerCase()) {
        if (method === 'getConfig') {
          return {
            spotOracle: config.zeroAddress,
            collateralToken: config.collateralToken,
            lendingToken: config.lendingToken,
            principalConverterSplit: config.zeroAddress,
            aavePrincipalConverter: config.zeroAddress,
            morphoPrincipalConverter: config.zeroAddress,
            flashLoanFeeRate: 0,
            slippage: 500,
            slippageProvider: config.zeroAddress,
            nonFlashLoanParams: defaultParams
          };
        }
        if (method === 'getSlippage') return 500;
        if (method === 'OPERATOR_ROLE') return config.operatorRole;
        if (method === 'getRoleMemberCount') return 1;
        if (method === 'getRoleMember') return config.adminAddress;
        if (method === 'getJrTokenConfig') {
          return {
            supportedExitTypes: 2,
            bondifySourceType: 3,
            bondifyConfigId: '1',
            marketAdjustment: 0,
            hasCustomParams: false,
            customParams: defaultParams
          };
        }
        if (method === 'getBorrowRate') return 80000;
        if (method === 'getNonFlashLoanParams') return defaultParams;
        if (method === 'getSpotPrice') return '1000000000000000000';
        if (method === 'getExitPrice') return '950000000000000000';
      }
      throw new Error(`Unhandled mock call: ${lower}:${method}:${JSON.stringify(params)}`);
    };

    window.RpcManager = {
      call: async (contract, method, params = []) => resolveCall(contract?.address || contract?.target || '', method, params),
      multicall: async (calls) => calls.map((call) => {
        if (
          String(call.target || '').toLowerCase() === config.oracleAddress.toLowerCase()
          && call.method === 'getNonFlashLoanParams'
        ) {
          return null;
        }
        try {
          return resolveCall(call.target, call.method, call.params || []);
        } catch (error) {
          return call.allowFailure ? null : Promise.reject(error);
        }
      })
    };
  }, cfg);

  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#jr-status')).toContainText('Loaded 1 JR token records');
  await expect(page.locator('#jr-tbody')).toContainText('JRMOCK');
  await expect(page.locator('#jr-tbody')).not.toContainText('Failed to load oracle state');
});

test('jr-pricing treats InvalidOraclePrice spot reads as zero without hiding other data', async ({ page }) => {
  const cfg = {
    factoryAddress: '0x1000000000000000000000000000000000000001',
    oracleAddress: '0x2000000000000000000000000000000000000002',
    jrToken: '0x3000000000000000000000000000000000000003',
    collateralToken: '0x4000000000000000000000000000000000000004',
    lendingToken: '0x5000000000000000000000000000000000000005',
    adminAddress: '0x6000000000000000000000000000000000000006',
    zeroAddress: '0x0000000000000000000000000000000000000000',
    operatorRole: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'
  };

  await page.goto('/src/pages/jr-pricing/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((config) => {
    const providerMock = {
      _isProvider: true,
      getNetwork: async () => ({ chainId: 11155111, name: 'sepolia' }),
      getCode: async (address) => {
        const lower = String(address || '').toLowerCase();
        if ([config.factoryAddress, config.oracleAddress].map((item) => item.toLowerCase()).includes(lower)) return '0x1234';
        return '0x';
      }
    };

    const defaultParams = {
      waitTime: 86400,
      borrowRate: 80000,
      borrowRateStrategy: config.zeroAddress,
      riskFreeRate: 0,
      waitingPeriodRisk: 0
    };

    window.environment.getAllParams = () => ({
      isProduction: true,
      hasJrPricing: true,
      chainID: 11155111,
      jrPricingFactory: config.factoryAddress
    });

    window.stapleCommon.getRpcProvider = () => providerMock;

    const invalidOraclePrice = () => {
      const error = new Error('call revert exception (errorName="InvalidOraclePrice")');
      error.code = 'CALL_EXCEPTION';
      error.errorName = 'InvalidOraclePrice';
      error.errorSignature = 'InvalidOraclePrice()';
      error.data = '0x1f8f95a0';
      return error;
    };

    const resolveCall = (target, method, params = []) => {
      const lower = String(target || '').toLowerCase();
      if (method === 'symbol' && lower === config.jrToken.toLowerCase()) return 'JRZERO';
      if (lower === config.factoryAddress.toLowerCase()) {
        if (method === 'getSupportedJrTokens') return [config.jrToken];
        if (method === 'getOracle') return config.oracleAddress;
      }
      if (lower === config.oracleAddress.toLowerCase()) {
        if (method === 'getConfig') {
          return {
            spotOracle: config.zeroAddress,
            collateralToken: config.collateralToken,
            lendingToken: config.lendingToken,
            principalConverterSplit: config.zeroAddress,
            aavePrincipalConverter: config.zeroAddress,
            morphoPrincipalConverter: config.zeroAddress,
            flashLoanFeeRate: 0,
            slippage: 500,
            slippageProvider: config.zeroAddress,
            nonFlashLoanParams: defaultParams
          };
        }
        if (method === 'getSlippage') return 500;
        if (method === 'OPERATOR_ROLE') return config.operatorRole;
        if (method === 'getRoleMemberCount') return 1;
        if (method === 'getRoleMember') return config.adminAddress;
        if (method === 'getJrTokenConfig') {
          return {
            supportedExitTypes: 2,
            bondifySourceType: 3,
            bondifyConfigId: '1',
            marketAdjustment: 0,
            hasCustomParams: false,
            customParams: defaultParams
          };
        }
        if (method === 'getBorrowRate') return 80000;
        if (method === 'getNonFlashLoanParams') return defaultParams;
        if (method === 'getSpotPrice') throw invalidOraclePrice();
        if (method === 'getExitPrice') return '950000000000000000';
      }
      throw new Error(`Unhandled mock call: ${lower}:${method}:${JSON.stringify(params)}`);
    };

    window.RpcManager = {
      call: async (contract, method, params = []) => resolveCall(contract?.address || contract?.target || '', method, params),
      multicall: async (calls) => calls.map((call) => {
        if (
          String(call.target || '').toLowerCase() === config.oracleAddress.toLowerCase()
          && call.method === 'getSpotPrice'
        ) {
          return null;
        }
        try {
          return resolveCall(call.target, call.method, call.params || []);
        } catch (error) {
          return call.allowFailure ? null : Promise.reject(error);
        }
      })
    };
  }, cfg);

  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('#jr-status')).toContainText('Loaded 1 JR token records');
  await expect(page.locator('#jr-tbody')).toContainText('JRZERO');
  await expect(page.locator('#jr-tbody')).not.toContainText('InvalidOraclePrice');
  await expect(page.locator('#jr-tbody')).not.toContainText('Failed to load oracle state');
  await expect(page.locator('#jr-tbody')).toContainText('0.000000');
});

test('jr-pricing create-oracle no longer depends on legacy bondify manual addresses', async ({ page }) => {
  const cfg = {
    factoryAddress: '0x1000000000000000000000000000000000000001',
    adminAddress: '0x6000000000000000000000000000000000000006',
    zeroAddress: '0x0000000000000000000000000000000000000000'
  };

  await page.goto('/src/pages/jr-pricing/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((config) => {
    window.__jrCreateOracleCalls = [];

    const providerMock = {
      _isProvider: true,
      getNetwork: async () => ({ chainId: 11155111, name: 'sepolia' }),
      getCode: async (address) => String(address || '').toLowerCase() === config.factoryAddress.toLowerCase() ? '0x1234' : '0x'
    };

    const factoryWriteInterface = new window.ethers.utils.Interface([
      'function createOracle((address,address,address,address,address,address,uint24,uint24,address,(uint64,uint24,address,uint24,uint24)))'
    ]);

    const normalizeValue = (value) => {
      if (Array.isArray(value)) return value.map(normalizeValue);
      if (value && typeof value === 'object') {
        if (typeof value.toNumber === 'function') return value.toNumber();
        const output = {};
        for (const [key, inner] of Object.entries(value)) {
          if (/^\d+$/.test(key)) continue;
          output[key] = normalizeValue(inner);
        }
        return output;
      }
      return value;
    };

    const signer = {
      _isSigner: true,
      provider: providerMock,
      getAddress: async () => config.adminAddress,
      async sendTransaction(tx) {
        const parsed = factoryWriteInterface.parseTransaction({ data: tx.data, value: tx.value || 0 });
        window.__jrCreateOracleCalls.push({ method: parsed.name, args: normalizeValue(parsed.args) });
        return {
          hash: '0x' + '2'.repeat(64),
          wait: async () => ({ status: 1 })
        };
      },
      connect(nextProvider) {
        this.provider = nextProvider;
        return this;
      }
    };

    window.environment.getAllParams = () => ({
      isProduction: true,
      hasJrPricing: true,
      chainID: 11155111,
      jrPricingFactory: config.factoryAddress
    });
    window.environment.getWalletState = () => ({
      connected: true,
      providerId: 'metamask',
      providerLabel: 'MetaMask',
      address: config.adminAddress,
      chainId: 11155111
    });
    window.environment.getConnectedWalletSigner = () => signer;

    window.stapleCommon.getRpcProvider = () => providerMock;
    window.stapleCommon.resolveSigner = async () => signer;

    window.RpcManager = {
      call: async (contract, method) => {
        const lower = String(contract?.address || contract?.target || '').toLowerCase();
        if (lower === config.factoryAddress.toLowerCase()) {
          if (method === 'OPERATOR_ROLE') return '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929';
          if (method === 'getRoleMemberCount') return 1;
          if (method === 'getRoleMember') return config.adminAddress;
          if (method === 'getSupportedJrTokens') return [];
          if (method === 'getPairOracle') return '0x3000000000000000000000000000000000000003';
        }
        throw new Error(`Unhandled mock call: ${lower}:${method}`);
      },
      multicall: async () => []
    };
  }, cfg);

  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Oracle Management', exact: true }).click();
  await expect(page.locator('#btn-create-oracle')).toBeEnabled();
  await page.locator('#btn-create-oracle').click();
  await page.fill('#modal-create-collateral', '0x4000000000000000000000000000000000000004');
  await page.fill('#modal-create-lending', '0x5000000000000000000000000000000000000005');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  await expect.poll(async () => page.evaluate(() => window.__jrCreateOracleCalls.slice())).toEqual([
    {
      method: 'createOracle',
      args: [
        [
          cfg.zeroAddress,
          '0x4000000000000000000000000000000000000004',
          '0x5000000000000000000000000000000000000005',
          cfg.zeroAddress,
          cfg.zeroAddress,
          cfg.zeroAddress,
          0,
          500,
          cfg.zeroAddress,
          [604800, 80000, cfg.zeroAddress, 0, 0]
        ]
      ]
    }
  ]);
});

test('testtoken page prefers local anvil mint override even when factory exists and environment is marked production', async ({ page }) => {
  const cfg = {
    user: '0x000000000000000000000000000000000000dEaD',
    token: '0x1000000000000000000000000000000000000001'
  };

  await page.addInitScript((config) => {
    const storage = new Map();
    const ethBalances = new Map();
    const zero32 = '0x'.padEnd(66, '0');
    window.__lastAlert = '';
    window.alert = (message) => {
      window.__lastAlert = String(message || '');
    };

    const readBalanceHex = (token, user) => {
      const holder = ethers.utils.getAddress(user);
      for (let i = 0; i < 50; i++) {
        const slotIndex = ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 32);
        const key = ethers.utils.hexZeroPad(holder, 32);
        const probeSlot = ethers.utils.keccak256(ethers.utils.concat([key, slotIndex]));
        const stored = storage.get(`${String(token).toLowerCase()}:${probeSlot.toLowerCase()}`);
        if (stored) return stored;
      }
      return zero32;
    };

    const providerMock = {
      _isProvider: true,
      async getBalance(address) {
        return ethBalances.get(String(address).toLowerCase()) || ethers.constants.Zero;
      },
      async getStorageAt(address, slot) {
        return storage.get(`${String(address).toLowerCase()}:${String(slot).toLowerCase()}`) || zero32;
      },
      async send(method, params = []) {
        if (method === 'web3_clientVersion') return 'anvil/v1.0.0';
        if (method === 'hardhat_impersonateAccount' || method === 'anvil_impersonateAccount') return true;
        if (method === 'hardhat_setBalance' || method === 'anvil_setBalance') {
          const [address, value] = params;
          ethBalances.set(String(address).toLowerCase(), ethers.BigNumber.from(value));
          return true;
        }
        if (method === 'hardhat_setStorageAt' || method === 'anvil_setStorageAt') {
          const [address, slot, value] = params;
          storage.set(`${String(address).toLowerCase()}:${String(slot).toLowerCase()}`, ethers.utils.hexZeroPad(value, 32));
          return true;
        }
        throw new Error(`Unhandled provider.send method: ${method}`);
      },
      async call(tx) {
        const selector = String(tx?.data || '').slice(0, 10).toLowerCase();
        if (selector === '0x70a08231') {
          const user = ethers.utils.getAddress(`0x${String(tx.data).slice(-40)}`);
          return readBalanceHex(tx.to, user);
        }
        throw new Error(`Unhandled provider.call selector: ${selector}`);
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      window.environment.getAllParams = () => ({
        rpc: 'http://192.168.1.8:8545',
        user: config.user,
        isProduction: true,
        chainID: 1,
        testERC20Factory: '0x2000000000000000000000000000000000000002',
        priceProvider: ''
      });
      window.environment.getSymbols = () => ({ [config.token.toLowerCase()]: 'USDC' });
      window.stapleCommon.getRpcProvider = () => providerMock;
      window.stapleCommon.resolveSigner = async () => null;
      window.contractData.refreshEnvironmentData = async () => {};
      window.contractData.getSupportedTokens = async () => [config.token];
      window.RpcManager = {
        multicall: async (calls) => calls.map((call) => {
          if (call.method === 'decimals') return 6;
          if (call.method === 'balanceOf') return ethers.BigNumber.from(readBalanceHex(call.target, call.params[0]));
          return null;
        })
      };
    }, { once: true });
  }, cfg);

  await page.goto('/src/pages/testtoken/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#btn-mint-all')).toBeEnabled();
  await expect(page.locator('#btn-mint-all')).toHaveAttribute('title', /Local Anvil\/Hardhat runtime detected/i);
  await expect(page.locator('#tokens-tbody')).toContainText('USDC');
  await expect(page.locator('#tokens-tbody')).toContainText('0');

  await page.getByRole('button', { name: 'Mint ETH', exact: true }).click();
  await expect.poll(async () => page.locator('#eth-display').textContent()).not.toBe('0');
  await expect.poll(async () => page.evaluate(() => window.__lastAlert)).toBe('');

  await page.getByRole('button', { name: 'Mint All Tokens', exact: true }).click();
  await expect.poll(async () => page.evaluate(() => window.__lastAlert)).toBe('');
  await expect(page.locator('#tokens-tbody')).toContainText('1000000000000');
});

test('testtoken page does not treat pool assets as test tokens when factory is missing', async ({ page }) => {
  await seedProfile(page, 0, { userAddress: '0x000000000000000000000000000000000000dEaD' });
  await page.goto('/src/pages/testtoken/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#btn-mint-all')).toBeDisabled();
  await expect(page.locator('#tokens-table-container')).toContainText('Test Token Factory not configured');
});

test('environment page resolves jr pricing factory from the selected staple version without a manual modify entry', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('staple_env_rpc_v6', JSON.stringify({
      list: [
        { id: 'sepolia-publicnode', name: 'Sepolia PublicNode', url: 'https://ethereum-sepolia-rpc.publicnode.com' }
      ],
      selectedIndex: 0
    }));
    localStorage.setItem('staple_env_config_v7', JSON.stringify({
      name: 'Versioned JR Pricing Test',
      sections: {
        bondify: { mode: 'fixed', addresses: {} },
        staple: {
          mode: 'address-provider',
          addresses: {},
          versions: [
            {
              id: 'ver-a',
              label: '260528-a',
              version: '260528-a',
              addressProvider: '0x1111111111111111111111111111111111111111',
              jrPricingFactory: '0x1000000000000000000000000000000000000001'
            },
            {
              id: 'ver-b',
              label: '260528-b',
              version: '260528-b',
              addressProvider: '0x2222222222222222222222222222222222222222',
              jrPricingFactory: '0x2000000000000000000000000000000000000002'
            }
          ],
          selectedVersionId: 'ver-a'
        }
      }
    }));
    localStorage.setItem('staple_env_discovery_v6', JSON.stringify({}));
    localStorage.setItem('staple_env_access_v2', JSON.stringify({}));
    localStorage.setItem('staple_env_user_v2', JSON.stringify({ userList: [], selectedUser: '' }));
  });

  await page.goto('/src/pages/environment/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('.nav-item', { hasText: 'Resolved Addresses' }).click();

  await expect(page.locator('#fixed-addresses-container')).toContainText('JR Pricing Factory');
  await expect(page.locator('#fixed-addresses-container')).toContainText('0x1000000000000000000000000000000000000001');
  await expect(page.locator('[data-edit-address="staple::jrPricing_factory"]')).toHaveCount(0);

  await page.locator('#override-panel .user-item', { hasText: '260528-b' }).getByRole('button', { name: 'Use' }).click();
  await expect.poll(async () => page.evaluate(() => window.environment.resolveAddress('jrPricing_factory'))).toBe('0x2000000000000000000000000000000000000002');
  await expect(page.locator('#fixed-addresses-container')).toContainText('0x2000000000000000000000000000000000000002');
});
