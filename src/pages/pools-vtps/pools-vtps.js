/**
 * Pools & Vtps Page Logic
 * Integrates pools / vtps / positions functionality, new page structure
 */
// Dependencies: src/lib/common.js, src/lib/contractCalls.js, src/pages/environment/environment.js
(async function () {
  const env = window.environment;
  const COMMON = window.stapleCommon || {};

  // Wait for dependencies to load
  await new Promise(resolve => {
    const check = setInterval(() => {
      if (window.contractData && window.environment && window.stapleCommon && window.contracts) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });

  // ========== State Management ==========
  const state = {
    selectedItem: null, // selected pool object
    selectedItemId: null, // persist selected ID for manual refresh
    pools: [],
    userPoolsInfo: null, // cache for userAllPoolsInfo
    searchQuery: '',
    showingForm: null, // 'createPool', 'createVtp', 'modifyRisk', or null
    isLoading: false,
  };

  // ========== Helper Functions ==========
  
  function getEnvSymbols() {
    try {
      if (env && typeof env.getSymbols === 'function') return env.getSymbols();
      if (window.environment && typeof window.environment.getSymbols === 'function') return window.environment.getSymbols();
    } catch (e) {
      console.warn('[pools-vtps] getSymbols failed', e);
    }
    return {};
  }

  function _truncateAddr(addr) {
    if (window.stapleCommon?.shortenAddress) return window.stapleCommon.shortenAddress(addr, 4, 4);
    if (typeof addr !== 'string') return '';
    return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  }

  async function getSymbol(addr) {
    if (!addr) return '';
    const symbols = getEnvSymbols();
    const lower = addr.toLowerCase();
    const sym = symbols[lower] || symbols[addr] || '';
    return sym || _truncateAddr(addr);
  }

  function formatPercent(value, divisor = 10000) {
    const num = Number(value) || 0;
    return ((num / divisor) * 100).toFixed(2) + '%';
  }

  function clearElement(el) {
    if (el) el.innerHTML = '';
  }

  function setGlobalLoading(isLoading, text = 'Loading...') {
    state.isLoading = isLoading;
    if (!isLoading) return;
    const msg = `<div class="empty-state"><div>${text}</div></div>`;
    ['filter-list', 'details-content', 'related-content', 'actions-content'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = msg;
    });
  }
  
  async function copyToClipboard(text, buttonElement) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      
      // Visual feedback: turn button green
      if (buttonElement) {
        const originalText = buttonElement.textContent;
        buttonElement.textContent = 'Copied!';
        buttonElement.classList.add('copied');
        setTimeout(() => {
          buttonElement.textContent = originalText;
          buttonElement.classList.remove('copied');
        }, 1500);
      }
    } catch (e) {
      console.error('Copy failed:', e);
      if (buttonElement) {
        buttonElement.textContent = 'Failed';
        setTimeout(() => {
          buttonElement.textContent = 'Copy';
        }, 1500);
      }
    }
  }

  async function waitForPools(timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        // Use getPools which now strictly returns cache if available
        const pools = await window.contractData.getPools();
        if (Array.isArray(pools) && pools.length > 0) return pools;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 300));
    }
    return [];
  }

  // ========== Data Loading ==========
  
  /**
   * Load data from the blockchain.
   * Fetches pools using `waitForPools` and user pool info using `getUiPoolDataProvider`.
   * Updates the `state` object with the fetched data.
   */
  async function loadData() {
    try {
      // Force update pools on initial load or explicit refresh
      // But waitForPools uses getPools which is cache-first.
      // We should call updatePools explicitly if we want to refresh.
      // However, contractCalls.js logic for getPools will trigger update if cache is empty.
      // So for initial load, getPools is fine.
      // For manual refresh, we need a way to force update.
      
      state.pools = await waitForPools();
      
      // Load user pools info
      try {
        const ui = await window.contracts.getUiPoolDataProvider();
        const userAddr = env.getAllParams().user;
        if (ui && userAddr) {
          if (window.RpcManager) {
              state.userPoolsInfo = await window.RpcManager.call(ui, 'userAllPoolsInfo', [userAddr]);
          } else {
              throw new Error('RpcManager required');
          }
        }
      } catch (e) {
        console.error('[Pools & Vtps] Failed to load user pools info:', e);
      }
      
    } catch (e) {
      console.error('[Pools & Vtps] Failed to load data:', e);
    }
  }
  
  /**
   * Refresh the data and re-render the UI.
   * @param {boolean} preserveSelection - Whether to keep the currently selected item.
   */
  async function refreshData(preserveSelection = true) {
    const currentId = preserveSelection ? state.selectedItemId : null;
    setGlobalLoading(true, 'Refreshing pools...');
    
    // Clear cached extra data to ensure fresh fetch
    state.selectedPoolExtraData = null;
    
    // Explicitly update pools cache on manual refresh
    try {
        if (window.PoolDataManager && window.PoolDataManager.updatePools) {
            await window.PoolDataManager.updatePools();
        }
    } catch (e) {
        console.warn('Failed to force update pools:', e);
    }

    await loadData();
    
    if (currentId !== null) {
      state.selectedItemId = currentId;
      // Re-select item and fetch extra data
      const found = state.pools.find(p => String(p?.params?.id) === String(currentId));
      if (found) {
          state.selectedItem = found;
          await fetchPoolExtraData(found);
      }
    }
    
    await renderFilterList();
    await renderDetails();
    await renderRelated();
    await renderActions();
    state.isLoading = false;
  }

  // ========== Filter Panel Rendering ==========
  
  /**
   * Render the filter list (left sidebar).
   * Filters pools based on the search query and renders them as list items.
   * Handles selection logic.
   */
  async function renderFilterList() {
    const filterList = document.getElementById('filter-list');
    clearElement(filterList);

    const items = state.pools;
    const query = state.searchQuery.toLowerCase();

    const filteredItems = [];

    // Batch fetch symbols from environment cache (no contract calls)
    const assets = items.map(item => item?.params?.asset).filter(a => a);
    const uniqueAssets = [...new Set(assets)];
    const symbolCache = getEnvSymbols();
    const symbolMap = {};

    uniqueAssets.forEach(addr => {
      const lower = addr.toLowerCase();
      const sym = symbolCache[lower] || symbolCache[addr] || '';
      symbolMap[addr] = sym || _truncateAddr(addr);
    });

    for (const item of items) {
      const poolId = String(item?.params?.id ?? '');
      const asset = item?.params?.asset;
      const symbol = symbolMap[asset] || await getSymbol(asset);
      
      if (query && !symbol.toLowerCase().includes(query) && !poolId.includes(query)) {
        continue;
      }

      filteredItems.push({
        id: poolId,
        title: `${symbol || 'Unknown'}`,
        subtitle: `poolID = ${poolId}`,
        data: item,
      });
    }

    filteredItems.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));

    if (filteredItems.length === 0) {
      filterList.innerHTML = '<div class="empty-state"><div>No pools found</div></div>';
      state.selectedItem = null;
      state.selectedItemId = null;
      return;
    }

    // Auto-select: if selectedItemId is set (manual refresh), find and select it; otherwise select first
    let shouldAutoSelect = false;
    
    if (state.selectedItemId !== null) {
      const found = filteredItems.find(item => String(item.data?.params?.id) === String(state.selectedItemId));
      if (found) {
        state.selectedItem = found.data;
      } else {
        shouldAutoSelect = true;
      }
    } else if (!state.selectedItem) {
      shouldAutoSelect = true;
    }
    
    // Only fetch extra data if auto-selecting a new item (don't clear if already fetched)
    if (shouldAutoSelect && filteredItems.length > 0) {
      state.selectedItem = filteredItems[0].data;
      state.selectedItemId = String(filteredItems[0].data?.params?.id);
      // Clear and fetch extra data for newly auto-selected item
      state.selectedPoolExtraData = null;
      await fetchPoolExtraData(state.selectedItem);
    }

    for (const item of filteredItems) {
      const div = document.createElement('div');
      div.className = 'filter-item';
      if (String(state.selectedItem?.params?.id) === String(item.data?.params?.id)) {
        div.classList.add('active');
      }
      
      div.innerHTML = `
        <div class="filter-item-title">${item.title}</div>
        <div class="filter-item-subtitle">${item.subtitle}</div>
      `;
      
      div.addEventListener('click', async () => {
        // Show loading state if needed, or just wait
        state.selectedItem = item.data;
        state.selectedItemId = String(item.data?.params?.id);
        
        // Fetch extra data before rendering details
        await fetchPoolExtraData(state.selectedItem);
        
        renderFilterList();
        renderDetails();
        renderRelated();
        renderActions();
      });
      
      filterList.appendChild(div);
    }
  }
  
  /**
   * Fetch extra data for the selected pool in a single multicall.
   * This includes pool status (paused, type, supply) and VTP user allocations.
    * Note: metadata relies on environment cache; no direct symbol()/decimals() calls here.
   */
  async function fetchPoolExtraData(pool) {
      if (!pool) {
          state.selectedPoolExtraData = null;
          return;
      }
      
      
      try {
          const poolAddr = pool.params.lpAddr;
          const poolId = pool.params.id;
          const userAddr = env.getAllParams().user;
          const controllerAddr = env.getAllParams().controller;
          
          // Prepare calls
          const calls = [];
          
          // 1. Pool Type
          calls.push({
              target: poolAddr,
              abi: ['function poolType() view returns (string)'],
              method: 'poolType',
              args: [],
              key: 'poolType',
              allowFailure: true
          });
          
          // 2. Total Supply
          calls.push({
              target: poolAddr,
              abi: ['function totalSupply() view returns (uint256)'],
              method: 'totalSupply',
              args: [],
              key: 'totalSupply',
              allowFailure: true
          });
          
          // 3. LP Price (convertToAssets)
          calls.push({
              target: poolAddr,
              abi: ['function convertToAssets(uint256) view returns (uint256)'],
              method: 'convertToAssets',
              args: [ethers.utils.parseUnits('1', 18)],
              key: 'lpPrice',
              allowFailure: true
          });
          
          // 4. Paused
          calls.push({
              target: poolAddr,
              abi: ['function paused() view returns (bool)'],
              method: 'paused',
              args: [],
              key: 'paused',
              allowFailure: true
          });
          
          // 5. User Max Allocation for each VTP
          const vtps = pool.relatedVtps || [];
          const vtpIds = [];
          
          if (userAddr && controllerAddr) {
              vtps.forEach(vtp => {
                  if (!vtp || !vtp.params) return;
                  const vtpId = vtp.params.id;
                  vtpIds.push(vtpId);
                  calls.push({
                      target: controllerAddr,
                      abi: ['function userMaxAllocation(address,uint16,uint32) view returns (uint256)'],
                      method: 'userMaxAllocation',
                      args: [userAddr, poolId, vtpId],
                      key: `maxAlloc_${vtpId}`,
                      allowFailure: true
                  });
              });
          }
          
            // Execute Multicall
          if (!window.RpcManager) throw new Error('RpcManager missing');
          
          // RpcManager.multicall expects {target, abi, method, params/args, allowFailure}
          // We need to map our custom 'key' out first or handle it after
          
          const results = await window.RpcManager.multicall(calls.map(c => ({
              target: c.target,
              abi: c.abi,
              method: c.method,
              params: c.args, // RpcManager uses 'params' for ABI format
              allowFailure: c.allowFailure
          })));
          
          // Process results
          const data = {
              poolType: null,
              totalSupply: null,
              lpPrice: null,
              paused: null,
              userMaxAllocations: {},
              symbols: {}
          };
          
          results.forEach((res, i) => {
              const key = calls[i].key;
              if (res === null) return; // Failed call
              
              if (key === 'poolType') data.poolType = res;
              else if (key === 'totalSupply') data.totalSupply = res;
              else if (key === 'lpPrice') data.lpPrice = res;
              else if (key === 'paused') {
                  // Ensure paused is a boolean (multicall may return various truthy/falsy values)
                  data.paused = Boolean(res);
              }
              else if (key.startsWith('maxAlloc_')) {
                  const vtpId = key.split('_')[1];
                  data.userMaxAllocations[vtpId] = res;
              }
          });

              // Populate symbols from environment cache (no direct contract calls)
              try {
                const envSymbols = (window.environment && window.environment.getSymbols && window.environment.getSymbols()) || {};
                const tokenAddrs = new Set();
                vtps.forEach(vtp => {
                  if (!vtp) return;
                  if (vtp.token0?.params?.asset) tokenAddrs.add(vtp.token0.params.asset.toLowerCase());
                  if (vtp.token1?.params?.asset) tokenAddrs.add(vtp.token1.params.asset.toLowerCase());
                });
                  tokenAddrs.forEach(addr => {
                    const sym = envSymbols[addr] || envSymbols[addr.toLowerCase()];
                    if (sym) {
                      data.symbols[addr] = sym;
                      data.symbols[addr.toLowerCase()] = sym;
                    }
                  });
              } catch (symErr) {
                console.warn('Symbol cache unavailable from environment', symErr);
              }
          
          state.selectedPoolExtraData = data;
          
      } catch (e) {
          console.error('[Pools] Failed to fetch extra data:', e);
          state.selectedPoolExtraData = null;
      }
  }

  // ========== Create Pool, Create VTP, Modify Risk Forms ==========
  
  /**
   * Show the form to create a new pool.
   * Fetches supported tokens and renders the form.
   * Handles the creation transaction.
   */
  async function showCreatePoolForm() {
    state.showingForm = 'createPool';
    const detailContent = document.getElementById('detail-content');
    clearElement(detailContent);
    
    const poolImpl = env?.getAllParams().poolImpl;
    
    let tokens = [];
    try {
      tokens = await window.contractData.getSupportedTokens();
    } catch (e) {
      console.error('[Create Pool] Failed to get supported tokens:', e);
    }
    tokens = Array.isArray(tokens) ? tokens.filter(t => COMMON.isAddress(t)) : [];
    
    // Deduplicate
    const seen = new Set();
    tokens = tokens.filter(t => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    
    // Get symbols using environment cache only
    const symbolCache = getEnvSymbols();
    const pairs = tokens.map(addr => {
      const lower = addr.toLowerCase();
      const sym = symbolCache[lower] || symbolCache[addr] || '';
      return { addr, sym: sym || _truncateAddr(addr) };
    });
    
    
    const tokenOptionsHtml = pairs.length
      ? pairs.map(p => {
          const label = p.sym ? `${p.sym} (${_truncateAddr(p.addr)})` : p.addr;
          return `<option value="${p.addr}">${label}</option>`;
        }).join('')
      : `<option value="">No Supported Token</option>`;
    
    // Fetch risk levels count from creditList
    let riskLevelCount = 10; // default fallback
    try {
      const ctl = await window.contracts.getController();
      if (ctl) {
        const res = await ctl.getCreditsInfo();
        const creditList = Array.from(res?.creditList ?? res?.[1] ?? []);
        riskLevelCount = creditList.length > 0 ? creditList.length : 1;
      }
    } catch (e) {
      console.warn('[Create Pool] Failed to get credits info, using default risk levels:', e);
    }
    
    // Generate risk level options dynamically (1 to n)
    const riskOptionsHtml = Array.from({ length: riskLevelCount }, (_, i) => 
      `<option value="${i + 1}">${i + 1}</option>`
    ).join('');

    const formHtml = `
      <div class="create-form-panel">
        <h3>Create Pool</h3>
        <div class="form-row">
          <div class="small" style="color:#6b7280; line-height:1.4;">
            Only existing test tokens (supportedTokens) can be selected.<br/>
            If the list is empty or missing the target token, please deploy a test token on the Test Token page first, then return here to create a pool.
          </div>
          <label>Token</label>
          <select id="cp-token" ${pairs.length === 0 ? 'disabled' : ''}>
            ${tokenOptionsHtml}
          </select>
        </div>
        <div class="form-row">
          <label>Risk Level</label>
          <select id="cp-risk">
            ${riskOptionsHtml}
          </select>
        </div>
        <div class="form-row readonly">
          <label>Pool Impl</label>
          <div class="mono small" title="${poolImpl || ''}">${poolImpl || 'N/A'}</div>
        </div>
        <div class="form-actions">
          <button id="cp-action" ${pairs.length === 0 ? 'disabled' : ''}>Create Pool</button>
          <button id="cp-cancel" class="secondary">Cancel</button>
        </div>
        <div id="cp-status" class="form-status mono small">${pairs.length === 0 ? 'No available Token' : ''}</div>
      </div>
    `;
    
    detailContent.innerHTML = formHtml;
    
    // Bind events
    const actionBtn = document.getElementById('cp-action');
    const cancelBtn = document.getElementById('cp-cancel');
    const statusEl = document.getElementById('cp-status');
    
    function setStatus(msg, isErr) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.style.color = isErr ? '#b91c1c' : '#374151';
    }
    
    async function handleCreate() {
      if (!actionBtn || actionBtn.disabled) return;

      const token = (document.getElementById('cp-token')?.value || '').trim();
      const risk = parseInt(document.getElementById('cp-risk').value, 10);
      const poolImpl = env?.getAllParams().poolImpl;
      
      if (!COMMON.isAddress(token)) { setStatus('Please select a valid Token', true); return; }
      if (!COMMON.isAddress(poolImpl)) { setStatus('poolImpl missing or invalid', true); return; }
      
      const originalText = actionBtn.textContent;
      actionBtn.disabled = true;
      actionBtn.textContent = 'Creating...';
      setStatus('Sending transaction...');
      try {
        const adminSigner = await COMMON.resolveSigner('', {
          contractAddress: env?.getAllParams().controller,
          requireAdmin: true
        });
        if (!adminSigner) throw new Error('No admin signer available for controller');
        const ctl = await window.contracts.getController(adminSigner);
        if (!ctl) throw new Error('controller not found');
        actionBtn.textContent = 'Sending Tx...';
        const tx = await ctl.createPool(risk, poolImpl, token);
        actionBtn.textContent = 'Confirming...';
        setStatus(`Waiting for confirmation: ${tx.hash}`);
        await tx.wait();
        COMMON.showToast('Created successfully');
        setStatus('Created successfully, refresh to view');
        await refreshData();
        state.showingForm = null;
        await renderDetails();
      } catch (e) {
        console.error(e);
        setStatus(`Failed: ${e.message || e}`, true);
      } finally {
        actionBtn.disabled = false;
        actionBtn.textContent = originalText;
      }
    }
    
    if (actionBtn) actionBtn.addEventListener('click', handleCreate);
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      state.showingForm = null;
      renderDetails();
    });
  }
  
  /**
   * Show the form to create a new VTP (Virtual Token Pair).
   * Renders the form with inputs for VTP parameters (n, p, fees, etc.).
   * Handles the creation transaction.
   */
  async function showCreateVtpForm() {
    state.showingForm = 'createVtp';
    const detailContent = document.getElementById('detail-content');
    clearElement(detailContent);
    
    const pools = state.pools || [];
    
    async function poolOption(p) {
      const sym = await getSymbol(p?.params?.asset);
      return `<option value="${p?.params?.id}">${p?.params?.id} (${sym || _truncateAddr(p?.params?.asset || '')})</option>`;
    }
    
    const opts = await Promise.all(pools.map(poolOption));
    
    function percentToScaled(pct, scale) {
      const n = Number(pct);
      if (!isFinite(n) || n < 0) return 0;
      return Math.round(n / 100 * scale);
    }

    const formHtml = `
      <div class="create-form-panel create-vtp-panel">
        <h3>Create VTP</h3>
        <div class="create-vtp-top">
          <div class="form-row">
            <label>n</label>
            <input id="vtp-n" type="number" value="10" placeholder="10" />
          </div>
          <div class="form-row">
            <label>p (%)</label>
            <input id="vtp-p" type="number" value="12" placeholder="12 (percentage)" />
          </div>
        </div>
        <div class="create-vtp-vertical">
          <div class="vtp-form-section">
            <div class="vtp-form-section-title">Token A Params</div>
            <div class="vtp-form-row-full"><span class="lbl">Pool</span>
              <select id="vtp-poolA">${opts.join('')}</select>
            </div>
            <div class="vtp-form-row-full"><span class="lbl">feeIn %</span><input id="vtp-feeInA" type="number" step="0.0001" value="0" /></div>
            <div class="vtp-form-row-full"><span class="lbl">feeOut %</span><input id="vtp-feeOutA" type="number" step="0.0001" value="0.01" /></div>
            <div class="vtp-form-row-full"><span class="lbl">protocolFee %</span><input id="vtp-protocolFeeA" type="number" step="0.01" value="10" /></div>
            <div class="vtp-form-row-full"><span class="lbl">maxAllocate %</span><input id="vtp-maxAllocA" type="number" step="0.01" value="92" /></div>
            <div class="vtp-form-row-full"><span class="lbl">alrLowerBound %</span><input id="vtp-alrLowerA" type="number" step="0.01" value="88" /></div>
          </div>
          <div class="vtp-form-section">
            <div class="vtp-form-section-title">Token B Params</div>
            <div class="vtp-form-row-full"><span class="lbl">Pool</span>
              <select id="vtp-poolB">${opts.join('')}</select>
            </div>
            <div class="vtp-form-row-full"><span class="lbl">feeIn %</span><input id="vtp-feeInB" type="number" step="0.0001" value="0" /></div>
            <div class="vtp-form-row-full"><span class="lbl">feeOut %</span><input id="vtp-feeOutB" type="number" step="0.0001" value="0.01" /></div>
            <div class="vtp-form-row-full"><span class="lbl">protocolFee %</span><input id="vtp-protocolFeeB" type="number" step="0.01" value="10" /></div>
            <div class="vtp-form-row-full"><span class="lbl">maxAllocate %</span><input id="vtp-maxAllocB" type="number" step="0.01" value="92" /></div>
            <div class="vtp-form-row-full"><span class="lbl">alrLowerBound %</span><input id="vtp-alrLowerB" type="number" step="0.01" value="88" /></div>
          </div>
        </div>
        <div class="form-actions">
          <button id="vtp-action">Create</button>
          <button id="vtp-cancel" class="secondary" type="button">Cancel</button>
        </div>
        <div id="vtp-status" class="form-status mono small"></div>
        <div class="mono small tips-inline">
          p input percentage (e.g. 12 => 12%), internal param p = input * 100 (12 -> 1200).<br/>
          feeIn/feeOut use 1e6 scale; protocolFee / maxAllocate / alrLower use 1e4 scale; Example: 0.01% => 0.01 -> 100
        </div>
      </div>
    `;
    
    detailContent.innerHTML = formHtml;
    
    // Bind events
    const actionBtn = document.getElementById('vtp-action');
    const cancelBtn = document.getElementById('vtp-cancel');
    const statusEl = document.getElementById('vtp-status');
    
    function setStatus(msg, isErr) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.style.color = isErr ? '#b91c1c' : '#374151';
    }
    
    async function poolById(id) {
      return pools.find(p => String(p?.params?.id) === String(id));
    }
    
    async function handleCreate() {
      if (!actionBtn) return;
      
      const originalText = actionBtn ? actionBtn.textContent : 'Create VTP';
      
      try {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Validating...';
        setStatus('Validating...');
        const n = Number(document.getElementById('vtp-n').value || '0');
        const pPercent = Number(document.getElementById('vtp-p').value || '0');
        const pScaled = Math.round(pPercent * 100);
        const poolAId = document.getElementById('vtp-poolA').value;
        const poolBId = document.getElementById('vtp-poolB').value;
        if (poolAId === poolBId) { setStatus('Pool A/B are the same', true); actionBtn.disabled = false; actionBtn.textContent = originalText; return; }
        const poolA = await poolById(poolAId);
        const poolB = await poolById(poolBId);
        if (!poolA || !poolB) { setStatus('Selected Pool not found', true); actionBtn.disabled = false; actionBtn.textContent = originalText; return; }
        
        const feeInAS = percentToScaled(document.getElementById('vtp-feeInA').value || '0', 1e6);
        const feeInBS = percentToScaled(document.getElementById('vtp-feeInB').value || '0', 1e6);
        const feeOutAS = percentToScaled(document.getElementById('vtp-feeOutA').value || '0', 1e6);
        const feeOutBS = percentToScaled(document.getElementById('vtp-feeOutB').value || '0', 1e6);
        const protoAS = percentToScaled(document.getElementById('vtp-protocolFeeA').value || '10', 1e4);
        const protoBS = percentToScaled(document.getElementById('vtp-protocolFeeB').value || '10', 1e4);
        const maxAllocAS = percentToScaled(document.getElementById('vtp-maxAllocA').value || '92', 1e4);
        const maxAllocBS = percentToScaled(document.getElementById('vtp-maxAllocB').value || '92', 1e4);
        const alrLowerAS = percentToScaled(document.getElementById('vtp-alrLowerA').value || '88', 1e4);
        const alrLowerBS = percentToScaled(document.getElementById('vtp-alrLowerB').value || '88', 1e4);
        
        const aInput = [poolA.params.id, feeInAS, feeOutAS, protoAS, maxAllocAS, alrLowerAS];
        const bInput = [poolB.params.id, feeInBS, feeOutBS, protoBS, maxAllocBS, alrLowerBS];
        const vtpInput = [n, pScaled, aInput, bInput];
        
        const adminSigner = await COMMON.resolveSigner('', {
          contractAddress: env?.getAllParams().controller,
          requireAdmin: true
        });
        if (!adminSigner) throw new Error('No admin signer available for controller');
        const ctl = await window.contracts.getController(adminSigner);
        if (!ctl) throw new Error('controller not configured');
        
        actionBtn.textContent = 'Sending Tx...';
        setStatus('Sending transaction...');
        const tx = await ctl.createVtp(vtpInput);
        actionBtn.textContent = 'Confirming...';
        setStatus(`Waiting for confirmation: ${tx.hash}`);
        await tx.wait();
        COMMON.showToast?.('Created successfully');
        setStatus('Refreshing data...');
        await refreshData();
        state.showingForm = null;
        await renderDetails();
      } catch (e) {
        console.error('[createVtp] error', e);
        setStatus(e?.message || 'Creation failed', true);
      } finally {
        actionBtn && (actionBtn.disabled = false);
        actionBtn && (actionBtn.textContent = originalText);
      }
    }
    
    if (actionBtn) actionBtn.addEventListener('click', handleCreate);
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      state.showingForm = null;
      renderDetails();
    });
  }
  
  /**
   * Show the form to modify risk parameters (credits).
   * Fetches current risk info and renders the form.
   * Handles the update transaction.
   */
  async function showModifyRiskForm() {
    state.showingForm = 'modifyRisk';
    const detailContent = document.getElementById('detail-content');
    clearElement(detailContent);
    
    detailContent.innerHTML = '<div class="mono small">Loading credits...</div>';
    
    // Fetch current credits
    let totalLimit = 0;
    let creditList = [];
    try {
      const ctl = await window.contracts.getController();
      if (!ctl) throw new Error('controller not found');
      const res = await ctl.getCreditsInfo();
      totalLimit = Number(res?.totalLimit ?? res?.[0] ?? 0);
      creditList = Array.from(res?.creditList ?? res?.[1] ?? []).map(v => Number(v));
    } catch (e) {
      console.error('[credits] Fetch failed', e);
    }
    
    const formHtml = `
      <div class="create-form-panel">
        <h3>Modify Risk Info</h3>
        <div class="form-row">
          <label>Total Limit (uint32)</label>
          <input id="cr-totalLimit" type="number" min="0" value="${totalLimit}"/>
        </div>
        <div class="form-row">
          <label>Credits (uint32[])</label>
          <div id="cr-list" class="cr-list"></div>
          <div class="mono small" style="margin-top:4px;color:#6b7280;">Can add/remove; submits updateRiskInfo in current order on save.</div>
        </div>
        <div class="form-actions">
          <button id="cr-add" type="button">Add Credit</button>
          <button id="cr-save" type="button">Save</button>
          <button id="cr-cancel" type="button" class="secondary">Cancel</button>
        </div>
        <div id="cr-status" class="form-status mono small"></div>
      </div>
    `;
    
    detailContent.innerHTML = formHtml;
    
    const listEl = document.getElementById('cr-list');
    
    function buildCreditRow(val) {
      const row = document.createElement('div');
      row.className = 'cr-row';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'cr-item';
      inp.value = String(val ?? 0);
      inp.min = '0';
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'cr-remove';
      rm.textContent = '×';
      rm.addEventListener('click', () => row.remove());
      row.append(inp, rm);
      return row;
    }
    
    creditList.forEach(v => listEl.appendChild(buildCreditRow(v)));
    
    const addBtn = document.getElementById('cr-add');
    const saveBtn = document.getElementById('cr-save');
    const cancelBtn = document.getElementById('cr-cancel');
    const statusEl = document.getElementById('cr-status');
    
    function setStatus(msg, isErr) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.style.color = isErr ? '#b91c1c' : '#374151';
    }
    
    if (addBtn) addBtn.addEventListener('click', () => {
      listEl.appendChild(buildCreditRow(0));
    });
    
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      state.showingForm = null;
      renderDetails();
    });
    
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const adminSigner = await COMMON.resolveSigner('', {
        contractAddress: env?.getAllParams().controller,
        requireAdmin: true
      });
      const ctl = await window.contracts.getController(adminSigner);
      if (!ctl) { setStatus('controller not found', true); return; }
      const originalText = saveBtn.textContent;
      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Validating...';
        setStatus('Validating...');
        const tlVal = Number(document.getElementById('cr-totalLimit').value);
        if (!Number.isInteger(tlVal) || tlVal < 0) { 
          setStatus('Total Limit invalid', true); 
          saveBtn.disabled = false; 
          saveBtn.textContent = originalText;
          return; 
        }
        const credits = Array.from(listEl.querySelectorAll('.cr-item'))
          .map(inp => Number(inp.value))
          .filter(v => Number.isInteger(v) && v >= 0);
        if (!credits.length) { 
          setStatus('Keep at least one credit', true); 
          saveBtn.disabled = false; 
          saveBtn.textContent = originalText;
          return; 
        }
        saveBtn.textContent = 'Sending Tx...';
        setStatus('Sending transaction...');
        const tx = await ctl.updateRiskInfo(tlVal, credits);
        saveBtn.textContent = 'Confirming...';
        setStatus(`Waiting for confirmation: ${tx.hash}`);
        await tx.wait();
        COMMON.showToast?.('Update successful');
        setStatus('Updated');
        await refreshData();
        // Re-show form with updated data
        await showModifyRiskForm();
      } catch (err) {
        console.error('[credits] Save failed', err);
        setStatus(err?.message || 'Save failed', true);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    });
  }

  // ========== Detail Section Rendering ==========
  
  /**
   * Render the details section (main content area).
   * Decides whether to show a form or the details of the selected pool.
   */
  async function renderDetails() {
    const detailContent = document.getElementById('detail-content');
    clearElement(detailContent);

    // If showing a form, don't render normal details
    if (state.showingForm === 'createPool') {
      await showCreatePoolForm();
      return;
    } else if (state.showingForm === 'createVtp') {
      await showCreateVtpForm();
      return;
    } else if (state.showingForm === 'modifyRisk') {
      await showModifyRiskForm();
      return;
    }

    if (!state.selectedItem) {
      detailContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div>Select a pool to view details</div></div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'detail-grid';

    await renderPoolDetails(grid, state.selectedItem);

    detailContent.appendChild(grid);
  }

  /**
   * Render the details of a specific pool.
   * Displays basic info, status, and user allocation info.
   * @param {HTMLElement} grid - The container element.
   * @param {Object} pool - The pool object.
   */
  async function renderPoolDetails(grid, pool) {
    const params = pool?.params || {};
    const status = pool?.status || {};
    
    const poolId = params.id;
    const decimals = Number(params.decimals) || 0;
    const riskLevel = params.riskLevel;
    const asset = params.asset;
    const lpAddr = params.lpAddr;
    
    const symbol = await getSymbol(asset);
    const lpSymbol = await getSymbol(lpAddr);
    
    // ERC20 / ERC4626 Basic Info
    addDetailRow(grid, '=== Pool Basic Info ===', '', true);
    addDetailRow(grid, 'Pool ID', poolId);
    
    // Asset with copy button
    addDetailRowWithCopy(grid, 'Asset', asset, symbol);
    
    // LP Token with copy button
    addDetailRowWithCopy(grid, 'LP Token', lpAddr, lpSymbol);
    
    addDetailRow(grid, 'Decimals', decimals);
    addDetailRow(grid, 'Risk Level', riskLevel);
    
    // Read poolType from extra data
    const extra = state.selectedPoolExtraData || {};
    if (extra.poolType) {
        addDetailRow(grid, 'Pool Type', extra.poolType);
    }
    
    addDetailRow(grid, '=== Pool Status ===', '', true);
    
    addDetailRow(grid, 'Assets', COMMON.fromBigNumber(status.assets, decimals));
    addDetailRow(grid, 'Liability', COMMON.fromBigNumber(status.liability, decimals));
    
    // Read total supply from extra data
    if (extra.totalSupply) {
        addDetailRow(grid, 'Total Supply', COMMON.fromBigNumber(extra.totalSupply, decimals));
    } else {
        addDetailRow(grid, 'Total Supply', COMMON.fromBigNumber(status.totalSupply, decimals));
    }

    // Read Lp Price from extra data
    if (extra.lpPrice) {
        addDetailRow(grid, 'Lp Price', COMMON.fromBigNumber(extra.lpPrice, 18));
    } else {
        addDetailRow(grid, 'Lp Price', "-");
    }
    
    // User Pool Info from userAllPoolsInfo
    addDetailRow(grid, '=== User Pool Info ===', '', true);
    try {
      if (state.userPoolsInfo && Array.isArray(state.userPoolsInfo)) {
        const userPoolInfo = state.userPoolsInfo.find(p => String(p?.poolID) === String(poolId));
        if (userPoolInfo) {
          addDetailRow(grid, 'Total Credits', userPoolInfo.totalCredits || '0');
          addDetailRow(grid, 'Credit Used', userPoolInfo.creditUsed || '0');
          addDetailRow(grid, 'Asset Wallet Balance', COMMON.fromBigNumber(userPoolInfo.assetWalletBalance, decimals));
          addDetailRow(grid, 'Liability', COMMON.fromBigNumber(userPoolInfo.liability, decimals));
          addDetailRow(grid, 'Locked LP', COMMON.fromBigNumber(userPoolInfo.lockedLp, decimals));
          addDetailRow(grid, 'Locked Assets', COMMON.fromBigNumber(userPoolInfo.lockedAssets, decimals));
          addDetailRow(grid, 'All Rewards', COMMON.fromBigNumber(userPoolInfo.allRewards, decimals));
        } else {
          addDetailRow(grid, 'No user data', '(not allocated)');
        }
      } else {
        addDetailRow(grid, 'Loading...', '');
      }
    } catch (e) {
      console.error('Failed to render user pool info:', e);
      addDetailRow(grid, 'Error', 'Failed to load user info');
    }
  }

  function addDetailRow(grid, label, value, isDivider = false) {
    if (isDivider) {
      const divider = document.createElement('div');
      divider.className = 'detail-divider';
      grid.appendChild(divider);
      
      const titleDiv = document.createElement('div');
      titleDiv.style.gridColumn = '1 / -1';
      titleDiv.style.fontWeight = '700';
      titleDiv.style.fontSize = '13px';
      titleDiv.style.color = '#111827';
      titleDiv.style.marginTop = '8px';
      titleDiv.textContent = label;
      grid.appendChild(titleDiv);
      return;
    }
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'detail-label';
    labelDiv.textContent = label;
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'detail-value';
    valueDiv.textContent = value ?? '';
    
    grid.appendChild(labelDiv);
    grid.appendChild(valueDiv);
  }
  
  function addDetailRowWithCopy(grid, label, address, symbol) {
    // Show symbol
    const labelDiv1 = document.createElement('div');
    labelDiv1.className = 'detail-label';
    labelDiv1.textContent = label;
    
    const valueDiv1 = document.createElement('div');
    valueDiv1.className = 'detail-value';
    valueDiv1.textContent = symbol || 'Unknown';
    
    grid.appendChild(labelDiv1);
    grid.appendChild(valueDiv1);
    
    // Show address with copy button (abbreviated format)
    const labelDiv2 = document.createElement('div');
    labelDiv2.className = 'detail-label';
    labelDiv2.textContent = `${label} Address`;
    
    const valueDiv2 = document.createElement('div');
    valueDiv2.className = 'detail-value detail-value-with-copy';
    
    const addressSpan = document.createElement('span');
    // Format: 0xaaaa...bbbb
    const abbreviated = _truncateAddr(address);
    addressSpan.textContent = abbreviated;
    addressSpan.style.fontSize = '11px';
    addressSpan.style.fontFamily = 'monospace';
    addressSpan.title = address; // Show full address on hover
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-address-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => copyToClipboard(address, copyBtn));
    
    valueDiv2.appendChild(addressSpan);
    valueDiv2.appendChild(copyBtn);
    
    grid.appendChild(labelDiv2);
    grid.appendChild(valueDiv2);
  }

  // ========== Related Section Rendering ==========
  
  async function renderRelated() {
    const relatedContent = document.getElementById('related-content');
    const titleEl = document.querySelector('#related-section .section-title');
    clearElement(relatedContent);

    if (!state.selectedItem) {
      relatedContent.innerHTML = '<div class="empty-state"><div>Select a pool to view related VTPs</div></div>';
      return;
    }

    // Always show Related VTPs for the selected pool
    titleEl.textContent = 'Related VTPs';
    await renderPoolVtps(relatedContent, state.selectedItem);
  }

  async function renderPoolVtps(container, pool) {
    const vtps = Array.isArray(pool?.relatedVtps)
      ? [...pool.relatedVtps].sort((a, b) => Number(a?.params?.id || 0) - Number(b?.params?.id || 0))
      : [];
    
    if (vtps.length === 0) {
      container.innerHTML = '<div class="empty-state"><div>No related VTPs found</div></div>';
      return;
    }

    // Get credits info for risk level calculation
    let creditList = [];
    try {
      const ctl = await window.contracts.getController();
      const res = await ctl.getCreditsInfo();
      creditList = Array.from(res?.creditList ?? res?.[1] ?? []).map(v => Number(v));
    } catch (e) {
      console.error('Failed to get credits info:', e);
    }

    // Get user VTP token info from userPoolsInfo
    let userVtpTokenMap = new Map(); // key: poolID-vtpID, value: UserVtpTokenInfo
    try {
      if (state.userPoolsInfo && Array.isArray(state.userPoolsInfo)) {
        const poolId = pool?.params?.id;
        const userPoolInfo = state.userPoolsInfo.find(p => String(p?.poolID) === String(poolId));
        if (userPoolInfo && Array.isArray(userPoolInfo.userVtpTokens)) {
          for (const vtpTokenInfo of userPoolInfo.userVtpTokens) {
            // Handle both vtpID and vtpId properties
            const vtpIdValue = vtpTokenInfo.vtpID ?? vtpTokenInfo.vtpId;
            const key = `${poolId}-${vtpIdValue}`;
            userVtpTokenMap.set(key, vtpTokenInfo);
          }
        } else {
        }
      }
    } catch (e) {
      console.error('Failed to get user VTP token info:', e);
    }

    // Use symbols from extra data
    const extra = state.selectedPoolExtraData || {};
    const vtpSymbolMap = extra.symbols || {};

    for (const vtp of vtps) {
      const block = document.createElement('div');
      block.className = 'vtp-block collapsed'; // Start collapsed
      
      const asset0 = vtp?.token0?.params?.asset;
      const asset1 = vtp?.token1?.params?.asset;
      
      const symbol0 = vtp?.token0?.params?.assetSymbol || vtpSymbolMap[asset0] || await getSymbol(asset0);
      const symbol1 = vtp?.token1?.params?.assetSymbol || vtpSymbolMap[asset1] || await getSymbol(asset1);
      
      const vtpId = vtp?.params?.id;
      if (vtpId === undefined || vtpId === null) throw new Error('VTP id missing in renderPoolVtps');
      const poolId = pool?.params?.id;
      if (poolId === undefined || poolId === null) throw new Error('Pool id missing in renderPoolVtps');
      const poolDecimals = Number(pool?.params?.decimals);
      if (!Number.isFinite(poolDecimals)) throw new Error('Pool decimals missing');
      const token0Decimals = Number(vtp?.token0?.params?.decimals);
      const token1Decimals = Number(vtp?.token1?.params?.decimals);
      if (!Number.isFinite(token0Decimals) || !Number.isFinite(token1Decimals)) throw new Error('VTP token decimals missing');
      
      // Header with toggle
      const header = document.createElement('div');
      header.className = 'vtp-block-header';
      
      const headerText = document.createElement('span');
      headerText.textContent = `${symbol0 || 'Token0'} / ${symbol1 || 'Token1'} (VTP ID: ${vtpId})`;
      
      const toggle = document.createElement('span');
      toggle.className = 'vtp-block-toggle';
      toggle.textContent = '▼';
      
      header.appendChild(headerText);
      header.appendChild(toggle);
      
      header.addEventListener('click', () => {
        block.classList.toggle('collapsed');
      });
      
      // Collapsed summary view (shown when collapsed)
      const collapsedSummary = document.createElement('div');
      collapsedSummary.className = 'vtp-block-collapsed-summary';
      
      // Get user allocation for this VTP
      const key = `${poolId}-${vtpId}`;
      const userVtpToken = userVtpTokenMap.get(key);
      const allocation = userVtpToken ? COMMON.fromBigNumber(userVtpToken.allocation, poolDecimals) : '0';
      
      const riskLevel = Number(vtp?.params?.riskLevel) || 1;
      const credit = creditList[riskLevel-1] || 0;
      const extra = state.selectedPoolExtraData || {};
      const userMaxAllocBN = extra.userMaxAllocations ? extra.userMaxAllocations[vtpId] : null;
      const userMaxAlloc = userMaxAllocBN ? COMMON.fromBigNumber(userMaxAllocBN, poolDecimals) : null;
      // maxAllocateRate is uint16 (0-65535), base 10000, no decimal conversion needed
      const maxAllocateRate = Number(vtp?.token0?.params?.maxAllocateRate) || 0;
      const maxAllocPercent = (maxAllocateRate / 10000 * 100).toFixed(2);
      
      collapsedSummary.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 12px; align-items: center;">
          <div><strong>Credit:</strong> ${credit}</div>
          <div><strong>Max Alloc:</strong> ${userMaxAlloc !== null && userMaxAlloc !== undefined ? userMaxAlloc : `${maxAllocPercent}% (rate)`}</div>
          <div><strong>Allocation:</strong> ${allocation}</div>
          <div style="display: flex; align-items: center; gap: 6px;"><strong>Target:</strong> <input type="number" class="vtp-param-input" id="target-collapsed-${vtpId}" value="${allocation}" min="0" style="width: 100%; max-width: 120px; padding: 4px 6px;" /></div>
        </div>
      `;
      
      // Content (collapsible)
      const content = document.createElement('div');
      content.className = 'vtp-block-content';
      
      // VTP general info
      const n = vtp?.params?.n;
      const p = vtp?.params?.p;
      const pPercent = (Number(p) / 100).toFixed(2); // p=1200 means 12.00%
      const po = COMMON.fromBigNumber(vtp?.status?.po, 18);
      const pa = COMMON.fromBigNumber(vtp?.status?.pa, 18);
      const poolID0 = vtp?.token0?.params?.id;
      const poolID1 = vtp?.token1?.params?.id;
      const liability0 = COMMON.fromBigNumber(vtp?.token0?.status?.liability || 0, token0Decimals);
      const liability1 = COMMON.fromBigNumber(vtp?.token1?.status?.liability || 0, token1Decimals);
      const assets0 = COMMON.fromBigNumber(vtp?.token0?.status?.assets, token0Decimals);
      const assets1 = COMMON.fromBigNumber(vtp?.token1?.status?.assets, token1Decimals);
      const alr0 = Number(COMMON.fromBigNumber(vtp?.token0?.status?.alr, 18)) || 1;
      const alr1 = Number(COMMON.fromBigNumber(vtp?.token1?.status?.alr, 18)) || 1;
      const feeTotal0 = COMMON.fromBigNumber(vtp?.token0?.status?.feeTotal, token0Decimals);
      const feeTotal1 = COMMON.fromBigNumber(vtp?.token1?.status?.feeTotal, token1Decimals);
      const feePeriod0 = COMMON.fromBigNumber(vtp?.token0?.status?.feePeriod, token0Decimals);
      const feePeriod1 = COMMON.fromBigNumber(vtp?.token1?.status?.feePeriod, token1Decimals);
      const feeProtocol0 = COMMON.fromBigNumber(vtp?.token0?.status?.feeProtocol, token0Decimals);
      const feeProtocol1 = COMMON.fromBigNumber(vtp?.token1?.status?.feeProtocol, token1Decimals);
      const totalShares0 = COMMON.fromBigNumber(vtp?.token0?.status?.totalShares, token0Decimals);
      const totalShares1 = COMMON.fromBigNumber(vtp?.token1?.status?.totalShares, token1Decimals);
      const paused0 = vtp?.token0?.status?.paused ? 'True' : 'False';
      const paused1 = vtp?.token1?.status?.paused ? 'True' : 'False';

      // riskLevel and credit already declared above for collapsed summary

      await renderVtpOverview(content, {
        n,
        p,
        pPercent,
        riskLevel,
        credit,
        po,
        pa,
      });

      await renderVtpTokenCards(content, vtp, [
        { token: vtp?.token0, label: 'Token 0', decimals: token0Decimals, ralr: (alr1 / alr0) },
        { token: vtp?.token1, label: 'Token 1', decimals: token1Decimals, ralr: (alr0 / alr1) },
      ]);

      // VTP Token parameters (editable)
      await renderVtpTokenParams(content, vtp, poolId, vtpId);
      
      // Incentives
      await renderIncentives(content, vtp, poolId, vtpId);
      
      // User allocation info
      await renderUserAllocation(content, pool, vtp, poolId, vtpId, userVtpTokenMap, credit);
      
      block.appendChild(header);
      block.appendChild(collapsedSummary); // Collapsed view
      block.appendChild(content); // Expanded view
      container.appendChild(block);
      
      // Sync target allocation inputs between collapsed and expanded views
      const collapsedInput = document.getElementById(`target-collapsed-${vtpId}`);
      const expandedInput = document.getElementById(`target-expanded-${vtpId}`);
      if (collapsedInput && expandedInput) {
        collapsedInput.addEventListener('input', () => {
          expandedInput.value = collapsedInput.value;
        });
        expandedInput.addEventListener('input', () => {
          collapsedInput.value = expandedInput.value;
        });
      }
    }
  }
  
  async function renderVtpTokenCards(container, vtp, entries) {
    const wrapper = document.createElement('div');
    wrapper.className = 'vtptoken-wrapper';
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
    wrapper.style.gap = '12px';

    const validEntries = Array.isArray(entries) ? entries.filter(e => e && e.token) : [];
    if (validEntries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<div>No VTP token data available</div>';
      container.appendChild(empty);
      return;
    }

    for (const entry of validEntries) {
      const { token, label, decimals, ralr } = entry;
      const params = token.params || {};
      const status = token.status || {};
      const asset = params.asset;
      const symbol = await getSymbol(asset);

      const card = document.createElement('div');
      card.className = 'vtptoken-block';

      const header = document.createElement('div');
      header.className = 'vtptoken-header';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.cursor = 'pointer';
      header.innerHTML = `<span>${label}: ${symbol || asset}</span><span class="vtp-param-toggle">▶</span>`;

      const grid = document.createElement('div');
      grid.className = 'vtptoken-grid';
      grid.style.display = 'none'; // default collapsed

      const addItem = (lbl, val) => {
        const item = document.createElement('div');
        item.className = 'vtptoken-item';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.gap = '6px';
        item.style.fontSize = '11px';
        item.style.overflow = 'hidden';
        item.innerHTML = `
          <span class="vtptoken-item-label" style="flex-shrink: 0; white-space: nowrap;">${lbl}</span>
          <span class="vtptoken-item-value" style="text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; word-break: break-all; font-family: monospace;">${val ?? ''}</span>
        `;
        grid.appendChild(item);
      };

      addItem('Pool ID', params.id);
      // addItem('Asset', symbol || asset);
      // addItem('Decimals', Number(params.decimals) || 0);
      addItem('Risk Level', params.riskLevel);
      // addItem('Fee In', formatPercent(params.swapFeeIn, 1000000));
      // addItem('Fee Out', formatPercent(params.swapFeeOut, 1000000));
      // addItem('Protocol Fee', formatPercent(params.protocolFeeRate, 10000));
      // addItem('Max Allocate', formatPercent(params.maxAllocateRate, 10000));
      // addItem('ALR Lower Bound', formatPercent(params.alrLowerBound, 10000));
      addItem('ALR', COMMON.fromBigNumber(status.alr, 18));
      if (Number.isFinite(ralr)) addItem('Ralr', ralr.toFixed(6));
      addItem('Assets', COMMON.fromBigNumber(status.assets, decimals));
      addItem('Liability', COMMON.fromBigNumber(status.liability, decimals));
      addItem('Total Shares', COMMON.fromBigNumber(status.totalShares, decimals));
      addItem('Fee Total', COMMON.fromBigNumber(status.feeTotal, decimals));
      addItem('Fee Period', COMMON.fromBigNumber(status.feePeriod, decimals));
      addItem('Fee Protocol', COMMON.fromBigNumber(status.feeProtocol, decimals));
      addItem('Paused', status.paused ? 'True' : 'False');

      header.addEventListener('click', () => {
        const isHidden = grid.style.display === 'none';
        grid.style.display = isHidden ? 'grid' : 'none';
        const toggle = header.querySelector('.vtp-param-toggle');
        if (toggle) toggle.textContent = isHidden ? '▼' : '▶';
      });

      card.appendChild(header);
      card.appendChild(grid);
      wrapper.appendChild(card);
    }

    container.appendChild(wrapper);
  }

  async function renderVtpOverview(container, stats) {
    const { n, p, pPercent, riskLevel, credit, po, pa } = stats;
    const wrapper = document.createElement('div');
    wrapper.className = 'vtp-overview-wrapper';
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = 'repeat(2, 1fr)';
    wrapper.style.gap = '12px';
    wrapper.style.marginBottom = '8px';
    wrapper.style.fontSize = '12px';

    const addItem = (label, value) => {
      const item = document.createElement('div');
      item.className = 'vtptoken-item';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.gap = '8px';
      item.style.fontSize = '12px';
      item.innerHTML = `
        <span class="vtptoken-item-label">${label}</span>
        <span class="vtptoken-item-value">${value ?? ''}</span>
      `;
      wrapper.appendChild(item);
    };

    addItem('n', n);
    addItem('p', `${p} (${pPercent}%)`);
    addItem('Risk Level', riskLevel);
    addItem('Credit', credit);
    addItem('Po', po);
    addItem('Pa', pa);

    container.appendChild(wrapper);
  }

  async function renderVtpTokenParams(container, vtp, poolId, vtpId) {
    const section = document.createElement('div');
    section.className = 'vtp-block-section';
    
    const title = document.createElement('div');
    title.className = 'vtp-block-section-title';
    title.textContent = 'VtpToken Parameters';
    section.appendChild(title);
    
    const token = vtp?.token0?.params?.id === poolId ? vtp?.token0 : vtp?.token1?.params?.id === poolId ? vtp?.token1 : null;
    if (!token) return;
    
    const params = token.params || {};
    const swapFeeIn = COMMON.fromBigNumber(params.swapFeeIn, 0);
    const swapFeeOut = COMMON.fromBigNumber(params.swapFeeOut, 0);
    const protocolFeeRate = Number(params.protocolFeeRate) || 0;
    const maxAllocateRate = Number(params.maxAllocateRate) || 0;
    const alrLowerBound = Number(params.alrLowerBound) || 0;
    
    const feeInPercent = (swapFeeIn / 1000000 * 100).toFixed(4);
    const feeOutPercent = (swapFeeOut / 1000000 * 100).toFixed(4);
    const protocolFeePercent = (protocolFeeRate / 10000 * 100).toFixed(2);
    const maxAllocPercent = (maxAllocateRate / 10000 * 100).toFixed(2);
    const alrPercent = (alrLowerBound / 10000 * 100).toFixed(2);

    const paramsGrid = document.createElement('div');
    paramsGrid.className = 'vtp-param-grid';
    paramsGrid.style.display = 'grid';
    paramsGrid.style.gridTemplateColumns = '1fr';
    paramsGrid.style.gap = '12px';

    const makeCollapsibleCard = (title, bodyHtml) => {
      const card = document.createElement('div');
      card.className = 'vtp-param-editable collapsible collapsed';
      card.style.display = 'grid';
      card.style.gap = '6px';

      const header = document.createElement('div');
      header.className = 'vtp-param-collapsible-header';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.cursor = 'pointer';
      header.style.fontWeight = '600';
      header.innerHTML = `<span>${title}</span><span class="vtp-param-toggle">▶</span>`;

      const body = document.createElement('div');
      body.className = 'vtp-param-collapsible-body';
      body.style.display = 'none';
      body.innerHTML = bodyHtml;

      header.addEventListener('click', () => {
        const isCollapsed = body.style.display === 'none';
        body.style.display = isCollapsed ? 'grid' : 'none';
        body.style.gap = '6px';
        card.classList.toggle('collapsed', !isCollapsed);
        const toggle = header.querySelector('.vtp-param-toggle');
        if (toggle) toggle.textContent = isCollapsed ? '▼' : '▶';
      });

      card.appendChild(header);
      card.appendChild(body);
      return card;
    };

    const feeBody = `
      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #374151;">
        Swap Fee In
        <input type="number" class="vtp-param-input" id="feeIn-${poolId}-${vtpId}" value="${swapFeeIn}" min="0" step="1" placeholder="Fee In" style="width: 100%; max-width: 220px;">
        <small style="color: #6b7280; font-size: 11px;">In: ${feeInPercent}% (dec=6)</small>
      </label>
      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #374151;">
        Swap Fee Out
        <input type="number" class="vtp-param-input" id="feeOut-${poolId}-${vtpId}" value="${swapFeeOut}" min="0" step="1" placeholder="Fee Out" style="width: 100%; max-width: 220px;">
        <small style="color: #6b7280; font-size: 11px;">Out: ${feeOutPercent}% (dec=6)</small>
      </label>
      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #374151;">
        Protocol Fee
        <input type="number" class="vtp-param-input" id="protocolFee-${poolId}-${vtpId}" value="${protocolFeeRate}" min="0" step="1" placeholder="Protocol" style="width: 100%; max-width: 220px;">
        <small style="color: #6b7280; font-size: 11px;">Protocol: ${protocolFeePercent}% (dec=4)</small>
      </label>
      <button class="vtp-param-update-btn" id="updateFees-${poolId}-${vtpId}" style="width: 100%; max-width: 220px;">Update</button>
    `;

    const maxAllocBody = `
      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #374151;">
        Value
        <input type="number" class="vtp-param-input" id="maxAlloc-${poolId}-${vtpId}" value="${maxAllocateRate}" min="0" step="1" placeholder="Max Alloc" style="width: 100%; max-width: 220px;">
        <small style="color: #6b7280; font-size: 11px;">${maxAllocPercent}% (dec=4)</small>
      </label>
      <button class="vtp-param-update-btn" id="updateMaxAlloc-${poolId}-${vtpId}" style="width: 100%; max-width: 220px;">Update</button>
    `;

    const alrBody = `
      <label style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #374151;">
        Value
        <input type="number" class="vtp-param-input" id="alrBound-${poolId}-${vtpId}" value="${alrLowerBound}" min="0" step="1" placeholder="ALR Bound" style="width: 100%; max-width: 220px;">
        <small style="color: #6b7280; font-size: 11px;">${alrPercent}% (dec=4)</small>
      </label>
      <button class="vtp-param-update-btn" id="updateAlrBound-${poolId}-${vtpId}" style="width: 100%; max-width: 220px;">Update</button>
    `;

    paramsGrid.appendChild(makeCollapsibleCard('Fees', feeBody));
    paramsGrid.appendChild(makeCollapsibleCard('Max Allocate', maxAllocBody));
    paramsGrid.appendChild(makeCollapsibleCard('ALR Lower Bound', alrBody));
    section.appendChild(paramsGrid);
    
    container.appendChild(section);
    
    // Setup event handlers for update buttons
    setupVtpParamHandlers(vtpId, poolId);
  }
  
  function setupVtpParamHandlers(vtpId, poolId) {
    // Defer to next tick to ensure DOM is ready
    setTimeout(() => {
      const updateFeesBtn = document.getElementById(`updateFees-${poolId}-${vtpId}`);
      const updateMaxAllocBtn = document.getElementById(`updateMaxAlloc-${poolId}-${vtpId}`);
      const updateAlrBoundBtn = document.getElementById(`updateAlrBound-${poolId}-${vtpId}`);
      
      if (updateFeesBtn) {
        updateFeesBtn.addEventListener('click', async () => {
          const feeIn = document.getElementById(`feeIn-${poolId}-${vtpId}`).value;
          const feeOut = document.getElementById(`feeOut-${poolId}-${vtpId}`).value;
          const protocolFee = document.getElementById(`protocolFee-${poolId}-${vtpId}`).value;
          
          const originalText = updateFeesBtn.textContent;
          try {
            updateFeesBtn.disabled = true;
            updateFeesBtn.textContent = 'Sending Tx...';
            
            const adminSigner = await COMMON.resolveSigner('', {
              contractAddress: env.getAllParams().controller,
              requireAdmin: true
            });
            if (!adminSigner) {
              alert('No controller admin available');
              return;
            }

            const controller = await window.contracts.getController(adminSigner);
            // Correct method: updateSwapFee(poolID, vtpID, feeIn, feeOut, protocolFee)
            const tx = await controller.updateSwapFee(poolId, vtpId, feeIn, feeOut, protocolFee);
            updateFeesBtn.textContent = 'Confirming...';
            await tx.wait();
            
            alert('Fees updated successfully!');
            await refreshData();
          } catch (e) {
            console.error('Failed to update fees:', e);
            alert('Failed to update fees: ' + e.message);
          } finally {
            updateFeesBtn.disabled = false;
            updateFeesBtn.textContent = originalText;
          }
        });
      }
      
      if (updateMaxAllocBtn) {
        updateMaxAllocBtn.addEventListener('click', async () => {
          const maxAlloc = document.getElementById(`maxAlloc-${poolId}-${vtpId}`).value;
          
          const originalText = updateMaxAllocBtn.textContent;
          try {
            updateMaxAllocBtn.disabled = true;
            updateMaxAllocBtn.textContent = 'Sending Tx...';
            
            const adminSigner = await COMMON.resolveSigner('', {
              contractAddress: env.getAllParams().controller,
              requireAdmin: true
            });
            if (!adminSigner) {
              alert('No controller admin available');
              return;
            }

            const controller = await window.contracts.getController(adminSigner);
            // Correct method: updateMaxAllocateRate(poolID, vtpID, value)
            const tx = await controller.updateMaxAllocateRate(poolId, vtpId, maxAlloc);
            updateMaxAllocBtn.textContent = 'Confirming...';
            await tx.wait();
            
            alert('Max allocate updated successfully!');
            await refreshData();
          } catch (e) {
            console.error('Failed to update max allocate:', e);
            alert('Failed to update max allocate: ' + e.message);
          } finally {
            updateMaxAllocBtn.disabled = false;
            updateMaxAllocBtn.textContent = originalText;
          }
        });
      }
      
      if (updateAlrBoundBtn) {
        updateAlrBoundBtn.addEventListener('click', async () => {
          const alrBound = document.getElementById(`alrBound-${poolId}-${vtpId}`).value;
          
          const originalText = updateAlrBoundBtn.textContent;
          try {
            updateAlrBoundBtn.disabled = true;
            updateAlrBoundBtn.textContent = 'Sending Tx...';
            
            const adminSigner = await COMMON.resolveSigner('', {
              contractAddress: env.getAllParams().controller,
              requireAdmin: true
            });
            if (!adminSigner) {
              alert('No controller admin available');
              return;
            }

            const controller = await window.contracts.getController(adminSigner);
            // Correct method: updateAlrLowerBound(poolID, vtpID, value)
            const tx = await controller.updateAlrLowerBound(poolId, vtpId, alrBound);
            updateAlrBoundBtn.textContent = 'Confirming...';
            await tx.wait();
            
            alert('ALR lower bound updated successfully!');
            await refreshData();
          } catch (e) {
            console.error('Failed to update ALR lower bound:', e);
            alert('Failed to update ALR lower bound: ' + e.message);
          } finally {
            updateAlrBoundBtn.disabled = false;
            updateAlrBoundBtn.textContent = originalText;
          }
        });
      }
    }, 1000);
  }
  
  /**
   * Render the incentives section for a VTP.
   * Displays existing incentives and provides a form to create a new incentive.
   * @param {HTMLElement} container - The container element.
   * @param {Object} vtp - The VTP object.
   * @param {string} poolId - The pool ID.
   * @param {string} vtpId - The VTP ID.
   */
  async function renderIncentives(container, vtp, poolId, vtpId) {
    const section = document.createElement('div');
    section.className = 'vtp-block-section';
    
    const title = document.createElement('div');
    title.className = 'vtp-block-section-title';
    title.textContent = 'Incentives';
    section.appendChild(title);

    const vtpToken = vtp?.token0?.params?.id == vtpId ? vtp.token0 : vtp.token1;
    const incentives = Array.isArray(vtpToken?.incentives) ? vtpToken.incentives : [];

    if (incentives && incentives.length > 0) {
      const div = document.createElement('div');
      // Params of each incentive: id (incentive ID), token (token address, should turn into symbol), decimals, emissionPerSecond (should be parsed by decimals), startTime, endTime (time to be formatted)
      // div.innerHTML = `<strong>Incentives:</strong> ${incentives.map(inc => `${(inc.token)}: `).join(', ')}`;
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.gap = '6px';
      for (const inc of incentives) {
        const tokenSymbol = await getSymbol(inc.token);
        const emission = COMMON.fromBigNumber(inc.emissionPerSecond, inc.decimals);
        const startTime = new Date(Number(inc.startTime) * 1000).toLocaleString();
        const endTime = new Date(Number(inc.endTime) * 1000).toLocaleString();
        const incDiv = document.createElement('div');
        incDiv.style.fontSize = '12px';
        incDiv.style.color = '#374151';
        incDiv.textContent = `${tokenSymbol || inc.token}: ${emission}/s | Start: ${startTime} | End: ${endTime}`;
        div.appendChild(incDiv);
      }
      section.appendChild(div);
    } else {
      section.innerHTML += '<div style="color: #6b7280; font-size: 12px;">No incentives</div>';
    }
    
    // Create Incentive button (always shown)
    const createBtn = document.createElement('button');
    createBtn.className = 'vtp-param-update-btn';
    createBtn.textContent = 'Create Incentive';
    createBtn.style.marginTop = '8px';
    createBtn.id = `create-incentive-${vtpId}`;
    section.appendChild(createBtn);
    
    // Create incentive form (hidden by default)
    const form = document.createElement('div');
    form.id = `incentive-form-${vtpId}`;
    form.style.display = 'none';
    form.style.marginTop = '12px';
    form.style.padding = '12px';
    form.style.border = '1px solid #e5e7eb';
    form.style.borderRadius = '6px';
    form.className = 'incentive-form';
    section.appendChild(form);
    
    container.appendChild(section);
    
    // Setup create incentive handler
    setupCreateIncentiveHandler(vtpId, poolId, createBtn, form);
  }
  
  function setupCreateIncentiveHandler(vtpId, poolId, createBtn, form) {
    setTimeout(() => {
      createBtn.addEventListener('click', () => {
        // Toggle form visibility
        if (form.style.display === 'none') {
          form.style.display = 'block';
          createBtn.textContent = 'Cancel';
          renderIncentiveForm(form, vtpId, poolId);
        } else {
          form.style.display = 'none';
          createBtn.textContent = 'Create Incentive';
        }
      });
    }, 0);
  }
  
  async function renderIncentiveForm(form, vtpId, poolId) {
    form.innerHTML = ''; // Clear previous content
    
    // Supported reward tokens come from the Test Token factory list
    let supportedTokens = [];
    try {
      supportedTokens = await window.contractData.getSupportedTokens();
      supportedTokens = Array.isArray(supportedTokens) ? supportedTokens.filter(t => COMMON.isAddress(t)) : [];
      const seen = new Set();
      supportedTokens = supportedTokens.filter(t => {
        const lower = t.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
    } catch (e) {
      console.error('Failed to get supported tokens:', e);
      supportedTokens = [];
    }
    
    // Get symbols for the tokens
    let tokenOptions = [];
    try {
      // Use centralized cache instead of manual multicall
      tokenOptions = await Promise.all(supportedTokens.map(async (addr) => {
        const symbol = await getSymbol(addr);
        return { addr, symbol };
      }));
    } catch (e) {
      console.error('Failed to fetch incentive token symbols:', e);
      tokenOptions = supportedTokens.map(addr => ({ addr, symbol: '' }));
    }
    
    const statusId = `incentive-status-${vtpId}`;
    form.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Reward Token</label>
          <select id="incentive-token-${vtpId}" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;">
            <option value="">Select token...</option>
            ${tokenOptions.map(t => `<option value="${t.addr}">${t.symbol || _truncateAddr(t.addr)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Total Distribution Amount</label>
          <input type="number" id="incentive-amount-${vtpId}" placeholder="0.0" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px;" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Start Time</label>
          <input type="datetime-local" id="incentive-start-${vtpId}" style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">End Time</label>
          <input type="datetime-local" id="incentive-end-${vtpId}" style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb;" />
        </div>
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <button id="submit-incentive-${vtpId}" class="vtp-param-update-btn" style="width: 100%; max-width: 240px; align-self: flex-start;">Submit Incentive</button>
          <div id="${statusId}" style="font-size:12px; color:#6b7280;"></div>
        </div>
      </div>
    `;
    
    // Setup submit handler
    setTimeout(() => {
      const submitBtn = document.getElementById(`submit-incentive-${vtpId}`);
      if (submitBtn) {
        submitBtn.addEventListener('click', () => handleCreateIncentive(vtpId, poolId));
      }
    }, 0);
  }
  
  function setIncentiveStatus(vtpId, message, isError = false) {
    const el = document.getElementById(`incentive-status-${vtpId}`);
    if (el) {
      el.textContent = message;
      el.style.color = isError ? '#b91c1c' : '#374151';
    }
  }

  async function handleCreateIncentive(vtpId, poolId) {
    const tokenAddr = document.getElementById(`incentive-token-${vtpId}`).value;
    const amount = document.getElementById(`incentive-amount-${vtpId}`).value;
    const startTime = document.getElementById(`incentive-start-${vtpId}`).value;
    const endTime = document.getElementById(`incentive-end-${vtpId}`).value;
    const poolIdNum = Number(poolId);
    const vtpIdNum = Number(vtpId);
    const submitBtn = document.getElementById(`submit-incentive-${vtpId}`);

    if (!tokenAddr || !amount || !startTime || !endTime) {
      setIncentiveStatus(vtpId, 'Please fill all fields', true);
      return;
    }

    const userAddr = env.getAllParams().user;
    const controllerAddrFromEnv = env.getAllParams().controller;

    const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);
    const nowTs = Math.floor(Date.now() / 1000);
    const effectiveStart = Math.max(startTimestamp, nowTs);

    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
      setIncentiveStatus(vtpId, 'Invalid start/end time', true);
      return;
    }
    if (!Number.isFinite(poolIdNum) || !Number.isFinite(vtpIdNum)) {
      setIncentiveStatus(vtpId, 'Invalid pool or VTP id', true);
      return;
    }
    if (endTimestamp <= effectiveStart) {
      setIncentiveStatus(vtpId, 'End time must be after start time', true);
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Validating...';
      setIncentiveStatus(vtpId, 'Validating inputs...');

      const incentivesController = await window.contracts.getIncentivesController(userAddr);
      const controllerAddr = COMMON.isAddress(controllerAddrFromEnv)
        ? controllerAddrFromEnv
        : await window.RpcManager.call(incentivesController, 'controller');

      if (!window.RpcManager) throw new Error('RpcManager required');

      const calls = [
        { target: tokenAddr, abi: ['function decimals() view returns (uint8)'], method: 'decimals', params: [], allowFailure: false },
        { target: tokenAddr, abi: ['function balanceOf(address) view returns (uint256)'], method: 'balanceOf', params: [userAddr], allowFailure: false },
        { target: tokenAddr, abi: ['function allowance(address,address) view returns (uint256)'], method: 'allowance', params: [userAddr, incentivesController.address], allowFailure: false },
        { target: incentivesController.address, abi: ['function hasRole(bytes32,address) view returns (bool)'], method: 'hasRole', params: ['0x59798917d75c78b7a0e05acf95a9deb3d7eba6d6cb800e51a647fb4d7648e4c9', userAddr], allowFailure: false },
        { target: incentivesController.address, abi: ['function shortestIncentiveDuration() view returns (uint32)'], method: 'shortestIncentiveDuration', params: [], allowFailure: false },
        { target: incentivesController.address, abi: ['function getVtpTokenActiveIncentiveIDs(uint16,uint32) view returns (uint32[])'], method: 'getVtpTokenActiveIncentiveIDs', params: [poolIdNum, vtpIdNum], allowFailure: false }
      ];

      const mcRes = await window.RpcManager.multicall(calls);
      const decimals = Number(mcRes[0]);
      const balance = mcRes[1];
      const allowance = mcRes[2];
      const hasRole = !!mcRes[3];
      const shortestDuration = Number(mcRes[4]);
      const activeIds = Array.isArray(mcRes[5]) ? mcRes[5] : [];

      const controller = await window.contracts.getController(controllerAddr || userAddr);
      const vtpToken = await window.RpcManager.call(controller, 'getVtpToken', [poolIdNum, vtpIdNum]);
      const pickLiability = (vtp) => {
        if (!vtp) return null;
        const candidates = [
          vtp.token0?.status?.liability,
          vtp.token1?.status?.liability,
          vtp.status?.liability,
          vtp[0]?.status?.liability,
          vtp[1]?.status?.liability
        ];
        for (const c of candidates) {
          if (c !== undefined && c !== null) return c;
        }
        return null;
      };
      const liabilityRaw = pickLiability(vtpToken);
      const liability = liabilityRaw != null ? ethers.BigNumber.from(liabilityRaw) : null;

      if (!liability || liability.isZero()) {
        setIncentiveStatus(vtpId, 'VTP must be activated before incentives', true);
        return;
      }

      if (shortestDuration && effectiveStart + shortestDuration > endTimestamp) {
        setIncentiveStatus(vtpId, `Duration must be >= ${shortestDuration} seconds`, true);
        return;
      }

      if (activeIds.length >= 10) {
        setIncentiveStatus(vtpId, 'Too many active incentives (max 10)', true);
        return;
      }

      const duration = endTimestamp - effectiveStart;
      const amountWei = ethers.utils.parseUnits(amount, decimals || 18);
      const emissionPerSecond = amountWei.div(duration);

      if (emissionPerSecond.lte(0)) {
        setIncentiveStatus(vtpId, 'Emission per second must be positive', true);
        return;
      }

      if (balance.lt(amountWei)) {
        setIncentiveStatus(vtpId, `Insufficient balance; need ${amount}`, true);
        return;
      }

      setIncentiveStatus(vtpId, 'Prechecks passed');

      if (!hasRole) {
        submitBtn.textContent = 'Granting Role...';
        setIncentiveStatus(vtpId, 'Granting role...');
        const signer = await COMMON.resolveSigner('', {
          contractAddress: incentivesController.address,
          requireAdmin: true
        });
        if (!signer) throw new Error('Admin signer required for grantRole');
        // Use Controller ABI to access AccessControl methods on IncentivesController
        const incentivesCtrlWithAC = new ethers.Contract(incentivesController.address, stapleControllerAbi, signer);
        const grantTx = await incentivesCtrlWithAC.grantRole('0x59798917d75c78b7a0e05acf95a9deb3d7eba6d6cb800e51a647fb4d7648e4c9', userAddr);
        submitBtn.textContent = 'Confirming...';
        await grantTx.wait();
        setIncentiveStatus(vtpId, 'Role granted');
      }

      if (allowance.lt(amountWei)) {
        submitBtn.textContent = 'Approving...';
        setIncentiveStatus(vtpId, 'Approving reward tokens...');
        const userTokenContract = await window.contracts.getErc20(tokenAddr, userAddr);
        const approveTx = await userTokenContract.approve(incentivesController.address, amountWei);
        submitBtn.textContent = 'Confirming Approve...';
        await approveTx.wait();
        setIncentiveStatus(vtpId, 'Approve confirmed');
      }

      submitBtn.textContent = 'Creating...';
      setIncentiveStatus(vtpId, 'Creating incentive...');
      const userIncentivesController = await window.contracts.getIncentivesController(userAddr);
      const incentiveInput = {
        poolID: poolIdNum,
        vtpID: vtpIdNum,
        incentiveToken: tokenAddr,
        emissionPerSecond,
        startTime: effectiveStart,
        endTime: endTimestamp
      };

      const createTx = await userIncentivesController.createIncentive(incentiveInput);
      submitBtn.textContent = 'Confirming...';
      await createTx.wait();

      setIncentiveStatus(vtpId, 'Incentive created');
      await refreshData();

      document.getElementById(`incentive-form-${vtpId}`).style.display = 'none';
      document.getElementById(`create-incentive-${vtpId}`).textContent = 'Create Incentive';
    } catch (e) {
      console.error('Failed to create incentive:', e);
      setIncentiveStatus(vtpId, e?.message || 'Failed to create incentive', true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Incentive';
      }
    }
  }
  
  async function renderUserAllocation(container, pool, vtp, poolId, vtpId, userVtpTokenMap, credit) {
    const section = document.createElement('div');
    section.className = 'vtp-block-section';
    
    const title = document.createElement('div');
    title.className = 'vtp-block-section-title';
    title.textContent = 'User Allocation';
    section.appendChild(title);
    
    const key = `${poolId}-${vtpId}`;
    const userVtpToken = userVtpTokenMap.get(key);
    
    const decimalsStr = String(pool?.params?.decimals || '18');
    const decimals = Number(decimalsStr);

    if (userVtpToken) {
      const allocation = COMMON.fromBigNumber(userVtpToken.allocation, decimals);
      const allocatedRate =COMMON.fromBigNumber(userVtpToken.allocatedRate, 18);
      const maxDeallocate = COMMON.fromBigNumber(userVtpToken.maxDeallocate, decimals);
      const maxAllocate = COMMON.fromBigNumber(userVtpToken.maxAllocate, decimals);
      const shares = COMMON.fromBigNumber(userVtpToken.shares, decimals);
      const rewards = COMMON.fromBigNumber(userVtpToken.rewards, decimals);

      const info = document.createElement('div');
      info.style.fontSize = '12px';
      info.style.marginBottom = '8px';
      info.innerHTML = `
        <div><strong>Allocation:</strong> ${allocation}</div>
        <div><strong>Allocated Rate:</strong> ${formatPercent(allocatedRate,1)}</div>
        <div><strong>Max Deallocate:</strong> ${maxDeallocate}</div>
        <div><strong>Max Allocate:</strong> ${maxAllocate}</div>
        <div><strong>Shares:</strong> ${shares}</div>
        <div><strong>Rewards:</strong> ${rewards}</div>
      `;
      section.appendChild(info);
      
      // Target allocation input
      const targetDiv = document.createElement('div');
      targetDiv.className = 'vtp-param-editable';
      targetDiv.innerHTML = `
        <span class="vtp-param-label">Target Allocation:</span>
         <input type="number" class="vtp-param-input" id="target-expanded-${vtpId}" 
           value="${allocation}" 
           min="${Math.max(0, allocation - maxDeallocate)}" 
           max="${allocation + maxAllocate}" 
           step="1">
      `;
      section.appendChild(targetDiv);
    } else {
      // No allocation yet - get max allocate from extra data
      let maxAllocate = '0';
      const extra = state.selectedPoolExtraData || {};
      const maxAllocBN = extra.userMaxAllocations ? extra.userMaxAllocations[vtpId] : null;
      
      if (maxAllocBN) {
          maxAllocate = COMMON.fromBigNumber(maxAllocBN, decimals);
      }

      const info = document.createElement('div');
      info.style.fontSize = '12px';
      info.style.marginBottom = '8px';
      info.innerHTML = `
        <div><strong>Allocation:</strong> 0</div>
        <div><strong>Max Allocate:</strong> ${maxAllocate}</div>
      `;
      section.appendChild(info);
      
      // Target allocation input
      const targetDiv = document.createElement('div');
      targetDiv.className = 'vtp-param-editable';
      targetDiv.innerHTML = `
        <span class="vtp-param-label">Target Allocation:</span>
         <input type="number" class="vtp-param-input" id="target-expanded-${vtpId}" 
           value="0" 
           min="0" 
           max="${maxAllocate}" 
           step="1">
      `;
      section.appendChild(targetDiv);
    }
    
    container.appendChild(section);
  }

  // ========== Actions Section Rendering ==========
  
  /**
   * Render the actions section (right sidebar).
   * Displays available actions for the selected pool (Pause, Deposit, Withdraw, Adjust).
   */
  async function renderActions() {
    const actionsContent = document.getElementById('actions-content');
    const titleEl = document.querySelector('#actions-section .section-title');
    clearElement(actionsContent);

    if (!state.selectedItem) {
      actionsContent.innerHTML = '<div class="empty-state"><div>Select a pool to view actions</div></div>';
      return;
    }

    // Always show Pool Actions
    titleEl.textContent = 'Pool Actions';
    await renderPoolActions(actionsContent, state.selectedItem);
  }

  /**
   * Render specific actions for a pool.
   * Creates UI for Pause/Unpause, Deposit, Withdraw, and Adjust Position.
   * Sets up event handlers for these actions.
   * @param {HTMLElement} container - The container element.
   * @param {Object} pool - The pool object.
   */
  async function renderPoolActions(container, pool) {
    const lpAddr = pool?.params?.lpAddr;
    
    // Get paused status from extra data (fetched via multicall)
    const extra = state.selectedPoolExtraData || {};
    const isPaused = extra.paused === true;
    
    // Pause/Unpause pool action group
    const pauseGroup = document.createElement('div');
    pauseGroup.className = 'action-group';
    
    const pauseActionText = isPaused ? 'Unpause' : 'Pause';
    const pauseBtnClass = isPaused ? 'action-button' : 'action-button danger';
    
    pauseGroup.innerHTML = `
      <div class="action-group-title">${pauseActionText} Pool</div>
      <div class="action-form">
        <button class="${pauseBtnClass}" id="pause-btn">${pauseActionText} Pool</button>
      </div>
    `;
    container.appendChild(pauseGroup);
    
    // Deposit
    const depositGroup = document.createElement('div');
    depositGroup.className = 'action-group';
    depositGroup.innerHTML = `
      <div class="action-group-title">Deposit</div>
      <div class="action-form">
        <div class="action-input-group">
          <label class="action-input-label">Asset Amount</label>
          <input type="text" class="action-input" id="deposit-amount" placeholder="0.0" />
        </div>
        <button class="action-button" id="deposit-btn">Deposit</button>
      </div>
    `;
    container.appendChild(depositGroup);
    
    // Withdraw
    const withdrawGroup = document.createElement('div');
    withdrawGroup.className = 'action-group';
    withdrawGroup.innerHTML = `
      <div class="action-group-title">Withdraw</div>
      <div class="action-form">
        <div class="action-input-group">
          <label class="action-input-label">Asset Amount</label>
          <input type="text" class="action-input" id="withdraw-amount" placeholder="0.0" />
        </div>
        <button class="action-button" id="withdraw-btn">Withdraw</button>
      </div>
    `;
    container.appendChild(withdrawGroup);
    
    // Adjust Position
    const adjustGroup = document.createElement('div');
    adjustGroup.className = 'action-group';
    adjustGroup.innerHTML = `
      <div class="action-group-title">Adjust Position</div>
      <div class="action-form">
        <div class="action-input-group">
          <label class="action-input-label">Additional Asset (optional)</label>
          <input type="text" class="action-input" id="adjust-additional" placeholder="0.0" />
        </div>
        <div style="font-size: 12px; color: #6b7280; margin: 8px 0;">
          Set target allocations in VTP blocks above. Click here to execute.
        </div>
        <button class="action-button" id="adjust-btn">Adjust Position</button>
      </div>
    `;
    container.appendChild(adjustGroup);
    
    // Setup event handlers
    setupPoolActionHandlers(pool, isPaused);
  }

  /**
   * Setup event handlers for pool actions.
   * @param {Object} pool - The pool object.
   * @param {boolean} isPaused - Whether the pool is currently paused (from cached state).
   */
  function setupPoolActionHandlers(pool, isPaused) {
    const pauseBtn = document.getElementById('pause-btn');
    const depositBtn = document.getElementById('deposit-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const adjustBtn = document.getElementById('adjust-btn');

    // Check for Zero Address / No User
    const userAddr = (env && env.getAllParams) ? env.getAllParams().user : null;
    const isNoUser = !userAddr || (window.ethers && userAddr === window.ethers.constants.AddressZero) || userAddr === "0x0000000000000000000000000000000000000000";

    if (isNoUser) {
        [pauseBtn, depositBtn, withdrawBtn, adjustBtn].forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Connect Wallet / Select User';
                btn.style.background = '#cbd5e1';
                btn.style.cursor = 'not-allowed';
            }
        });
        return;
    }
    
    // Pause/Unpause button handler
    if (pauseBtn) {
      const actionText = isPaused ? 'Unpause' : 'Pause';
      
      pauseBtn.addEventListener('click', async () => {
        const poolId = pool?.params?.id;
        const lpAddr = pool?.params?.lpAddr;
        
        try {
          const signer = await COMMON.resolveSigner('', {
            contractAddress: lpAddr,
            requireAdmin: true
          });
          if (!signer) {
              alert('No pool admin signer available');
              return;
          }

          pauseBtn.disabled = true;
          pauseBtn.textContent = `${actionText}ing...`;
          
          // Use minimal ABI for pause/unpause functions
          const minimalPauseABI = [
            "function pause() external",
            "function unpause() external"
          ];
          
          const poolContract = new ethers.Contract(lpAddr, minimalPauseABI, signer);
          
          // Execute the appropriate action based on cached state
          let tx;
          if (isPaused) {
            tx = await poolContract.unpause();
          } else {
            tx = await poolContract.pause();
          }
          
          pauseBtn.textContent = 'Confirming...';
          await tx.wait();
          
          COMMON.showToast?.(`Pool ${actionText.toLowerCase()}d successfully!`) || alert(`Pool ${actionText.toLowerCase()}d successfully!`);
          
          // Clear cached extra data to force fresh fetch
          state.selectedPoolExtraData = null;
          
          // Small delay to ensure chain state is updated before re-fetching
          await new Promise(r => setTimeout(r, 500));
          
          await refreshData();
        } catch (e) {
          console.error('[Pool Actions] Pause/unpause failed:', e);
          alert(`${actionText} failed: ${e.message || e}`);
          // Restore button state
          pauseBtn.disabled = false;
          pauseBtn.textContent = `${actionText} Pool`;
        }
      });
    }
    
    if (depositBtn) {
      depositBtn.addEventListener('click', async () => {
        const amount = document.getElementById('deposit-amount').value;
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
          alert('Please enter a valid amount');
          return;
        }
        
        try {
          const userAddr = env.getAllParams().user;
          if (!userAddr) {
            alert('No user selected in environment');
            return;
          }

          const signer = await COMMON.resolveSigner(userAddr);
          if (!signer) {
              alert(await COMMON.describeMissingSigner(userAddr, { subject: 'User' }));
              return;
          }

          depositBtn.disabled = true;
          depositBtn.textContent = 'Approving...';
          
          const poolId = pool?.params?.id;
          if (poolId === undefined || poolId === null) throw new Error('Pool id missing in deposit');
          const asset = pool?.params?.asset;
          const decimals = Number(pool?.params?.decimals);
          if (!Number.isFinite(decimals)) throw new Error('Pool decimals missing in deposit');
          
          const amountWei = ethers.utils.parseUnits(amount, decimals);
          
          // Approve
          // getErc20 falls back to provider, so pass signer explicitly
          const assetContract = new ethers.Contract(asset, [
              "function approve(address spender, uint256 amount) external returns (bool)"
          ], signer);

          const controller = await window.contracts.getController();
          const controllerAddr = controller.address;
          
          const approveTx = await assetContract.approve(controllerAddr, amountWei);
          depositBtn.textContent = 'Confirming Approve...';
          await approveTx.wait();
          
          // Deposit via router
          depositBtn.textContent = 'Depositing...';
          const router = await window.contracts.getRouter(signer); // Pass signer!
          // Correct signature: router.deposit(poolID, amount, false)
          const depositTx = await router.deposit(poolId, amountWei, false);
          depositBtn.textContent = 'Confirming...';
          await depositTx.wait();
          
          alert('Deposit successful!');
          await refreshData();
        } catch (e) {
          console.error('Deposit failed:', e);
          alert('Deposit failed: ' + e.message);
        } finally {
          depositBtn.disabled = false;
          depositBtn.textContent = 'Deposit';
        }
      });
    }
    
    if (withdrawBtn) {
      withdrawBtn.addEventListener('click', async () => {
        const amount = document.getElementById('withdraw-amount').value;
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
          alert('Please enter a valid Asset amount');
          return;
        }
        
        try {
          const userAddr = env.getAllParams().user;
          if (!userAddr) {
            alert('No user selected in environment');
            return;
          }

          const signer = await COMMON.resolveSigner(userAddr);
          if (!signer) {
              alert(await COMMON.describeMissingSigner(userAddr, { subject: 'User' }));
              return;
          }

          withdrawBtn.disabled = true;
          withdrawBtn.textContent = 'Approving...';
          
          const poolId = pool?.params?.id;
          if (poolId === undefined || poolId === null) throw new Error('Pool id missing in withdraw');
          const lpAddr = pool?.params?.lpAddr;
          const decimals = Number(pool?.params?.decimals);
          if (!Number.isFinite(decimals)) throw new Error('Pool decimals missing in withdraw');
          
          // Should be using convertToShares actually, but it will always be around 1:1 and 10x approve is enough for testing
          const approveAmountWei = ethers.utils.parseUnits(String(Number(amount)*10), decimals);
          const amountWei = ethers.utils.parseUnits(String(Number(amount)), decimals);
          
          // Approve LP token
          // getErc20 falls back to provider, so pass signer explicitly
          const lpContract = new ethers.Contract(lpAddr, [
              "function approve(address spender, uint256 amount) external returns (bool)"
          ], signer);

          const controller = await window.contracts.getController();
          const controllerAddr = controller.address;
          
          const approveTx = await lpContract.approve(controllerAddr, approveAmountWei);
          withdrawBtn.textContent = 'Confirming Approve...';
          await approveTx.wait();
          
          // Withdraw via router
          withdrawBtn.textContent = 'Withdrawing...';
          const router = await window.contracts.getRouter(signer); // Pass signer!
          // Correct signature: router.withdraw(poolID, amount, false)
          const withdrawTx = await router.withdraw(poolId, amountWei, false);
          withdrawBtn.textContent = 'Confirming...';
          await withdrawTx.wait();
          
          alert('Withdraw successful!');
          await refreshData();
        } catch (e) {
          console.error('Withdraw failed:', e);
          alert('Withdraw failed: ' + e.message);
        } finally {
          withdrawBtn.disabled = false;
          withdrawBtn.textContent = 'Withdraw';
        }
      });
    }
    
    if (adjustBtn) {
      adjustBtn.addEventListener('click', async () => {
        try {
          const userAddr = env.getAllParams().user;
          if (!userAddr) {
            alert('No user selected in environment');
            return;
          }

          const signer = await COMMON.resolveSigner(userAddr);
          if (!signer) {
              alert(await COMMON.describeMissingSigner(userAddr, { subject: 'User' }));
              return;
          }

          adjustBtn.disabled = true;
          adjustBtn.textContent = 'Preparing...';
          
          const poolId = pool?.params?.id;
          if (poolId === undefined || poolId === null) throw new Error('Pool id missing in adjust');
          const asset = pool?.params?.asset;
          const decimals = Number(pool?.params?.decimals);
          if (!Number.isFinite(decimals)) throw new Error('Pool decimals missing in adjust');
          const additionalAmount = document.getElementById('adjust-additional').value || '0';

          
          // Collect target allocations from VTP target inputs
          const vtps = Array.isArray(pool?.relatedVtps) ? pool.relatedVtps : [];
          const vtpTokens = [];
          
          // Helper to get current allocation
          const getCurrentAllocation = (vtpId) => {
             if (!state.userPoolsInfo) return ethers.BigNumber.from(0);
             const userPool = state.userPoolsInfo.find(p => p.poolID === poolId);
             if (!userPool || !userPool.userVtpTokens) return ethers.BigNumber.from(0);
             const userVtp = userPool.userVtpTokens.find(u => u.vtpID === vtpId);
             return userVtp ? userVtp.allocation : ethers.BigNumber.from(0);
          };

            for (const vtp of vtps) {
            const vtpId = vtp?.params?.id;
            if (vtpId == null) throw new Error('VTP id missing in adjust');
            
            const vtpIdNum = Number(vtpId);
            const currentAlloc = getCurrentAllocation(vtpIdNum);
            // Target inputs are synced between collapsed and expanded views
            const targetInput = document.getElementById(`target-expanded-${vtpId}`) || document.getElementById(`target-collapsed-${vtpId}`);
            let targetValBN = ethers.BigNumber.from(0);

            // Only use input value if valid
            if (targetInput && targetInput.value.trim() !== '') {
              const val = Number(targetInput.value);
              if (!isNaN(val)) {
                targetValBN = ethers.utils.parseUnits(String(val), decimals);
              }
            }
            
            // Include if Current > 0 OR Target > 0
            if (currentAlloc.gt(0) || targetValBN.gt(0)) {
              vtpTokens.push({
                vtpID: vtpIdNum,
                targetAllocation: targetValBN,
                maxFeeRate: ethers.utils.parseUnits('1.0', 18),
              });
            }
            }
          
          
          const additionalWei = ethers.utils.parseUnits(additionalAmount, decimals);
          
          // Approve additional asset if > 0
          if (Number(additionalAmount) > 0) {
            adjustBtn.textContent = 'Approving...';
            // getErc20 falls back to provider, so pass signer explicitly
            const assetContract = new ethers.Contract(asset, [
                "function approve(address spender, uint256 amount) external returns (bool)"
            ], signer);

            const controller = await window.contracts.getController();
            const controllerAddr = controller.address;
            
            const approveTx = await assetContract.approve(controllerAddr, additionalWei);
            adjustBtn.textContent = 'Confirming Approve...';
            await approveTx.wait();
          }
          
          // Adjust position via router
          const router = await window.contracts.getRouter(signer);
          const controllerRead = await window.contracts.getController();
          if (!controllerRead) throw new Error('controller not configured');
          const allocatedVtps = await controllerRead.userAllocatedVtps(env.getAllParams().user, Number(poolId) || 0);
          const existingIds = new Set(vtpTokens.map((item) => String(item.vtpID)));
          for (const allocatedIdRaw of allocatedVtps || []) {
            const allocatedId = Number(allocatedIdRaw?.toString?.() ?? allocatedIdRaw);
            if (existingIds.has(String(allocatedId))) continue;
            vtpTokens.push({
              vtpID: allocatedId,
              targetAllocation: ethers.constants.Zero,
              maxFeeRate: ethers.utils.parseUnits('1.0', 18),
            });
            existingIds.add(String(allocatedId));
          }
          
          // Create input struct matching AdjustPositionInput
          const inputStruct = {
            poolID: Number(poolId) || 0,
            depositAmount: additionalWei,
            vtpTokens: vtpTokens
          };
          
          
          // Build price verification payload similar to swap and user.js
          // Collect all tokens that need price verification from the actual VTPs included in inputStruct.
          const tokenSet = new Set();
          if (asset) tokenSet.add(asset);
          for (const item of vtpTokens) {
            const vtpData = await controllerRead.getVtp(item.vtpID);
            const t0 = vtpData?.token0?.params?.asset || vtpData?.token0?.asset;
            const t1 = vtpData?.token1?.params?.asset || vtpData?.token1?.asset;
            if (t0) tokenSet.add(t0);
            if (t1) tokenSet.add(t1);
          }
          
          let encoded = '0x';
          try {
            if (window.buildPriceProviderVerificationPayload) {
              encoded = await window.buildPriceProviderVerificationPayload(Array.from(tokenSet));
            } else {
              console.warn('buildPriceProviderVerificationPayload not loaded, using 0x');
            }
          } catch (e) {
            console.warn('Failed to build price verification payload, using 0x', e);
          }
          
          // Correct signature: router.adjustPosition(inputStruct, encoded)
          adjustBtn.textContent = 'Adjusting...';
          const adjustTx = await router.adjustPosition(inputStruct, encoded);
          adjustBtn.textContent = 'Confirming...';
          await adjustTx.wait();
          
          alert('Position adjusted successfully!');
          await refreshData();
        } catch (e) {
          console.error('Adjust position failed:', e);
          alert('Adjust position failed: ' + e.message);
        } finally {
          adjustBtn.disabled = false;
          adjustBtn.textContent = 'Adjust Position';
        }
      });
    }
  }

  async function renderVtpActions(container, vtp) {
    // VtpToken incentive management - placeholder
    const incentiveGroup = document.createElement('div');
    incentiveGroup.className = 'action-group placeholder';
    incentiveGroup.innerHTML = `
      <div class="action-group-title">🚧 VtpToken Incentive Management</div>
      <div style="font-size: 12px; color: #6b7280;">Coming soon...</div>
    `;
    container.appendChild(incentiveGroup);
    
    // (Un)pause VtpToken - placeholder
    const pauseGroup = document.createElement('div');
    pauseGroup.className = 'action-group placeholder';
    pauseGroup.innerHTML = `
      <div class="action-group-title">🚧 (Un)pause VtpToken</div>
      <div style="font-size: 12px; color: #6b7280;">Coming soon...</div>
    `;
    container.appendChild(pauseGroup);
  }

  // ========== Event Handlers ==========
  
  function setupEventHandlers() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
        await refreshData(true); // Preserve selection
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      });
    }
    
    // Create Pool button
    const createPoolBtn = document.getElementById('create-pool-btn');
    if (createPoolBtn) {
      createPoolBtn.addEventListener('click', async () => {
        await showCreatePoolForm();
      });
    }
    
    // Create VTP button
    const createVtpBtn = document.getElementById('create-vtp-btn');
    if (createVtpBtn) {
      createVtpBtn.addEventListener('click', async () => {
        await showCreateVtpForm();
      });
    }
    
    // Modify Risk button
    const modifyRiskBtn = document.getElementById('modify-risk-btn');
    if (modifyRiskBtn) {
      modifyRiskBtn.addEventListener('click', async () => {
        await showModifyRiskForm();
      });
    }
    
    // Search input
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value;
        renderFilterList();
      }, 300);
    });
  }

  // ========== Initialization ==========
  
  /**
   * Initialize the page logic.
   * Sets up event handlers, loads initial data, and renders the UI.
   * Listens for 'pool:refresh' and 'vtp:refresh' events to update data.
   */
  async function init() {
    
    const filterList = document.getElementById('filter-list');
    if (filterList) filterList.innerHTML = '<div style="padding: 20px; text-align: center;">Loading pools...</div>';
    setGlobalLoading(true, 'Loading pools...');

    setupEventHandlers();
    
    await loadData();
    
    // Initial render
    await renderFilterList();
    await renderDetails();
    await renderRelated();
    await renderActions();
    state.isLoading = false;
    
    // Listen for data refresh events
    document.addEventListener('pool:refresh', async () => {
      await refreshData(true); // Preserve selection
    });
    
    document.addEventListener('vtp:refresh', async () => {
      await refreshData(true); // Preserve selection
    });
    
  }

  // Start initialization
  init().catch(err => {
    console.error('[Pools & Vtps] Initialization failed:', err);
  });

})();
