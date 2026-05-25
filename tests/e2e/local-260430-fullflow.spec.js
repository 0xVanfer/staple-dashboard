const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const dashboardRoot = path.resolve(__dirname, '..', '..');
const stapleRoot = path.resolve(process.env.STAPLE_REPO_ROOT || path.join(dashboardRoot, '..', 'staple'));
const ETH_LOCAL_DEPLOY_DIR = process.env.DASHBOARD_ETH_LOCAL_DEPLOY_DIR || path.join(stapleRoot, 'deployments', '260430-ethereum-local');
const SEPOLIA_LOCAL_DEPLOY_DIR = process.env.DASHBOARD_SEPOLIA_LOCAL_DEPLOY_DIR || path.join(stapleRoot, 'deployments', '260430-sepolia-local');
const DEFAULT_LOCAL_USER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const ETH_LOCAL_RPC = String(process.env.DASHBOARD_ETH_LOCAL_RPC || '').trim();
const SEPOLIA_LOCAL_RPC = String(process.env.DASHBOARD_SEPOLIA_LOCAL_RPC || '').trim();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildLocalProfile({ rpcName, rpcUrl, addressProvider, version, userAddress }) {
  return {
    staple_env_rpc_v6: JSON.stringify({
      list: [{ id: 'local-rpc', name: rpcName, url: rpcUrl }],
      selectedIndex: 0
    }),
    staple_env_config_v7: JSON.stringify({
      name: `${version} Local`,
      sections: {
        bondify: { mode: 'fixed', addresses: {} },
        staple: {
          mode: 'address-provider',
          addresses: {},
          versions: [
            {
              id: `${version}-local`,
              label: version,
              version,
              addressProvider,
              jrPricingFactory: '0x1000000000000000000000000000000000000001'
            }
          ],
          selectedVersionId: `${version}-local`
        }
      }
    }),
    staple_env_discovery_v6: JSON.stringify({}),
    staple_env_access_v2: JSON.stringify({}),
    staple_env_user_v2: JSON.stringify({
      userList: [{ address: userAddress, nickname: 'Local Admin', tags: ['local', 'admin'] }],
      selectedUser: userAddress
    })
  };
}

async function seedLocalProfile(page, options) {
  const payload = buildLocalProfile(options);
  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
  }, payload);
}

async function acceptDialogs(page) {
  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });
}

async function waitForButtonText(page, selector, expectedText, timeout = 120000) {
  await expect(page.locator(selector)).toHaveText(expectedText, { timeout });
}

async function openCreateTokenModal(page) {
  await page.click('#btn-create-token-card');
  await expect(page.locator('#create-token-modal')).toHaveClass(/show/);
}

function shortAddr(address) {
  return `${String(address).slice(0, 6)}...${String(address).slice(-4)}`;
}

async function mintTokenForUser(page, tokenAddress, userAddress = DEFAULT_LOCAL_USER, wholeAmount = '1000') {
  const balance = await page.evaluate(async ({ tokenAddress, userAddress, wholeAmount }) => {
    const signer = await window.stapleCommon.resolveSigner(userAddress);
    if (!signer) throw new Error(`No signer for ${userAddress}`);
    const provider = window.stapleCommon.getRpcProvider();
    const erc20 = new ethers.Contract(tokenAddress, [
      'function freeMintFor(uint256,address) external',
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ], signer);
    const decimals = Number(window.RpcManager ? await window.RpcManager.call(erc20, 'decimals') : await erc20.decimals());
    const amount = ethers.utils.parseUnits(String(wholeAmount), decimals);
    const tx = await erc20.freeMintFor(amount, userAddress);
    await tx.wait();
    const after = window.RpcManager ? await window.RpcManager.call(erc20, 'balanceOf', [userAddress]) : await erc20.balanceOf(userAddress);
    return after.toString();
  }, { tokenAddress, userAddress, wholeAmount });
  return balance;
}

async function createStapleToken(page, symbol) {
  const beforeTokens = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let i = 0; i < 30; i += 1) {
      try {
        const factory = await window.contracts?.getTestERC20Factory?.();
        if (!factory) {
          await sleep(1000);
          continue;
        }
        const tokens = window.RpcManager
          ? await window.RpcManager.call(factory, 'supportedTokens', [])
          : await factory.supportedTokens();
        if (Array.isArray(tokens) && tokens.length > 0) {
          return tokens.map((t) => String(t).toLowerCase());
        }
      } catch (_) {}
      await sleep(1000);
    }
    return [];
  });

  await openCreateTokenModal(page);
  await page.fill('#input-symbol', symbol);
  await page.fill('#input-decimals', '18');
  await page.selectOption('#input-oracle-type', 'STAPLE');
  await page.fill('#input-initial-price', '1');
  await page.click('#btn-deploy-token');
  await expect(page.locator('#btn-deploy-token')).toHaveText('Deploy Token', { timeout: 180000 });
  await page.click('#modal-close-btn');
  await page.click('#btn-refresh');
  await page.waitForFunction(async ({ createdSymbol, seenTokens }) => {
    const tbodyText = document.querySelector('#tokens-tbody')?.textContent || '';
    if (tbodyText.includes(createdSymbol)) return true;
    try {
      const factory = await window.contracts?.getTestERC20Factory?.();
      if (!factory) return false;
      const tokens = window.RpcManager
        ? await window.RpcManager.call(factory, 'supportedTokens', [])
        : await factory.supportedTokens();
      const normalized = Array.isArray(tokens) ? tokens.map((t) => String(t).toLowerCase()) : [];
      return normalized.some((token) => !seenTokens.includes(token));
    } catch (_) {
      return false;
    }
  }, { createdSymbol: symbol, seenTokens: beforeTokens }, { timeout: 180000 });

  let createdAddress = await page.evaluate((createdSymbol) => {
    const rows = Array.from(document.querySelectorAll('#tokens-tbody tr'));
    const row = rows.find((entry) => String(entry.children?.[0]?.textContent || '').trim() === createdSymbol);
    return row?.querySelector('.btn-copy-address')?.getAttribute('data-address') || '';
  }, symbol);

  createdAddress = await page.evaluate(async ({ createdSymbol, beforeTokens, seedCandidate }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const provider = window.stapleCommon?.getRpcProvider?.();
    const factory = await window.contracts?.getTestERC20Factory?.();
    const cacheKey = Object.keys(localStorage).find((key) => key.startsWith('staple_cache_sym_v4'));

    const cacheSymbol = (token) => {
      if (!cacheKey || !window.ethers?.utils?.isAddress(token)) return;
      const raw = localStorage.getItem(cacheKey);
      const parsed = raw ? JSON.parse(raw) : { timestamp: 0, data: {} };
      parsed.timestamp = Date.now();
      parsed.data = parsed.data || {};
      parsed.data[token.toLowerCase()] = createdSymbol;
      parsed.data[token] = createdSymbol;
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
    };

    const readSymbol = async (token) => {
      if (!provider || !window.ethers?.utils?.isAddress(token)) return '';
      try {
        const erc20 = new ethers.Contract(token, ['function symbol() view returns (string)'], provider);
        return window.RpcManager ? await window.RpcManager.call(erc20, 'symbol', []) : await erc20.symbol();
      } catch (_) {
        return '';
      }
    };

    const acceptCandidate = async (token) => {
      if (!window.ethers?.utils?.isAddress(token)) return '';
      const resolvedSymbol = String(await readSymbol(token) || '').trim();
      if (resolvedSymbol !== createdSymbol) return '';
      cacheSymbol(token);
      return token;
    };

    const rowCandidate = async () => {
      const rows = Array.from(document.querySelectorAll('#tokens-tbody tr'));
      const row = rows.find((entry) => String(entry.children?.[0]?.textContent || '').trim() === createdSymbol);
      return row?.querySelector('.btn-copy-address')?.getAttribute('data-address') || '';
    };

    const directCandidate = await acceptCandidate(seedCandidate);
    if (directCandidate) return directCandidate;

    for (let i = 0; i < 45; i += 1) {
      const fromRow = await acceptCandidate(await rowCandidate());
      if (fromRow) return fromRow;

      try {
        if (factory) {
          const tokens = window.RpcManager
            ? await window.RpcManager.call(factory, 'supportedTokens', [])
            : await factory.supportedTokens();
          const normalized = Array.isArray(tokens) ? tokens.map((t) => String(t)) : [];
          for (const token of normalized) {
            if (beforeTokens.includes(String(token).toLowerCase())) continue;
            const matched = await acceptCandidate(token);
            if (matched) return matched;
          }
        }
      } catch (_) {}

      try {
        if (factory) {
          const lastToken = window.RpcManager
            ? await window.RpcManager.call(factory, 'lastDeployedTestToken', [])
            : await factory.lastDeployedTestToken();
          const matched = await acceptCandidate(lastToken);
          if (matched) return matched;
        }
      } catch (_) {}

      if (window.environment?.refreshSymbols && i % 5 === 0) {
        await window.environment.refreshSymbols(true).catch(() => {});
      }
      await sleep(1000);
    }

    return '';
  }, { createdSymbol: symbol, beforeTokens, seedCandidate: createdAddress });

  if (!createdAddress) {
    throw new Error(`Unable to resolve created token address for ${symbol}`);
  }

  await page.evaluate(async ({ createdSymbol, createdToken }) => {
    if (window.environment?.refreshSymbols) {
      await window.environment.refreshSymbols(true).catch(() => {});
    }
    const cacheKey = Object.keys(localStorage).find((key) => key.startsWith('staple_cache_sym_v4'));
    if (!cacheKey || !window.ethers?.utils?.isAddress(createdToken)) return;
    const raw = localStorage.getItem(cacheKey);
    const parsed = raw ? JSON.parse(raw) : { timestamp: 0, data: {} };
    parsed.timestamp = Date.now();
    parsed.data = parsed.data || {};
    parsed.data[createdToken.toLowerCase()] = createdSymbol;
    parsed.data[createdToken] = createdSymbol;
    localStorage.setItem(cacheKey, JSON.stringify(parsed));
  }, { createdSymbol: symbol, createdToken: createdAddress });

  const readCreatedPrice = async (waitSeconds = 15) => page.evaluate(async ({ createdToken, waitSeconds }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const priceProvider = await window.contracts?.getPriceProvider?.();
    if (!priceProvider || !window.ethers?.utils?.isAddress(createdToken)) return '';

    for (let i = 0; i < waitSeconds; i += 1) {
      try {
        const result = window.RpcManager
          ? await window.RpcManager.call(priceProvider, 'getOutdatedPriceSingle', [createdToken])
          : await priceProvider.getOutdatedPriceSingle(createdToken);
        const price = Array.isArray(result) ? result[0] : result?.[0];
        if (price && String(price) !== '0') {
          return price.toString();
        }
      } catch (_) {}
      await sleep(1000);
    }

    return '';
  }, { createdToken: createdAddress, waitSeconds });

  let createdPrice = await readCreatedPrice(5);
  if (!createdPrice || createdPrice === '0') {
    console.log('[e2e] testtoken: verify created token prices', symbol, createdAddress);
    const verifyReceipt = await page.evaluate(async () => {
      const supported = await window.contractData.getSupportedTokens();
      const user = window.environment?.getAllParams?.().user;
      if (!Array.isArray(supported) || supported.length === 0) {
        throw new Error('No supported tokens available for verifyAll');
      }
      const receipt = await window.contractActions.verifyAll(supported, user);
      return {
        blockNumber: receipt?.blockNumber || null,
        transactionHash: receipt?.transactionHash || ''
      };
    });
    console.log('[e2e] testtoken: verify receipt', JSON.stringify(verifyReceipt));
    createdPrice = await readCreatedPrice(60);
  }

  if (!createdPrice || createdPrice === '0') {
    throw new Error(`Created token price not ready for ${symbol} @ ${createdAddress}`);
  }
  console.log('[e2e] testtoken: created token price', createdPrice);
  return createdAddress;
}

async function selectOptionContaining(page, selector, text) {
  const value = await page.$eval(selector, (el, expectedText) => {
    const options = Array.from(el.options || []);
    const match = options.find((option) => option.textContent.toLowerCase().includes(String(expectedText).toLowerCase()));
    if (!match) throw new Error(`No option containing ${expectedText}`);
    return match.value;
  }, text);
  await page.selectOption(selector, value);
}

async function selectOptionContainingAny(page, selector, candidates) {
  let lastError;
  for (const candidate of candidates.filter(Boolean)) {
    try {
      await selectOptionContaining(page, selector, candidate);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`No option matched for ${selector}`);
}

async function waitForSelectReady(page, selector, minOptions = 1) {
  await page.waitForFunction(({ sel, minCount }) => {
    const el = document.querySelector(sel);
    return !!el && !el.disabled && (el.options?.length || 0) >= minCount;
  }, { sel: selector, minCount: minOptions }, { timeout: 120000 });
}

async function waitForSupportedToken(page, address, timeout = 120000) {
  if (!address) return;
  await page.waitForFunction(async ({ target }) => {
    try {
      await window.environment?.waitUntilReady?.();
      await window.environment?.refreshSymbols?.(true).catch(() => {});
      const supported = await window.contractData?.getSupportedTokens?.();
      return Array.isArray(supported)
        && supported.some((item) => String(item || '').toLowerCase() === String(target || '').toLowerCase());
    } catch (_) {
      return false;
    }
  }, { target: address }, { timeout });
}

async function createPool(page, symbol, address) {
  console.log('[e2e] createPool: open form');
  await waitForSupportedToken(page, address);
  await page.click('#create-pool-btn');
  console.log('[e2e] createPool: wait token select');
  await waitForSelectReady(page, '#cp-token', 2);
  console.log('[e2e] createPool: select token', symbol, address || '');
  if (address) {
    const optionValue = await page.$eval('#cp-token', (el, addr) => {
      const options = Array.from(el.options || []);
      const normalized = String(addr || '').toLowerCase();
      const match = options.find((option) => String(option.value || '').toLowerCase() === normalized)
        || options.find((option) => String(option.textContent || '').includes(addr.slice(0, 6)));
      if (!match) throw new Error(`No pool token option for ${addr}`);
      return match.value;
    }, address);
    await page.selectOption('#cp-token', optionValue);
  } else {
    await selectOptionContainingAny(page, '#cp-token', [symbol]);
  }
  console.log('[e2e] createPool: select risk');
  await page.selectOption('#cp-risk', '1');
  console.log('[e2e] createPool: submit', symbol, address || '');
  await page.click('#cp-action');
  console.log('[e2e] createPool: wait form close');
  await expect(page.locator('#detail-content')).not.toContainText('Create Pool', { timeout: 180000 });
  console.log('[e2e] createPool: wait filter list');
  const filterList = page.locator('#filter-list');
  await expect.poll(async () => await filterList.innerText(), { timeout: 180000 }).toContain(symbol);
}

async function createVtp(page, symbolA, symbolB, addressA = '', addressB = '') {
  await page.click('#create-vtp-btn');
  await waitForSelectReady(page, '#vtp-poolA', 2);
  await waitForSelectReady(page, '#vtp-poolB', 2);
  await selectOptionContainingAny(page, '#vtp-poolA', [symbolA, addressA ? shortAddr(addressA) : '']);
  await selectOptionContainingAny(page, '#vtp-poolB', [symbolB, addressB ? shortAddr(addressB) : '']);
  await page.click('#vtp-action');
  await expect(page.locator('#detail-content')).not.toContainText('Create VTP', { timeout: 180000 });
}

async function modifyRisk(page) {
  await page.click('#modify-risk-btn');
  await page.waitForSelector('#cr-totalLimit');
  const currentValue = Number(await page.locator('#cr-totalLimit').inputValue());
  await page.fill('#cr-totalLimit', String(currentValue + 1));
  await page.click('#cr-save');
  await expect(page.locator('#cr-status')).toContainText('Updated', { timeout: 180000 });
}

async function selectPool(page, symbol, address = '') {
  const candidates = [symbol, address ? shortAddr(address) : ''].filter(Boolean);

  const tryFind = async () => {
    for (const candidate of candidates) {
      await page.fill('#search-input', candidate);
      const nextItem = page.locator('#filter-list .filter-item', { hasText: candidate }).first();
      if (await nextItem.count()) {
        return nextItem;
      }
    }
    return null;
  };

  let item = await tryFind();
  if (!item) {
    if (await page.locator('#refresh-btn').count()) {
      await page.click('#refresh-btn');
      await expect(page.locator('#refresh-btn')).toHaveText('Refresh', { timeout: 120000 });
    }
    item = await tryFind();
  }
  if (!item) throw new Error(`Pool not found for ${symbol} ${address}`);
  await item.click();
  const detail = page.locator('#detail-content');
  if (address) {
    await expect.poll(async () => (await detail.innerText()).toLowerCase(), { timeout: 120000 }).toContain(shortAddr(address).toLowerCase());
  }
  if (symbol) {
    await expect.poll(async () => await detail.innerText(), { timeout: 120000 }).toContain(symbol);
  }
}

async function waitForButtonCycle(page, selector, idleText, trigger, timeout = 180000) {
  await trigger();
  await page.waitForFunction(({ sel, idle }) => {
    const el = document.querySelector(sel);
    return !!el && String(el.textContent || '') !== String(idle || '');
  }, { sel: selector, idle: idleText }, { timeout: 10000 });
  await expect(page.locator(selector)).toHaveText(idleText, { timeout });
}

async function pauseAndUnpausePool(page) {
  const pauseBtn = page.locator('#pause-btn');
  const initialText = await pauseBtn.textContent();
  const targetText = initialText && initialText.includes('Pause') ? 'Unpause Pool' : 'Pause Pool';
  await waitForButtonCycle(page, '#pause-btn', targetText, async () => {
    await pauseBtn.click();
  });
  await waitForButtonCycle(page, '#pause-btn', initialText || 'Pause Pool', async () => {
    await page.locator('#pause-btn').click();
  });
}

async function fillTargetAllocationForPair(page, symbolA, symbolB, value, addressA = '', addressB = '') {
  const shortA = addressA ? shortAddr(addressA) : '';
  const shortB = addressB ? shortAddr(addressB) : '';
  const candidates = [
    `${symbolA} / ${symbolB}`,
    `${symbolB} / ${symbolA}`,
    shortA && symbolB ? `${shortA} / ${symbolB}` : '',
    shortA && symbolB ? `${symbolB} / ${shortA}` : '',
    symbolA && shortB ? `${symbolA} / ${shortB}` : '',
    symbolA && shortB ? `${shortB} / ${symbolA}` : '',
    shortA && shortB ? `${shortA} / ${shortB}` : '',
    shortA && shortB ? `${shortB} / ${shortA}` : ''
  ].filter(Boolean);

  const findBlock = async () => {
    for (const candidate of candidates) {
      const nextBlock = page.locator('.vtp-block', { hasText: candidate }).first();
      if (await nextBlock.count()) {
        return nextBlock;
      }
    }
    return null;
  };

  let block = await findBlock();
  if (!block) {
    if (await page.locator('#refresh-btn').count()) {
      await page.click('#refresh-btn');
      await expect(page.locator('#refresh-btn')).toHaveText('Refresh', { timeout: 120000 });
    }
    block = await findBlock();
  }
  if (!block) throw new Error(`VTP block not found for ${symbolA}/${symbolB}`);
  await expect(block).toBeVisible({ timeout: 120000 });
  const inputs = block.locator('input[id^="target-expanded-"], input[id^="target-collapsed-"]');
  const inputCount = await inputs.count();
  if (!inputCount) throw new Error(`Target input missing for ${symbolA}/${symbolB}`);
  for (let i = 0; i < inputCount; i += 1) {
    await inputs.nth(i).evaluate((el, nextValue) => {
      el.value = String(nextValue);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
}

async function waitForPoolSideLiquidity(page, selectedPoolAddress, timeout = 180000) {
  if (!selectedPoolAddress) return;
  await page.waitForFunction(async (poolAddress) => {
    const positive = (value) => {
      if (!value) return false;
      if (typeof value === 'string') return value !== '0' && !/^0x0+$/i.test(value);
      if (typeof value === 'number') return value > 0;
      if (value?._isBigNumber) return !value.isZero();
      return false;
    };
    if (window.environment?.refreshPoolInfo) {
      await window.environment.refreshPoolInfo(true).catch(() => {});
    }
    const pools = await window.contractData.getPools();
    const selected = (pools || []).find((pool) => String(pool?.params?.asset || '').toLowerCase() === String(poolAddress || '').toLowerCase());
    if (!selected) return false;
    return positive(selected?.status?.liability);
  }, selectedPoolAddress, { timeout });
}

async function waitForVtpSideLiquidity(page, { selectedPoolAddress = '', targetAddressA = '', targetAddressB = '' } = {}, timeout = 180000) {
  if (!selectedPoolAddress || !targetAddressA || !targetAddressB) return;
  await page.waitForFunction(async ({ poolAddress, addressA, addressB }) => {
    const positive = (value) => {
      if (!value) return false;
      if (typeof value === 'string') return value !== '0' && !/^0x0+$/i.test(value);
      if (typeof value === 'number') return value > 0;
      if (value?._isBigNumber) return !value.isZero();
      return false;
    };
    const lowerPool = String(poolAddress || '').toLowerCase();
    const expected = new Set([String(addressA || '').toLowerCase(), String(addressB || '').toLowerCase()]);
    if (window.environment?.refreshPoolInfo) {
      await window.environment.refreshPoolInfo(true).catch(() => {});
    }
    const pools = await window.contractData.getPools();
    const selected = (pools || []).find((pool) => String(pool?.params?.asset || '').toLowerCase() === lowerPool);
    if (!selected) return false;
    const related = (selected.relatedVtps || []).find((vtp) => {
      const a0 = String(vtp?.token0?.params?.asset || '').toLowerCase();
      const a1 = String(vtp?.token1?.params?.asset || '').toLowerCase();
      return expected.has(a0) && expected.has(a1);
    });
    if (!related) return false;
    const selectedToken = String(related?.token0?.params?.asset || '').toLowerCase() === lowerPool ? related.token0 : related.token1;
    return positive(selectedToken?.status?.liability);
  }, { poolAddress: selectedPoolAddress, addressA: targetAddressA, addressB: targetAddressB }, { timeout });
}

async function logPoolSnapshot(page, label, { selectedPoolAddress = '', targetAddressA = '', targetAddressB = '' } = {}) {
  const snapshot = await page.evaluate(async ({ poolAddress, addressA, addressB }) => {
    const lowerPool = String(poolAddress || '').toLowerCase();
    const expected = new Set([String(addressA || '').toLowerCase(), String(addressB || '').toLowerCase()]);
    if (window.environment?.refreshPoolInfo) {
      await window.environment.refreshPoolInfo(true).catch(() => {});
    }
    const pools = await window.contractData.getPools();
    const selected = (pools || []).find((pool) => String(pool?.params?.asset || '').toLowerCase() === lowerPool);
    const related = (selected?.relatedVtps || []).find((vtp) => {
      const a0 = String(vtp?.token0?.params?.asset || '').toLowerCase();
      const a1 = String(vtp?.token1?.params?.asset || '').toLowerCase();
      return expected.has(a0) && expected.has(a1);
    });
    return {
      poolLiability: selected?.status?.liability?.toString?.() || String(selected?.status?.liability || ''),
      vtpId: related?.params?.id?.toString?.() || String(related?.params?.id || ''),
      token0: related?.token0?.params?.asset || '',
      token1: related?.token1?.params?.asset || '',
      token0Liability: related?.token0?.status?.liability?.toString?.() || String(related?.token0?.status?.liability || ''),
      token1Liability: related?.token1?.status?.liability?.toString?.() || String(related?.token1?.status?.liability || '')
    };
  }, { poolAddress: selectedPoolAddress, addressA: targetAddressA, addressB: targetAddressB });
  console.log('[e2e] pools snapshot:', label, JSON.stringify(snapshot));
}

async function adjustPoolTarget(page, { label = '', selectedPoolAddress = '', targetA, targetB, targetAddressA = '', targetAddressB = '', target = '0.5', additional = '0.1' } = {}) {
  if (targetA && targetB) {
    await fillTargetAllocationForPair(page, targetA, targetB, target, targetAddressA, targetAddressB);
  } else {
    const targetInputs = page.locator('input[id^="target-expanded-"], input[id^="target-collapsed-"]');
    const targetInputCount = await targetInputs.count();
    if (!targetInputCount) throw new Error('Target input missing for adjust');
    for (let i = 0; i < targetInputCount; i += 1) {
      await targetInputs.nth(i).evaluate((el, nextValue) => {
        el.value = String(nextValue);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, target);
    }
  }

  console.log('[e2e] pools action:', label || selectedPoolAddress, 'adjust', additional, 'target', target);
  await page.fill('#adjust-additional', additional);
  await waitForButtonCycle(page, '#adjust-btn', 'Adjust Position', async () => {
    await page.click('#adjust-btn');
  });
  await waitForVtpSideLiquidity(page, { selectedPoolAddress, targetAddressA, targetAddressB });
  await logPoolSnapshot(page, `${label || selectedPoolAddress}:after-adjust`, { selectedPoolAddress, targetAddressA, targetAddressB });
}

async function depositWithdrawAndAdjust(page, { label = '', selectedPoolAddress = '', targetA, targetB, targetAddressA = '', targetAddressB = '', deposit = '1', target = '0.5', additional = '0.1', withdraw = '0.2' } = {}) {
  console.log('[e2e] pools action:', label || selectedPoolAddress, 'deposit', deposit);
  await page.fill('#deposit-amount', deposit);
  await waitForButtonCycle(page, '#deposit-btn', 'Deposit', async () => {
    await page.click('#deposit-btn');
  });
  await waitForPoolSideLiquidity(page, selectedPoolAddress);
  await logPoolSnapshot(page, `${label || selectedPoolAddress}:after-deposit`, { selectedPoolAddress, targetAddressA, targetAddressB });

  await adjustPoolTarget(page, {
    label,
    selectedPoolAddress,
    targetA,
    targetB,
    targetAddressA,
    targetAddressB,
    target,
    additional
  });

  console.log('[e2e] pools action:', label || selectedPoolAddress, 'withdraw', withdraw);
  await page.fill('#withdraw-amount', withdraw);
  await waitForButtonCycle(page, '#withdraw-btn', 'Withdraw', async () => {
    await page.click('#withdraw-btn');
  });
  await logPoolSnapshot(page, `${label || selectedPoolAddress}:after-withdraw`, { selectedPoolAddress, targetAddressA, targetAddressB });
}

async function updateFirstStaplePrice(page) {
  const updateButton = page.locator('.btn-update-price').first();
  const count = await updateButton.count();
  if (!count) return false;
  await expect(updateButton).toBeVisible({ timeout: 120000 });
  const row = updateButton.locator('xpath=ancestor::tr[1]');
  await row.locator('.tt-price-input').fill('1.23');
  await updateButton.click();
  await expect(updateButton).toHaveText('Update', { timeout: 180000 });
  return true;
}

async function runTestTokenFlow(page, symbolToCreate) {
  console.log('[e2e] testtoken: open');
  await page.goto('/src/pages/testtoken/index.html');
  await expect(page.locator('#eth-display')).not.toHaveText('-', { timeout: 120000 });

  console.log('[e2e] testtoken: seed eth');
  await page.click('#btn-set-eth');
  await expect(page.locator('#eth-display')).not.toHaveText('-', { timeout: 120000 });

  console.log('[e2e] testtoken: mint preset tokens');
  await page.click('#btn-mint-all');
  await waitForButtonText(page, '#btn-mint-all', 'Mint All Tokens', 180000);

  console.log('[e2e] testtoken: verify preset prices');
  await page.click('#btn-verify');
  await waitForButtonText(page, '#btn-verify', 'Verify All Prices', 180000);
  await updateFirstStaplePrice(page);
  await page.click('#btn-verify');
  await waitForButtonText(page, '#btn-verify', 'Verify All Prices', 180000);

  console.log('[e2e] testtoken: create token', symbolToCreate);
  const createdAddress = await createStapleToken(page, symbolToCreate);
  expect(createdAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  console.log('[e2e] testtoken: created token address', createdAddress);

  console.log('[e2e] testtoken: mint all + direct mint', symbolToCreate, createdAddress);
  await page.click('#btn-mint-all');
  await waitForButtonText(page, '#btn-mint-all', 'Mint All Tokens', 180000);
  const mintedBalance = await mintTokenForUser(page, createdAddress, DEFAULT_LOCAL_USER, '1000');
  if (BigInt(mintedBalance) <= 0n) {
    throw new Error(`Minted balance is zero for ${symbolToCreate} @ ${createdAddress}`);
  }
  console.log('[e2e] testtoken: minted balance', mintedBalance);

  return createdAddress;
}

async function waitForVtpPairInPoolsCache(page, assetA, assetB) {
  await page.waitForFunction(async ({ assetA, assetB }) => {
    if (!window.environment?.refreshPoolInfo || !window.contractData?.getPools) return false;
    await window.environment.refreshPoolInfo(true).catch(() => {});
    const pools = await window.contractData.getPools().catch(() => []);
    const lowerA = String(assetA || '').toLowerCase();
    const lowerB = String(assetB || '').toLowerCase();
    return (pools || []).some((pool) =>
      (pool?.relatedVtps || []).some((vtp) => {
        const t0 = String(vtp?.token0?.params?.asset || '').toLowerCase();
        const t1 = String(vtp?.token1?.params?.asset || '').toLowerCase();
        return (t0 === lowerA && t1 === lowerB) || (t0 === lowerB && t1 === lowerA);
      })
    );
  }, { assetA, assetB }, { timeout: 120000 });
}

async function runPoolsFlow(page, createdSymbol, createdAddress) {
  console.log('[e2e] pools: open');
  await page.goto('/src/pages/pools-vtps/index.html');
  await expect(page.locator('#filter-list .filter-item').first()).toBeVisible({ timeout: 120000 });
  await expect(page.locator('#filter-list .filter-item').first()).toBeVisible({ timeout: 120000 });
  console.log('[e2e] pools: create pool', createdSymbol, createdAddress || '');
  await createPool(page, createdSymbol, createdAddress);
  console.log('[e2e] pools: create vtp', createdSymbol, 'CCR');
  await createVtp(page, createdSymbol, 'CCR', createdAddress);

  console.log('[e2e] pools: sync cache after create vtp');
  await waitForVtpPairInPoolsCache(page, createdAddress, ethLocalCcr);

  console.log('[e2e] pools: refresh after create vtp');
  await page.goto('/src/pages/pools-vtps/index.html');
  await expect(page.locator('#filter-list .filter-item').first()).toBeVisible({ timeout: 120000 });

  console.log('[e2e] pools: select CCR');
  await selectPool(page, 'CCR', ethLocalCcr);
  console.log('[e2e] pools: pause/unpause CCR');
  await pauseAndUnpausePool(page);
  console.log('[e2e] pools: adjust CCR side');
  await depositWithdrawAndAdjust(page, {
    label: 'CCR side',
    selectedPoolAddress: ethLocalCcr,
    targetA: createdSymbol,
    targetB: 'CCR',
    targetAddressA: createdAddress,
    targetAddressB: ethLocalCcr,
    target: '0.6',
    withdraw: '0.1'
  });

  console.log('[e2e] pools: refresh before selecting created token');
  await page.goto('/src/pages/pools-vtps/index.html');
  await expect(page.locator('#filter-list .filter-item').first()).toBeVisible({ timeout: 120000 });

  console.log('[e2e] pools: select created token', createdSymbol);
  await selectPool(page, createdSymbol, createdAddress);
  console.log('[e2e] pools: adjust created token side');
  await depositWithdrawAndAdjust(page, {
    label: 'created token side',
    selectedPoolAddress: createdAddress,
    targetA: createdSymbol,
    targetB: 'CCR',
    targetAddressA: createdAddress,
    targetAddressB: ethLocalCcr,
    deposit: '1.2',
    target: '0.7',
    additional: '0.2',
    withdraw: '0.1'
  });

  console.log('[e2e] pools: refresh before re-adjusting CCR side');
  await page.goto('/src/pages/pools-vtps/index.html');
  await expect(page.locator('#filter-list .filter-item').first()).toBeVisible({ timeout: 120000 });
  await selectPool(page, 'CCR', ethLocalCcr);
  console.log('[e2e] pools: re-adjust CCR side after created token liquidity');
  await adjustPoolTarget(page, {
    label: 'CCR side re-adjust',
    selectedPoolAddress: ethLocalCcr,
    targetA: createdSymbol,
    targetB: 'CCR',
    targetAddressA: createdAddress,
    targetAddressB: ethLocalCcr,
    target: '0.6',
    additional: '0.1'
  });
}

async function runSwapFlow(page, { fromSymbol = '', fromAddress = '', toSymbol = '', toAddress = '' } = {}) {
  console.log('[e2e] swap: open', fromSymbol || fromAddress, '->', toSymbol || toAddress);
  await page.goto('/src/pages/swap/index.html');
  await page.waitForSelector('#swap-from');
  await page.waitForFunction(() => {
    const from = document.getElementById('swap-from');
    const to = document.getElementById('swap-to');
    return !!window.__swapDebug
      && !!from
      && !!to
      && (from.options?.length || 0) > 1
      && (to.options?.length || 0) > 1
      && !String(from.options[0]?.textContent || '').includes('Loading')
      && !String(to.options[0]?.textContent || '').includes('Loading');
  }, { timeout: 120000 });

  if (fromAddress) {
    await page.selectOption('#swap-from', fromAddress);
  } else {
    await selectOptionContaining(page, '#swap-from', fromSymbol);
  }
  if (toAddress) {
    await page.selectOption('#swap-to', toAddress);
  } else {
    await selectOptionContaining(page, '#swap-to', toSymbol);
  }
  await page.fill('#swap-amount', '0.1');
  const swapSelection = await page.evaluate(() => ({
    fromValue: document.getElementById('swap-from')?.value || '',
    toValue: document.getElementById('swap-to')?.value || '',
    amountValue: document.getElementById('swap-amount')?.value || ''
  }));

  const swapOutcome = await page.evaluate(async ({ fromValue, toValue, amountValue }) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const capture = (label, extra = {}) => {
      const snapshot = window.__swapDebug?.getSnapshot?.() || {};
      const ctx = snapshot?.selectedSwapContext || {};
      return {
        label,
        buttonText: document.getElementById('btn-execute-swap')?.textContent || '',
        execMsg: document.getElementById('swap-exec-msg')?.textContent || '',
        loading: !!snapshot?.loading,
        error: snapshot?.error || '',
        pathCount: Array.isArray(snapshot?.pathsState) ? snapshot.pathsState.length : 0,
        selectedPathIndex: snapshot?.selectedPathIndex ?? null,
        amountInHuman: snapshot?.amountInHuman || '',
        amountOutHuman: snapshot?.amountOutHuman || '',
        hasSelectedSwapContext: !!snapshot?.selectedSwapContext,
        selectedPathIds: Array.isArray(ctx?.pathIds) ? ctx.pathIds : [],
        estiOutHex: ctx?.estiOutBN?._hex || ctx?.estiOutBN?.hex || '',
        ...extra
      };
    };

    let lastSnapshot = capture('initial');

    for (let i = 0; i < 120; i += 1) {
      const from = document.getElementById('swap-from');
      const to = document.getElementById('swap-to');
      const amount = document.getElementById('swap-amount');
      if (!from || !to || !amount || !window.__swapDebug?.forceRecompute || !window.__swapDebug?.executeSwap) {
        await sleep(500);
        lastSnapshot = capture('waiting-debug-hooks', { iteration: i });
        continue;
      }

      if (fromValue) from.value = fromValue;
      if (toValue) to.value = toValue;
      if (amountValue) amount.value = amountValue;

      from.dispatchEvent(new Event('change', { bubbles: true }));
      to.dispatchEvent(new Event('change', { bubbles: true }));
      amount.dispatchEvent(new Event('input', { bubbles: true }));
      amount.dispatchEvent(new Event('change', { bubbles: true }));

      const result = await Promise.race([
        window.__swapDebug.forceRecompute(),
        sleep(45000).then(() => ({ __timedOut: true }))
      ]);
      if (result?.__timedOut) {
        return {
          ok: false,
          recompute: capture('recompute-timeout', {
            iteration: i,
            timedOut: true
          }),
          execution: null
        };
      }
      lastSnapshot = capture('after-force-recompute', {
        iteration: i,
        resultHasSelectedSwapContext: !!result?.selectedSwapContext,
        resultButtonText: result?.buttonText || ''
      });

      if (result?.selectedSwapContext) {
        const estiOutHex = String(lastSnapshot?.estiOutHex || '').toLowerCase();
        const noAvailablePath = /no available path/i.test(String(lastSnapshot?.buttonText || ''))
          || estiOutHex === '0x00'
          || estiOutHex === '0x0';
        if (noAvailablePath) {
          return {
            ok: false,
            recompute: lastSnapshot,
            execution: null
          };
        }

        const execution = await Promise.race([
          window.__swapDebug.executeSwap()
            .then((execResult) => capture('execute-finished', {
              timedOut: false,
              execButtonText: execResult?.buttonText || ''
            }))
            .catch((error) => capture('execute-error', {
              timedOut: false,
              error: error?.message || String(error || 'unknown execute error')
            })),
          sleep(90000).then(() => capture('execute-timeout', { timedOut: true }))
        ]);
        return {
          ok: !execution?.timedOut,
          recompute: lastSnapshot,
          execution
        };
      }
      await sleep(1000);
    }
    return {
      ok: false,
      recompute: lastSnapshot,
      execution: null
    };
  }, swapSelection);

  console.log('[e2e] swap: outcome', JSON.stringify(swapOutcome));
  expect(swapOutcome?.ok, JSON.stringify(swapOutcome)).toBeTruthy();
  await expect(page.locator('#btn-execute-swap')).toContainText(/Swap|Execute|Select|No Available Path/i, { timeout: 180000 });
}

function getLatestTokenByKey(tokens, tokenKey) {
  if (!Array.isArray(tokens)) return '';
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const item = tokens[i];
    if (item?.tokenKey === tokenKey && item?.token) {
      return item.token;
    }
  }
  return '';
}

const ethLocalSupport = readJson(path.join(ETH_LOCAL_DEPLOY_DIR, 'test-support', 'test-support.json'));
const sepoliaLocalSupport = readJson(path.join(SEPOLIA_LOCAL_DEPLOY_DIR, 'test-support', 'test-support.json'));
const ethLocalTokens = readJson(path.join(ETH_LOCAL_DEPLOY_DIR, 'tokens.json'));
const ethLocalCcr = getLatestTokenByKey(ethLocalTokens, 'ccr');
if (!ethLocalCcr) {
  throw new Error(`Missing CCR token in ${path.join(ETH_LOCAL_DEPLOY_DIR, 'tokens.json')}`);
}

test.describe('dashboard 260430 local full flow', () => {
  test.skip(!ETH_LOCAL_RPC || !SEPOLIA_LOCAL_RPC, 'set DASHBOARD_ETH_LOCAL_RPC and DASHBOARD_SEPOLIA_LOCAL_RPC before running local full flow');
  test.skip(!fs.existsSync(ETH_LOCAL_DEPLOY_DIR) || !fs.existsSync(SEPOLIA_LOCAL_DEPLOY_DIR), 'local deployment directories are not available');

  test('ethereum-local full write flow', async ({ page }) => {
    test.setTimeout(900000);
    await acceptDialogs(page);
    await seedLocalProfile(page, {
      rpcName: 'Ethereum Local 260430',
      rpcUrl: ETH_LOCAL_RPC,
      addressProvider: ethLocalSupport.addressProvider,
      version: '260430',
      userAddress: DEFAULT_LOCAL_USER
    });

    const createdSymbol = `ZZ${Date.now().toString().slice(-4)}`;
    const createdAddress = await runTestTokenFlow(page, createdSymbol);
    await runPoolsFlow(page, createdSymbol, createdAddress);
    await runSwapFlow(page, {
      fromSymbol: createdSymbol,
      fromAddress: createdAddress,
      toSymbol: 'CCR',
      toAddress: ethLocalCcr
    });
  });

  test('sepolia-local dashboard write smoke', async ({ page }) => {
    test.setTimeout(600000);
    await acceptDialogs(page);
    await seedLocalProfile(page, {
      rpcName: 'Sepolia Local 260430',
      rpcUrl: SEPOLIA_LOCAL_RPC,
      addressProvider: sepoliaLocalSupport.addressProvider,
      version: '260430',
      userAddress: DEFAULT_LOCAL_USER
    });

    await page.goto('/src/pages/testtoken/index.html');
    await expect(page.locator('#eth-display')).not.toHaveText('-', { timeout: 120000 });
    await page.click('#btn-set-eth');
    await page.click('#btn-mint-all');
    await waitForButtonText(page, '#btn-mint-all', 'Mint All Tokens', 180000);
    await page.click('#btn-verify');
    await waitForButtonText(page, '#btn-verify', 'Verify All Prices', 180000);

    await page.goto('/src/pages/pools-vtps/index.html');
    await expect(page.locator('#filter-list .filter-item').first()).toBeVisible({ timeout: 120000 });

    await page.goto('/src/pages/swap/index.html');
    await page.waitForSelector('#swap-from');
    await expect.poll(async () => await page.locator('#swap-from option').count(), { timeout: 120000 }).toBeGreaterThan(1);
    await expect.poll(async () => await page.locator('#swap-to option').count(), { timeout: 120000 }).toBeGreaterThan(1);
  });
});
