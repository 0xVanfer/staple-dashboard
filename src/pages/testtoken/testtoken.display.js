// Early execution flag: ensure script is loaded correctly
try {
  window.__TT_JS_LOADED = true;
} catch (e) {}

// Dependencies: src/lib/common.js, src/pages/environment/environment.js
(function () {
  // ===== Basic logging utility =====
  const COMMON = window.stapleCommon;
  let lastTokenRows = [];

  // ===== Refresh state management (avoid race conditions) =====
  let refreshEpoch = 0; // Increment on each refresh to discard stale renders
  const setRefreshing = (is) => {
    const btn = document.getElementById('btn-refresh');
    if (btn) btn.disabled = !!is;
  };
  const setTableLoading = (msg = 'Loading...') => {
    const root = document.getElementById('tokens-tbody');
    if (root) root.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#666;">${msg}</td></tr>`;
  };

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

  // Main refresh: get supported tokens -> deduplicate -> concurrent read metadata / balance / price
  async function refreshTokenTable() {
    const rpc = environment.getAllParams().rpc;
    const user = environment.getAllParams().user;
    if (!rpc || !user) {
      console.warn('missing rpc or user');
      renderTokenTable([]);
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
    const isProd = !!environment.getAllParams().isProduction;
    if (!rpc || !user) {
      alert('Please set rpc and user in Environment page first');
      return;
    }
    if (isProd) {
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
      throw new Error(`Transaction blocked: Production environment requires a connected browser wallet for ${user}`);
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

    const signer = await COMMON.resolveSigner(user);
    if (!signer) {
        alert(`Transaction blocked: Production environment requires a connected browser wallet for ${user}`);
        return;
    }

    const factoryAddr = environment.getAllParams().testERC20Factory;
    if (!factoryAddr || !ethers.utils.isAddress(factoryAddr)) {
      alert('Missing or invalid Test Token Factory address (testTokenFactory / testErc20Factory)');
      return;
    }
    if (typeof stapleTestERC20FactoryAbi === 'undefined') {
      alert('Missing stapleTestERC20FactoryAbi');
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

      const factory = new ethers.Contract(factoryAddr, stapleTestERC20FactoryAbi, signer);
      const tx = await factory.batchMintFor(user);
      const receipt = await tx.wait();
      window.showToast?.('Mint all tokens completed');
    } catch (e) {
      console.error('[testtoken] batchMintFor failed', e);
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
    await refreshEthBalance();
    await refreshTokenTable();
  });
})();
