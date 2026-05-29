// Early execution flag: ensure script is loaded correctly
try {
  window.__TT_JS_LOADED = true;
} catch (e) {}

// Dependencies: src/lib/common.js, src/pages/environment/environment.js
(function () {
  // ===== Basic logging utility =====
  const COMMON = window.stapleCommon;
  let lastTokenRows = [];
  let testTokenMinterAnalyzerPromise = null;

  // ===== Refresh state management (avoid race conditions) =====
  let refreshEpoch = 0; // Increment on each refresh to discard stale renders
  const LOCAL_OVERRIDE_MINT_AMOUNT = '1000000';
  const TEST_TOKEN_PROXY_STANDARD_SLOTS = [
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3',
    '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7'
  ];
  const TEST_TOKEN_PROXY_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
  const setRefreshing = (is) => {
    const btn = document.getElementById('btn-refresh');
    if (btn) btn.disabled = !!is;
  };
  const setTableLoading = (msg = 'Loading...') => {
    const root = document.getElementById('tokens-tbody');
    if (root) root.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#666;">${msg}</td></tr>`;
  };

  async function detectLocalStateOverrideCapability() {
    try {
      const runtime = await COMMON.detectLocalNodeRuntimeCapabilities();
      return !!runtime?.isLocalDevRuntime;
    } catch (e) {
      console.warn('[testtoken] failed to detect local state override capability', e);
      return false;
    }
  }

  async function getMintCapabilities() {
    const envParams = environment.getAllParams();
    const factoryAddr = envParams.testERC20Factory;
    const hasFactory = !!(factoryAddr && ethers.utils.isAddress(factoryAddr));
    const canLocalOverrideMint = await detectLocalStateOverrideCapability();
    return {
      hasFactory,
      canLocalOverrideMint,
      prefersLocalOverrideMint: canLocalOverrideMint,
      canMint: hasFactory || canLocalOverrideMint,
      factoryAddr
    };
  }

  // Global error capture: for debugging
  window.addEventListener('error', (e) => console.error('[testtoken.display] window.onerror', e?.message || e, e?.error || ''));
  window.addEventListener('unhandledrejection', (e) => console.error('[testtoken.display] unhandledrejection', e?.reason || e));

  // UI: Update ETH display
  function renderEthBalance(text) {
    const el = document.getElementById('eth-display');
    if (!el) return;
    el.textContent = text;
  }

  // Refresh ETH balance: show '-' on failure
  async function refreshEthBalance() {
    const rpc = environment.getAllParams().rpc;
    const user = environment.getAllParams().user;
    if (!rpc || !user) { renderEthBalance('-'); console.warn('missing rpc or user'); return; }
    try {
      const read = COMMON.getRpcProvider();
      const wei = await read.getBalance(user);
      const eth = ethers.utils.formatEther(wei);
      renderEthBalance(COMMON.formatNumber(String(eth), 6));
    } catch (e) {
      console.error('refreshEthBalance failed', e?.message || e);
      renderEthBalance('-');
    }
  }

  // Table render: use table row format
  function renderTokenTable(rows) {
    const root = document.getElementById('tokens-tbody');
    if (!root) return;
    lastTokenRows = Array.isArray(rows) ? rows.slice() : [];
    if (!rows || rows.length === 0) {
      root.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#666;">No tokens found</td></tr>';
      return;
    }

    const env = window.environment.getAllParams();
    const isProd = env.isProduction;
    const chainID = env.chainID;

    const body = rows.map(r => {
        let addrDisplay = r.address ? (window.stapleCommon?.shortenAddress ? window.stapleCommon.shortenAddress(r.address, 4, 4) : r.address.slice(0,6) + '...' + r.address.slice(-4)) : '-';
        if (isProd && chainID && r.address && window.stapleCommon && window.stapleCommon.getExplorerLink) {
            const link = window.stapleCommon.getExplorerLink(chainID, r.address);
            if (link) {
                addrDisplay = `<a href="${link}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: inherit;">${addrDisplay}</a>`;
            }
        }

        return `
      <tr>
        <td>${r.symbol || '-'}</td>
        <td>
            <div style="font-family:monospace;font-size:12px; display: flex; align-items: center; gap: 5px;">
                ${addrDisplay}
                ${r.address ? `<button class="btn-copy-address" data-address="${r.address}" style="border:none; background:none; cursor:pointer; padding:0; font-size: 14px;" title="Copy Address">📋</button>` : ''}
            </div>
        </td>
        <td>
          <div>${r.readable}</div>
          <div style="color:#999;font-size:11px;">${r.raw}</div>
        </td>
        <td>${r.price}</td>
        <td>${r.verifierType || '-'}</td>
        <td>
          ${(() => {
            const isStaple = r.verifierType === 'STAPLE_v1';
            const isChainlinkFeed = r.verifierType === 'CHAINLINK_DATA_FEED_v1';
            const isChainlinkStream = r.verifierType === 'CHAINLINK_STREAM_v1';
            const isBondifyJr = r.verifierType === 'BONDIFY_JR_v1' || r.verifierType === 'JR_PRICING_v1';
            
            // Chainlink Data Feed Update Logic:
            // Only allowed in non-production (test) environment.
            // Only allowed if the token address matches the aggregator address (Mock Aggregator).
            const canUpdateFeed = isChainlinkFeed && !isProd && r.aggregator && (r.address.toLowerCase() === r.aggregator.toLowerCase());

            if (isStaple || canUpdateFeed) {
                return `<div style="display:flex;align-items:center;gap:6px;">
                  <input type="text" class="tt-price-input" placeholder="Price" 
                         data-token="${r.address}" style="width:80px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;"/>
                  <button class="btn-update-price" 
                          data-token="${r.address}" 
                          data-verifier="${r.verifier}" 
                          data-verifier-type="${r.verifierType}"
                          style="padding:4px 8px;background:#4f46e5;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Update</button>
                 </div>`;
            } else if (isBondifyJr) {
                return `<span style="color:#999;font-size:12px;">See JR Pricing Page</span>`;
            } else if (isChainlinkFeed) {
                return `<span style="color:#999;font-size:12px;">Data Feed (Read-only)</span>`;
            } else if (isChainlinkStream) {
                return `<span style="color:#999;font-size:12px;">Stream (Read-only)</span>`;
            } else {
                return `<span style="color:#999;font-size:12px;">No row action</span>`;
            }
          })()}
        </td>
      </tr>
    `}).join('');
    root.innerHTML = body;
  }

  function syncTestTokenFactoryActions(capabilities) {
    const hasFactory = !!capabilities?.hasFactory;
    const canMint = !!capabilities?.canMint;
    const canLocalOverrideMint = !!capabilities?.canLocalOverrideMint;
    const prefersLocalOverrideMint = !!capabilities?.prefersLocalOverrideMint;
    const mintAllBtn = document.getElementById('btn-mint-all');
    const createTokenCard = document.getElementById('btn-create-token-card');
    if (mintAllBtn) {
      mintAllBtn.disabled = !canMint;
      mintAllBtn.title = canLocalOverrideMint
        ? (prefersLocalOverrideMint
            ? 'Local Anvil/Hardhat runtime detected: Mint All will use token balance override'
            : '')
        : hasFactory
          ? ''
          : 'Test Token Factory is not configured in Environment';
    }
    if (createTokenCard) {
      createTokenCard.style.opacity = hasFactory ? '' : '0.5';
      createTokenCard.style.pointerEvents = hasFactory ? '' : 'none';
      createTokenCard.title = hasFactory ? '' : 'Test Token Factory is not configured in Environment';
    }
    return canMint;
  }

  // Main refresh: get supported tokens -> deduplicate -> concurrent read metadata / balance / price
  async function refreshTokenTable() {
    const envParams = environment.getAllParams();
    const rpc = envParams.rpc;
    const user = envParams.user;
    const mintCapabilities = await getMintCapabilities();
    const canMint = syncTestTokenFactoryActions(mintCapabilities);
    if (!rpc || !user) {
      console.warn('missing rpc or user');
      renderTokenTable([]);
      return;
    }
    if (!canMint) {
      console.warn('missing test token factory and no local override mint capability; skip token discovery for testtoken page');
      renderTokenTable([]);
      setTableLoading('Test Token Factory not configured');
      return;
    }

    // Start refresh: increment epoch + disable button + show loading
    const epoch = ++refreshEpoch;
    setRefreshing(true);
    setTableLoading('Loading...');

    try {
      if (window.contractData?.refreshEnvironmentData) {
        await window.contractData.refreshEnvironmentData();
      }

      let supported = await window.contractData.getSupportedTokens();
      if (!Array.isArray(supported) || supported.length === 0) {
        if (window.contractData?.refreshEnvironmentData) {
          await window.contractData.refreshEnvironmentData();
        }
        supported = await window.contractData.getSupportedTokens();
      }
      if (!Array.isArray(supported) || supported.length === 0) {
        console.warn('no supported tokens (on-chain read empty after refresh retry)');
        if (epoch === refreshEpoch) renderTokenTable([]);
        return;
      }

      // Deduplicate (ignore case)
      const lowerSet = new Set();
      const tokens = [];
      for (const a of supported) {
        const l = String(a || '').toLowerCase();
        if (!ethers.utils.isAddress(a)) continue;
        if (lowerSet.has(l)) continue;
        lowerSet.add(l);
        tokens.push(a);
      }

        let priceProviderAddr = environment.getAllParams().priceProvider;
        if (!ethers.utils.isAddress(priceProviderAddr) && window.contracts?.getPriceProvider) {
          try {
            const priceProvider = await window.contracts.getPriceProvider();
            priceProviderAddr = priceProvider?.address || priceProviderAddr;
          } catch (e) {
            console.warn('PriceProvider fallback lookup failed', e);
          }
        }

        let rows = [];
        if (tokens.length > 0) {
          // Symbols come from environment cache only (no pool info usage here)
          let symbolMap = {};
          try {
            symbolMap = window.environment.getSymbols ? (window.environment.getSymbols() || {}) : {};
          } catch (e) {
            console.warn('Symbol cache unavailable, falling back to abbreviated addresses', e);
            symbolMap = {};
          }

          // Single multicall for decimals and balances
          const erc20Calls = [];
          tokens.forEach(addr => {
            erc20Calls.push({ target: addr, abi: ['function decimals() view returns (uint8)'], method: 'decimals', params: [], allowFailure: true });
            erc20Calls.push({ target: addr, abi: ['function balanceOf(address) view returns (uint256)'], method: 'balanceOf', params: [user], allowFailure: true });
          });

          let erc20Results = [];
          try {
            erc20Results = await window.RpcManager.multicall(erc20Calls);
          } catch (e) {
            console.error('ERC20 multicall failed', e);
            erc20Results = new Array(erc20Calls.length).fill(null);
          }

          let priceResults = [];
          if (priceProviderAddr) {
            const priceCalls = [];
            tokens.forEach(addr => {
              priceCalls.push({ target: priceProviderAddr, abi: ['function getOutdatedPriceSingle(address) view returns (uint256, uint256)'], method: 'getOutdatedPriceSingle', params: [addr], allowFailure: true });
              priceCalls.push({ target: priceProviderAddr, abi: ['function getVerifierSingle(address) view returns (address)'], method: 'getVerifierSingle', params: [addr], allowFailure: true });
            });
            try {
              priceResults = await window.RpcManager.multicall(priceCalls);
            } catch (e) {
              console.warn('Price/Verifier fetch failed (likely PriceProvider issue)', e);
              priceResults = new Array(priceCalls.length).fill(null);
            }
          }

          // Process results
          const verifiersToFetch = new Set();
          const tokenData = [];
          
          let ercIdx = 0;
          let priceIdx = 0;

          for (let i = 0; i < tokens.length; i++) {
            const addr = tokens[i];
            const sym = symbolMap[addr.toLowerCase()] || symbolMap[addr] || (window.stapleCommon?.shortenAddress ? window.stapleCommon.shortenAddress(addr, 4, 4) : `${addr.slice(0,6)}...${addr.slice(-4)}`);

            const decRes = erc20Results[ercIdx++];
            const balRes = erc20Results[ercIdx++];
            const dec = decRes != null ? Number(decRes) : 18;
            const bal = balRes || ethers.constants.Zero;
              
            let price = null, block = null, verifier = null;
              
            if (priceProviderAddr) {
              const pRes = priceResults[priceIdx++];
              if (pRes) { price = pRes[0]; block = pRes[1]; }
              verifier = priceResults[priceIdx++];
            }
              
            if (verifier && verifier !== ethers.constants.AddressZero) verifiersToFetch.add(verifier);
              
            tokenData.push({
              address: addr,
              symbol: sym,
              decimals: dec,
              balance: bal,
              price,
              latestBlock: block,
              verifier
            });
          }
          
          // Fetch oracle types
          const verifierList = Array.from(verifiersToFetch);
          const oracleTypes = {};
          
          // Pre-fill known verifiers to avoid unnecessary calls (and potential errors if contracts are missing)
          const envParams = environment.getAllParams();
          const knownVerifiers = {
              [envParams.chainlinkDataFeedVerifier?.toLowerCase()]: 'CHAINLINK_DATA_FEED_v1',
              [envParams.chainlinkStreamVerifier?.toLowerCase()]: 'CHAINLINK_STREAM_v1',
              [envParams.stapleVerifier?.toLowerCase()]: 'STAPLE_v1',
              [envParams.bondifyJrVerifier?.toLowerCase()]: 'BONDIFY_JR_v1',
              [envParams.oracleVerifierJR?.toLowerCase()]: 'BONDIFY_JR_v1'
          };

          const verifiersToCall = [];
          verifierList.forEach(v => {
              const vLower = v.toLowerCase();
              if (knownVerifiers[vLower]) {
                  oracleTypes[v] = knownVerifiers[vLower];
              } else {
                  verifiersToCall.push(v);
              }
          });

          if (verifiersToCall.length > 0) {
            try {
              const vCalls = verifiersToCall.map(v => ({
                  target: v,
                  abi: ['function oracleType() view returns (string)'],
                  method: 'oracleType',
                  params: [],
                  allowFailure: true
              }));
              const vResults = await window.RpcManager.multicall(vCalls);
              verifiersToCall.forEach((v, i) => {
                  oracleTypes[v] = vResults[i];
              });
            } catch (e) {
                console.warn('Failed to fetch oracle types', e);
            }
          }

          // NEW: Fetch aggregators for CHAINLINK_DATA_FEED_v1
          const chainlinkFeedTokens = [];
          tokens.forEach((t, i) => {
              const v = tokenData[i].verifier;
              if (v && oracleTypes[v] === 'CHAINLINK_DATA_FEED_v1') {
                  chainlinkFeedTokens.push({ token: t, verifier: v });
              }
          });
          
          const aggregatorMap = {};
          if (chainlinkFeedTokens.length > 0) {
              const aggCalls = chainlinkFeedTokens.map(item => ({
                  target: item.verifier,
                  abi: ['function getAggregator(address, address) view returns (address)'],
                  method: 'getAggregator',
                  params: [item.token, ethers.constants.AddressZero],
                  allowFailure: true
              }));
              try {
                  const aggResults = await window.RpcManager.multicall(aggCalls);
                  chainlinkFeedTokens.forEach((item, i) => {
                      aggregatorMap[item.token] = aggResults[i];
                  });
              } catch (e) {
                  console.warn('Failed to fetch aggregators', e);
              }
          }
          
          rows = tokenData.map(d => {
              let raw = '-', readable = '-';
              if (d.balance) {
                  raw = d.balance.toString();
                  readable = COMMON.formatNumber(ethers.utils.formatUnits(d.balance, d.decimals), 6);
              }
              
              let priceStr = '-';
              if (d.price) priceStr = COMMON.formatNumber(ethers.utils.formatUnits(d.price, 18), 6);
              
              return {
                  address: d.address,
                  symbol: d.symbol,
                  decimals: d.decimals,
                  raw,
                  readable,
                  price: priceStr,
                  latestBlock: d.latestBlock ? d.latestBlock.toString() : '-',
                  verifier: d.verifier,
                  verifierType: oracleTypes[d.verifier] || '-',
                  aggregator: aggregatorMap[d.address]
              };
          });
      }

      if (epoch === refreshEpoch) renderTokenTable(rows);
    } catch (e) {
      console.error('refreshTokenTable failed', e?.message || e, e);
      alert('Failed to read token details: ' + (e?.message || e));
      if (epoch === refreshEpoch) renderTokenTable([]);
    } finally {
      if (epoch === refreshEpoch) setRefreshing(false);
    }
  }

  // Set ETH: try impersonate and modify balance (local dev node only)
  async function handleSetEth() {
    const rpc = environment.getAllParams().rpc;
    const user = environment.getAllParams().user;
    if (!rpc || !user) {
      alert('Please set rpc and user in Environment page first');
      return;
    }

    const canLocalOverride = await detectLocalStateOverrideCapability();
    if (!canLocalOverride) {
      alert('Operation disabled in production environment. Please use a faucet.');
      return;
    }

    try {
      const read = COMMON.getRpcProvider();
      const amountHex = ethers.utils.parseUnits('10000000', 18).toHexString(); // 1e7 ETH
      await COMMON.tryImpersonateAccount(read, user).catch(() => {});
      const ok = await COMMON.trySetEthBalance(read, user, amountHex);
      if (!ok) {
        alert('Failed to set ETH balance: local node may not support hardhat/anvil extension methods');
      } else {
        window.showToast?.('ETH balance updated');
      }
    } catch (e) {
      alert('Set ETH failed: ' + (e?.message || e));
    } finally {
      await refreshEthBalance();
    }
  }

  function explainVerifyFailure(error) {
    const raw = [
      error?.reason,
      error?.error?.reason,
      error?.error?.data,
      error?.data,
      error?.message,
      String(error || '')
    ].filter(Boolean).join(' ');

    if (/0x4dfba023/i.test(raw)) return 'source price is zero';
    if (/0x1f4bcb2b/i.test(raw)) return 'price was not updated in the current block';
    if (/0x6fcc7e78/i.test(raw)) return 'asset is not registered in the verifier';
    if (/0x171932da/i.test(raw)) return 'token is bound to a different verifier';
    if (/0xd92e233d/i.test(raw)) return 'a zero address was provided in verify data';
    return 'verification simulation failed';
  }

  async function collectVerifiableTokens(user) {
    const signer = await COMMON.resolveSigner(user);
    if (!signer) {
      throw new Error(await COMMON.describeMissingSigner(user, { subject: 'User' }));
    }

    const priceProvider = await window.contracts.getPriceProvider(signer);
    const rows = Array.isArray(lastTokenRows) ? lastTokenRows.filter((row) => ethers.utils.isAddress(row?.address)) : [];
    const verifiable = [];
    const skipped = [];

    for (const row of rows) {
      let encoded = '0x';
      try {
        encoded = await window.buildPriceProviderVerificationPayload([row.address]);
      } catch (error) {
        skipped.push({ symbol: row.symbol || row.address, reason: 'payload build failed' });
        continue;
      }

      if (!encoded || encoded === '0x') {
        skipped.push({ symbol: row.symbol || row.address, reason: 'payload is empty' });
        continue;
      }

      try {
        if (typeof priceProvider.callStatic?.verify === 'function') {
          await priceProvider.callStatic.verify(encoded);
        } else if (typeof priceProvider.callStatic?.verifyPrices === 'function') {
          await priceProvider.callStatic.verifyPrices(encoded);
        } else {
          throw new Error('price provider verify entrypoint is unavailable');
        }
        verifiable.push(row.address);
      } catch (error) {
        skipped.push({ symbol: row.symbol || row.address, reason: explainVerifyFailure(error) });
      }
    }

    return { signer, verifiable, skipped };
  }

  // Event: Generate verify price payload
  async function handleVerify() {
    const verifyBtn = document.getElementById('btn-verify');
    const originalText = verifyBtn ? verifyBtn.textContent : 'Verify All Prices';
    try {
      await refreshTokenTable();
      const supported = Array.isArray(lastTokenRows) ? lastTokenRows.filter((row) => ethers.utils.isAddress(row?.address)) : [];
      if (!supported.length) {
        alert('No available token');
        return;
      }
      const user = environment.getAllParams().user;
      const priceProvider = environment.getAllParams().priceProvider;
      if (!ethers.utils.isAddress(user) || !ethers.utils.isAddress(priceProvider)) {
        alert('Missing or invalid user / priceProvider');
        return;
      }

      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Preparing...';
      }

      const { verifiable, skipped } = await collectVerifiableTokens(user);
      if (!verifiable.length) {
        const detail = skipped.length
          ? skipped.map((item) => `${item.symbol} (${item.reason})`).join(', ')
          : 'no token passed verification simulation';
        throw new Error(`No tokens can be verified right now: ${detail}`);
      }

      const runtimeSkipped = [...skipped];
      const verified = [];

      for (let index = 0; index < verifiable.length; index++) {
        const token = verifiable[index];
        const row = lastTokenRows.find((item) => String(item.address || '').toLowerCase() === token.toLowerCase());
        const symbol = row?.symbol || token;
        if (verifyBtn) verifyBtn.textContent = `Verifying ${index + 1}/${verifiable.length}...`;
        try {
          await window.contractActions.verifyAll([token], user);
          verified.push(symbol);
        } catch (error) {
          runtimeSkipped.push({ symbol, reason: explainVerifyFailure(error) });
        }
      }

      if (!verified.length) {
        const detail = runtimeSkipped.length
          ? runtimeSkipped.map((item) => `${item.symbol} (${item.reason})`).join(', ')
          : 'no token completed verification';
        throw new Error(`No tokens can be verified right now: ${detail}`);
      }

      if (verifyBtn) verifyBtn.textContent = 'Confirmed';
      const successMessage = runtimeSkipped.length
        ? `Verification complete for ${verified.length} token(s). Skipped ${runtimeSkipped.length} token(s).`
        : `Verification complete for ${verified.length} token(s).`;
      window.showToast?.(successMessage);
      if (runtimeSkipped.length) {
        const detail = runtimeSkipped.map((item) => `${item.symbol} (${item.reason})`).join(', ');
        if (window.stapleCommon?.notifyUser) {
          window.stapleCommon.notifyUser(`Skipped: ${detail}`);
        } else {
          window.showToast?.(`Skipped: ${detail}`);
        }
      }
    } catch (e) {
      console.error('[testtoken] verify failed', e);
      alert('Verification failed: ' + (e?.message || e));
    } finally {
      if (verifyBtn) {
        setTimeout(() => {
          verifyBtn.disabled = false;
          verifyBtn.textContent = originalText;
        }, 300);
      }
    }
    await refreshEthBalance().catch(()=>{});
    await refreshTokenTable().catch(()=>{});
  }

  // Event: Batch mint test tokens
  function toLegalSlot(slot) {
    const normalized = String(slot || '').startsWith('0x') ? String(slot) : `0x${String(slot || '')}`;
    return normalized.replace(/^0x0+/, '') ? normalized.replace(/^0x0+/, '0x') : '0x0';
  }

  async function getTestTokenMinterAnalyzer() {
    if (!testTokenMinterAnalyzerPromise) {
      testTokenMinterAnalyzerPromise = import('https://cdn.jsdelivr.net/npm/evmole@0.7.0/dist/evmole.mjs');
    }
    return testTokenMinterAnalyzerPromise;
  }

  async function pullTokenContractLayout(address, provider) {
    if (typeof provider.getCode !== 'function') {
      throw new Error('RPC provider cannot read contract bytecode');
    }
    const code = await provider.getCode(address);
    if (!code || code === '0x' || code === '0x0') {
      throw new Error('Target address is not a contract');
    }
    const { contractInfo } = await getTestTokenMinterAnalyzer();
    return contractInfo(code, { selectors: true, storage: true });
  }

  async function detectAndPullTokenLayout(address, provider) {
    const analysisResult = await pullTokenContractLayout(address, provider);
    if (!analysisResult) return null;

    for (const slot of TEST_TOKEN_PROXY_STANDARD_SLOTS) {
      const slotValue = await provider.getStorageAt(address, toLegalSlot(slot));
      if (slotValue && slotValue.length === 66 && !/^0x0+$/.test(slotValue)) {
        return pullTokenContractLayout(`0x${slotValue.substring(26)}`, provider);
      }
    }

    for (const func of analysisResult.functions || []) {
      if (func.selector !== '5c60da1b') continue;
      const implementationExtra = await provider.call({ to: address, data: '0x5c60da1b' });
      if (implementationExtra && implementationExtra.length === 66) {
        return pullTokenContractLayout(`0x${implementationExtra.substring(26)}`, provider);
      }
      throw new Error('Cannot resolve proxy implementation address');
    }

    const beaconAddress = await provider.getStorageAt(address, TEST_TOKEN_PROXY_BEACON_SLOT);
    if (beaconAddress && beaconAddress.length === 66 && !/^0x0+$/.test(beaconAddress)) {
      const implementationExtra = await provider.call({ to: `0x${beaconAddress.substring(26)}`, data: '0x5c60da1b' });
      if (implementationExtra && implementationExtra.length === 66) {
        return pullTokenContractLayout(`0x${implementationExtra.substring(26)}`, provider);
      }
      throw new Error('Cannot resolve beacon implementation address');
    }

    return analysisResult;
  }

  function extractTokenBalanceSlots(pullResult) {
    const storage = Array.isArray(pullResult?.storage) ? pullResult.storage : [];
    return storage
      .filter((item) => String(item?.type || '').startsWith('mapping') && !String(item?.type || '').includes('bool'))
      .filter((item) => Array.isArray(item?.reads) && Array.isArray(item?.writes))
      .filter((item) => item.reads.includes('70a08231') && item.writes.includes('23b872dd') && item.writes.includes('a9059cbb'));
  }

  async function tokenBalanceSlotHash(location, key) {
    return ethers.utils.keccak256(ethers.utils.solidityPack(['uint256', 'uint256'], [location, key]));
  }

  async function setTokenStorage(provider, addr, slot, value) {
    const paddedValue = ethers.utils.hexZeroPad(value, 32);
    try {
      await provider.send('hardhat_setStorageAt', [addr, toLegalSlot(slot), paddedValue]);
      return true;
    } catch (e) {
      try {
        await provider.send('anvil_setStorageAt', [addr, toLegalSlot(slot), paddedValue]);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  async function readTokenBalance(tokenAddress, userAddress, provider) {
    const response = await provider.call({
      to: tokenAddress,
      data: `0x70a08231${String(userAddress).replace(/^0x/, '').padStart(64, '0')}`
    });
    if (response && typeof response === 'string' && response !== '0x') {
      return ethers.BigNumber.from(response);
    }
    return ethers.constants.Zero;
  }

  async function overrideTokenBalanceViaLayout(tokenAddress, userAddress, amount, provider) {
    const pullResult = await detectAndPullTokenLayout(tokenAddress, provider);
    const candidateSlots = extractTokenBalanceSlots(pullResult);
    if (!candidateSlots.length) {
      throw new Error('Unable to locate a candidate balance mapping slot');
    }

    const previousBalance = await readTokenBalance(tokenAddress, userAddress, provider);
    if (previousBalance.eq(amount)) return true;

    for (const slotInfo of candidateSlots) {
      const storageSlot = await tokenBalanceSlotHash(ethers.utils.hexZeroPad(userAddress, 32), `0x${slotInfo.slot}`);
      const originalSlotValue = await provider.getStorageAt(tokenAddress, toLegalSlot(storageSlot));
      const patchedValue = ethers.BigNumber.from(originalSlotValue).shr(128).shl(128).or(amount);

      const success = await setTokenStorage(provider, tokenAddress, storageSlot, patchedValue.toHexString());
      if (!success) {
        throw new Error('Current RPC does not support hardhat/anvil setStorageAt');
      }

      const newBalance = await readTokenBalance(tokenAddress, userAddress, provider);
      if (newBalance.eq(amount)) {
        return true;
      }

      if (candidateSlots.length > 1) {
        await setTokenStorage(provider, tokenAddress, storageSlot, originalSlotValue);
      }
    }

    throw new Error('Tried every candidate slot but none changed the ERC20 balance');
  }

  async function overrideTokenBalanceViaProbe(tokenAddress, userAddress, amount, provider) {
    const amountHex = ethers.utils.hexZeroPad(amount.toHexString(), 32);

    for (let i = 0; i < 50; i++) {
      const slotIndex = ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 32);
      const key = ethers.utils.hexZeroPad(userAddress, 32);
      const probeSlot = ethers.utils.keccak256(ethers.utils.concat([key, slotIndex]));
      const previousValue = await provider.getStorageAt(tokenAddress, probeSlot);
      const success = await setTokenStorage(provider, tokenAddress, probeSlot, amountHex);
      if (!success) {
        throw new Error('Current RPC does not support hardhat/anvil setStorageAt');
      }
      const newBalance = await readTokenBalance(tokenAddress, userAddress, provider);
      if (newBalance.eq(amount)) {
        return true;
      }
      await setTokenStorage(provider, tokenAddress, probeSlot, previousValue);
    }

    throw new Error('Failed to detect token balance storage slot');
  }

  async function overrideTokenBalance(tokenAddress, userAddress, amount, provider) {
    try {
      return await overrideTokenBalanceViaLayout(tokenAddress, userAddress, amount, provider);
    } catch (layoutError) {
      console.warn('[testtoken] layout-based balance override failed; falling back to probe', layoutError);
      return overrideTokenBalanceViaProbe(tokenAddress, userAddress, amount, provider);
    }
  }

  async function mintAllViaLocalOverride(user) {
    const provider = COMMON.getRpcProvider();
    const targets = (lastTokenRows || []).filter((row) => row && ethers.utils.isAddress(row.address));
    if (!targets.length) {
      throw new Error('No token rows available for local mint override');
    }

    const failures = [];
    for (const row of targets) {
      try {
        const decimals = Number.isFinite(Number(row.decimals)) ? Number(row.decimals) : 18;
        const amount = ethers.utils.parseUnits(LOCAL_OVERRIDE_MINT_AMOUNT, decimals);
        await overrideTokenBalance(row.address, user, amount, provider);
      } catch (error) {
        failures.push(`${row.symbol || row.address}: ${error?.message || error}`);
      }
    }

    if (failures.length === targets.length) {
      throw new Error(failures.slice(0, 3).join(' | '));
    }
    if (failures.length > 0) {
      window.showToast?.(`Local mint override completed with partial failures (${targets.length - failures.length}/${targets.length})`);
      console.warn('[testtoken] local mint override partial failures', failures);
      return;
    }

    window.showToast?.('Local mint override completed');
  }

  async function handleMintAll() {
    const rpc = environment.getAllParams().rpc;
    const user = environment.getAllParams().user;
    if (!rpc || !user) {
      alert('Please set rpc and user in Environment page first');
      return;
    }
    if (!ethers.utils.isAddress(user)) {
      alert('Invalid user address');
      return;
    }

    const mintCapabilities = await getMintCapabilities();
    if (!mintCapabilities.canMint) {
      alert('Missing Test Token Factory and no supported local mint runtime detected');
      return;
    }

    const mintAllBtn = document.getElementById('btn-mint-all');
    const originalText = mintAllBtn ? mintAllBtn.textContent : 'Mint All';
    if (mintAllBtn) {
        mintAllBtn.disabled = true;
        mintAllBtn.textContent = 'Minting...';
    }

    try {
      const provider = COMMON.getRpcProvider();
      if (!environment.getAllParams().isProduction) {
          await COMMON.tryImpersonateAccount(provider, user).catch(()=>{});
      }

      if (mintCapabilities.prefersLocalOverrideMint) {
        await mintAllViaLocalOverride(user);
      } else if (mintCapabilities.hasFactory) {
        const signer = await COMMON.resolveSigner(user);
        if (!signer) {
          throw new Error(await COMMON.describeMissingSigner(user, { subject: 'User' }));
        }
        if (typeof stapleTestERC20FactoryAbi === 'undefined') {
          throw new Error('Missing stapleTestERC20FactoryAbi');
        }
        const factory = new ethers.Contract(mintCapabilities.factoryAddr, stapleTestERC20FactoryAbi, signer);
        const tx = await factory.batchMintFor(user);
        await tx.wait();
        window.showToast?.('Mint all tokens completed');
      } else {
        throw new Error('No supported mint path is available');
      }
    } catch (e) {
      console.error('[testtoken] mint all failed', e);
      alert('Mint failed: ' + (e?.error?.message || e?.data?.message || e?.message || e));
    } finally {
      if (mintAllBtn) {
          mintAllBtn.disabled = false;
          mintAllBtn.textContent = originalText;
      }
      await refreshEthBalance().catch(()=>{});
      await refreshTokenTable().catch(()=>{});
    }
  }

  function setUpdateButtonBusy(button, busy, text = 'Update') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.dataset.originalText || button.textContent || 'Update';
      button.disabled = true;
      button.textContent = text;
      return;
    }
    button.disabled = false;
    button.textContent = button.dataset.originalText || text;
  }

  // New: Update single token price
  async function updateSingleTokenPrice(token, priceStr, verifierAddr, verifierType, button) {
    const rpc = environment.getAllParams().rpc;
    const user = environment.getAllParams().user;
    const stapleVerifier = verifierAddr || environment.getAllParams().stapleVerifier;
    if (!rpc || !user) { alert('Missing rpc or user'); return; }
    if (!stapleVerifier || !ethers.utils.isAddress(stapleVerifier)) { alert('Invalid stapleVerifier address'); return; }
    if (!priceStr || !/^\d+(\.\d+)?$/.test(priceStr)) { alert('Invalid price format'); return; }
    if (!ethers.utils.isAddress(token)) { alert('Invalid token address'); return; }

    setUpdateButtonBusy(button, true, 'Updating...');

    try {
      if (verifierType === 'CHAINLINK_DATA_FEED_v1') {
          const signer = await COMMON.resolveSigner(user);
          if (!signer) { alert('Signer required for update'); return; }

          const aggregator = token;
          const contract = new ethers.Contract(aggregator, [
              'function updateAnswer(int256) external',
              'function decimals() view returns (uint8)'
          ], signer);

          let decimals = 18;
          try {
              if (window.RpcManager) {
                  decimals = await window.RpcManager.call(contract, 'decimals');
              } else {
                  decimals = await contract.decimals();
              }
          } catch(e) {
              console.warn('Failed to fetch decimals, defaulting to 18', e);
          }

          const price = ethers.utils.parseUnits(priceStr, decimals);
          const tx = await contract.updateAnswer(price);
          await tx.wait();
          alert('Chainlink Feed updated');
      } else {
          await window.contractActions.updateStapleTokenPrices(stapleVerifier, [token], [priceStr], user);
          alert('Price update complete. Verify again before expecting the latest price to be shown.');
      }
      await refreshTokenTable();
    } catch (e) {
      console.error('Update price failed', e);
      alert('Update price failed: ' + (e?.message || e));
    } finally {
      setUpdateButtonBusy(button, false, 'Update');
    }
  }

  // Event binding: Refresh button + Set ETH + Verify price
  function wire() {
    const setEthBtn = document.getElementById('btn-set-eth');
    const mintAllBtn = document.getElementById('btn-mint-all');
    const refreshBtn = document.getElementById('btn-refresh');
    const verifyBtn = document.getElementById('btn-verify');
    if (setEthBtn) setEthBtn.addEventListener('click', handleSetEth);
    if (mintAllBtn) mintAllBtn.addEventListener('click', handleMintAll);
    if (refreshBtn) refreshBtn.addEventListener('click', COMMON.debounce(async () => {
      await refreshEthBalance();
      await refreshTokenTable();
    }, 300));
    if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
    // New: Event delegation for update price button
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-update-price');
      if (btn) {
        if (btn.disabled) return;
        const token = btn.getAttribute('data-token');
        const verifierAddr = btn.getAttribute('data-verifier');
        const verifierType = btn.getAttribute('data-verifier-type');
        const wrapper = btn.parentElement;
        const input = wrapper.querySelector('.tt-price-input');
        const val = (input?.value || '').trim();
        updateSingleTokenPrice(token, val, verifierAddr, verifierType, btn);
        return;
      }
      
    });

    // Event Delegation for Copy Address
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-copy-address');
      if (btn) {
          const addr = btn.dataset.address;
          if (addr) {
              navigator.clipboard.writeText(addr).then(() => {
                  const original = btn.innerHTML;
                  btn.innerHTML = '✅';
                  setTimeout(() => btn.innerHTML = original, 1000);
              }).catch(err => console.error('Failed to copy:', err));
          }
      }
    });
  }

  // Page load: Auto execute first refresh
  document.addEventListener('DOMContentLoaded', async () => {
    wire();
    syncTestTokenFactoryActions(await getMintCapabilities());
    await refreshEthBalance();
    await refreshTokenTable();
  });
})();
