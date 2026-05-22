(function () {
  if (typeof window === 'undefined') return;

  const COMMON = window.stapleCommon;
  const ZERO_ADDRESS = ethers.constants.AddressZero;
  const HASH_ZERO = ethers.constants.HashZero;
  const EXIT_TYPE_FLASH_LOAN = 1;
  const EXIT_TYPE_NON_FLASH_LOAN = 2;
  const JR_ROWS_CHUNK_SIZE = 4;
  const IMPERSONATE_BALANCE = ethers.utils.parseEther('100').toHexString();

  const FAKE_ORACLE_ABI = [
    'function getPrice(address) view returns (uint256)',
    'function owner() view returns (address)',
    'function setPrice(address,uint256)'
  ];

  const FACTORY_ABI = jrPricingFactoryAbi;
  const ORACLE_ABI = jrPricingOracleAbi;

  const state = {
    activeTab: 'token-list',
    rows: [],
    oracles: [],
    extraOracles: [],
    factoryActor: ZERO_ADDRESS,
    modal: {
      type: null,
      rowIndex: -1,
      oracleIndex: -1
    }
  };

  function escapeHtml(value) {
    if (COMMON?.escapeHtml) return COMMON.escapeHtml(value);
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function provider() {
    return COMMON.getRpcProvider();
  }

  function currentEnv() {
    return window.environment?.getAllParams?.() || {};
  }

  function getEnvAddress(...keys) {
    const env = currentEnv();
    for (const key of keys) {
      const value = env?.[key];
      if (COMMON.isAddress(value)) return ethers.utils.getAddress(value);
    }
    return '';
  }

  function getFactoryAddress() {
    return getEnvAddress('jrPricingFactory');
  }

  function getPrincipalConverterSplitAddress() {
    return getEnvAddress('bondifyPrincipalConverterSplit');
  }

  function getAavePrincipalConverterAddress() {
    return getEnvAddress('bondifyAavePrincipalConverter');
  }

  function getMorphoPrincipalConverterAddress() {
    return getEnvAddress('bondifyMorphoPrincipalConverter');
  }

  function addressOrZero(value) {
    return COMMON.isAddress(value) ? ethers.utils.getAddress(value) : ZERO_ADDRESS;
  }

  function getFactory(address) {
    return new ethers.Contract(address, FACTORY_ABI, provider());
  }

  function getOracle(address, signerOrProvider = provider()) {
    return new ethers.Contract(address, ORACLE_ABI, signerOrProvider);
  }

  function shortAddress(addr) {
    if (!addr || addr === ZERO_ADDRESS) return '-';
    return COMMON.shortenAddress ? COMMON.shortenAddress(addr, 4, 4) : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function explorerHtml(addr) {
    if (!COMMON.isAddress(addr)) return '-';
    const env = currentEnv();
    const link = COMMON.getExplorerLink ? COMMON.getExplorerLink(env.chainID, addr) : null;
    const label = shortAddress(addr);
    if (!link) return `<span class="mono">${label}</span>`;
    return `<a class="explorer-link mono" href="${link}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  }

  function copyButton(addr) {
    if (!COMMON.isAddress(addr)) return '';
    return `<button class="mini-copy" data-copy-address="${addr}" title="Copy address">📋</button>`;
  }

  function formatRate(value) {
    return `${(Number(value || 0) / 10000).toFixed(4)}%`;
  }

  function formatSignedRate(value) {
    const num = Number(value || 0);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${(num / 10000).toFixed(4)}%`;
  }

  function formatWad(value) {
    return COMMON.formatNumber(ethers.utils.formatUnits(value || 0, 18), 6);
  }

  function formatRatio(value) {
    return `${COMMON.formatNumber(ethers.utils.formatUnits(value || 0, 16), 2)}%`;
  }

  function formatBondifySourceType(value) {
    const num = Number(value || 0);
    if (num === 1) return 'SLF / PCS';
    if (num === 2) return 'Aave';
    if (num === 3) return 'Morpho';
    return '-';
  }

  function formatBondifyConfigId(value, sourceType) {
    try {
      if (value == null) return '-';
      const bn = ethers.BigNumber.from(value);
      if (Number(sourceType) === 2 || Number(sourceType) === 3) {
        const hex = ethers.utils.hexZeroPad(bn.toHexString(), 32);
        return `${hex.slice(0, 10)}...${hex.slice(-8)}`;
      }
      return bn.toString();
    } catch {
      return String(value ?? '-');
    }
  }

  function formatDiscountRatio(spotPrice, exitPrice) {
    try {
      const spot = ethers.BigNumber.from(spotPrice || 0);
      const exit = ethers.BigNumber.from(exitPrice || 0);
      if (spot.isZero()) return '-';
      const negative = exit.gt(spot);
      const diff = negative ? exit.sub(spot) : spot.sub(exit);
      const ratio = diff.mul(1000000).div(spot);
      const prefix = negative ? '-' : '';
      return `${prefix}${(Number(ratio.toString()) / 10000).toFixed(4)}%`;
    } catch {
      return '-';
    }
  }

  function exitTypeLabel(type) {
    if (Number(type) === EXIT_TYPE_FLASH_LOAN) return '1 · Flash Loan';
    if (Number(type) === EXIT_TYPE_NON_FLASH_LOAN) return '2 · Non-Flash Loan';
    return `Invalid (${type ?? '-'})`;
  }

  function formatDaysFromSeconds(value) {
    const days = Number(value || 0) / 86400;
    return `${days.toFixed(days % 1 === 0 ? 2 : 2)}d`;
  }

  function daysToSeconds(value) {
    return Math.round(Number(String(value || '0').trim() || '0') * 86400);
  }

  function formatAddressOrDash(addr) {
    return COMMON.isAddress(addr) && addr !== ZERO_ADDRESS ? shortAddress(addr) : '-';
  }

  function emptyNonFlashParams() {
    return {
      waitTime: 0,
      borrowRate: 0,
      borrowRateStrategy: ZERO_ADDRESS,
      riskFreeRate: 0,
      waitingPeriodRisk: 0
    };
  }

  function cloneNonFlashParams(params) {
    if (!params) return emptyNonFlashParams();
    return {
      waitTime: Number(params.waitTime || 0),
      borrowRate: Number(params.borrowRate || 0),
      borrowRateStrategy: params.borrowRateStrategy || ZERO_ADDRESS,
      riskFreeRate: Number(params.riskFreeRate || 0),
      waitingPeriodRisk: Number(params.waitingPeriodRisk || 0)
    };
  }

  function wadRatioToPercentString(value) {
    return ethers.utils.formatUnits(value || 0, 16);
  }

  function rateToPercentString(value) {
    return (Number(value || 0) / 10000).toString();
  }

  function signedRateToPercentString(value) {
    return (Number(value || 0) / 10000).toString();
  }

  function percentToWadRatio(value) {
    return ethers.utils.parseUnits(String(value || '0').trim() || '0', 16);
  }

  function percentToRate(value) {
    return Math.round(Number(String(value || '0').trim() || '0') * 10000);
  }

  function isAnvilError(error) {
    const message = error?.message || String(error);
    return /anvil_|method not found|does not exist|not supported/i.test(message);
  }

  async function callContract(contract, method, args = []) {
    if (window.RpcManager) return window.RpcManager.call(contract, method, args);
    return contract[method](...args);
  }

  async function readSymbol(address) {
    try {
      const token = new ethers.Contract(address, erc20MetadataAbi, provider());
      return await callContract(token, 'symbol');
    } catch {
      return 'UNKNOWN';
    }
  }

  async function readExitPrice(oracle, jrToken, supportedExitTypes) {
    const exitType = Number(supportedExitTypes);
    if (exitType === EXIT_TYPE_FLASH_LOAN || exitType === EXIT_TYPE_NON_FLASH_LOAN) {
      return callContract(oracle, 'getExitPrice', [jrToken, exitType]);
    }

    try {
      return await callContract(oracle, 'getExitPrice', [jrToken, EXIT_TYPE_NON_FLASH_LOAN]);
    } catch {
      return callContract(oracle, 'getExitPrice', [jrToken, EXIT_TYPE_FLASH_LOAN]);
    }
  }

  function setStatus(message, type = 'info') {
    const el = document.getElementById('jr-status');
    if (!el) return;
    el.textContent = message;
    el.className = `status-banner ${type}`;
  }

  function setTableLoading(message = 'Loading...') {
    const tbody = document.getElementById('jr-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="placeholder">${escapeHtml(message)}</td></tr>`;
  }

  function setOracleLoading(message = 'Loading...') {
    const tbody = document.getElementById('oracle-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="placeholder">${escapeHtml(message)}</td></tr>`;
  }

  function buildLoadingRows(jrTokens) {
    return jrTokens.map((jrToken) => ({
      jrToken,
      symbol: 'Loading...',
      loading: true
    }));
  }

  function renderRows(rows) {
    const tbody = document.getElementById('jr-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="placeholder">No JR tokens found in the configured factory</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((row, index) => {
      if (row.loading) {
        return `
          <tr>
            <td class="identity-cell">
              <div class="identity-symbol">${escapeHtml(row.symbol || 'Loading...')}</div>
              <div class="identity-address">${explorerHtml(row.jrToken)} ${copyButton(row.jrToken)}</div>
            </td>
            <td colspan="5"><span class="error-text">Loading segment...</span></td>
          </tr>
        `;
      }

      if (row.error) {
        return `
          <tr>
            <td class="identity-cell">
              <div class="identity-symbol">${escapeHtml(row.symbol || '-')}</div>
              <div class="identity-address">${explorerHtml(row.jrToken)} ${copyButton(row.jrToken)}</div>
            </td>
            <td colspan="5"><span class="error-text">${escapeHtml(row.error)}</span></td>
          </tr>
        `;
      }

      return `
        <tr>
          <td class="identity-cell">
            <div class="identity-symbol">${escapeHtml(row.symbol || '-')}</div>
            <div class="identity-address">${explorerHtml(row.jrToken)} ${copyButton(row.jrToken)}</div>
          </td>
          <td>
            <div class="info-stack">
              <div class="info-row">
                <span class="info-label">Oracle</span>
                <span class="info-value">${explorerHtml(row.oracle)} ${copyButton(row.oracle)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Collateral</span>
                <span class="info-value">${explorerHtml(row.collateralToken)} ${copyButton(row.collateralToken)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Lending</span>
                <span class="info-value">${explorerHtml(row.lendingToken)} ${copyButton(row.lendingToken)}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="metric-stack">
              <div class="metric-row">
                <span class="metric-label">Preview NAV Spot</span>
                <span class="metric-value">${formatWad(row.spotPrice)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Discount Ratio</span>
                <span class="metric-value">${formatDiscountRatio(row.spotPrice, row.exitPrice)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Adjusted Exit Price</span>
                <span class="metric-value">${formatWad(row.exitPrice)}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="metric-stack">
              <div class="metric-row">
                <span class="metric-label">Supported Exit Type</span>
                <span class="metric-value"><span class="exit-chip">${escapeHtml(exitTypeLabel(row.supportedExitTypes))}</span></span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Bondify Source</span>
                <span class="metric-value">${formatBondifySourceType(row.bondifySourceType)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Bondify Config ID</span>
                <span class="metric-value mono">${escapeHtml(formatBondifyConfigId(row.bondifyConfigId, row.bondifySourceType))}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Bondify Fake Oracle</span>
                <span class="metric-value ${row.bondifyOracleDetected ? '' : 'metric-value-fit metric-value-muted'}">${row.bondifyOracleDetected ? formatWad(row.bondifyOraclePrice) : 'Bondify Not Detected'}</span>
              </div>
            </div>
            <div class="cell-actions">
              <button class="mini-btn" data-action="edit-token-config" data-index="${index}">Edit</button>
            </div>
          </td>
          <td>
            <div class="metric-stack">
              <div class="metric-row">
                <span class="metric-label">Flash Loan Fee</span>
                <span class="metric-value">${formatRate(row.flashLoanFeeRate)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Slippage</span>
                <span class="metric-value">${formatRate(row.slippage)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Market Adjustment</span>
                <span class="metric-value">${formatSignedRate(row.marketAdjustment)}</span>
              </div>
            </div>
            <div class="cell-actions">
              <button class="mini-btn" data-action="edit-oracle-rates" data-index="${index}">Edit</button>
            </div>
          </td>
          <td>
            <div class="metric-stack">
              <div class="metric-row">
                <span class="metric-label">Wait Time</span>
                <span class="metric-value">${formatDaysFromSeconds(row.nonFlashLoanParams.waitTime)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Borrow Rate</span>
                <span class="metric-value">${formatRate(row.nonFlashLoanParams.borrowRate)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Risk Free Rate</span>
                <span class="metric-value">${formatRate(row.nonFlashLoanParams.riskFreeRate)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Waiting Period Risk</span>
                <span class="metric-value">${formatRate(row.nonFlashLoanParams.waitingPeriodRisk)}</span>
              </div>
              <div class="metric-row">
                <span class="metric-label">Borrow Rate Strategy</span>
                <span class="metric-value mono">${formatAddressOrDash(row.nonFlashLoanParams.borrowRateStrategy)}</span>
              </div>
            </div>
            <div class="cell-actions">
              <button class="mini-btn" data-action="edit-nonflash" data-index="${index}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function deriveOracleRows(tokenRows) {
    const grouped = new Map();
    tokenRows.forEach((row) => {
      if (!row || row.loading || row.error || !COMMON.isAddress(row.oracle)) return;
      const key = row.oracle.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, {
          oracle: row.oracle,
          operator: row.operator,
          collateralToken: row.collateralToken,
          lendingToken: row.lendingToken,
          flashLoanFeeRate: row.flashLoanFeeRate,
          slippage: row.slippage,
          nonFlashLoanParams: cloneNonFlashParams(row.nonFlashLoanParams),
          tokenSymbols: []
        });
      }
      grouped.get(key).tokenSymbols.push(row.symbol || shortAddress(row.jrToken));
    });

    const rows = [...grouped.values()].map((row) => ({
      ...row,
      tokenCount: row.tokenSymbols.length
    }));

    state.extraOracles.forEach((row) => {
      const key = String(row.oracle).toLowerCase();
      if (!grouped.has(key)) rows.push(row);
    });

    return rows;
  }

  function renderOracleRows(rows) {
    const tbody = document.getElementById('oracle-tbody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="placeholder">No oracle rows available</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td>
          <div class="info-stack">
            <div class="info-row">
              <span class="info-label">Oracle</span>
              <span class="info-value">${explorerHtml(row.oracle)} ${copyButton(row.oracle)}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="info-stack">
            <div class="info-row">
              <span class="info-label">Collateral</span>
              <span class="info-value">${explorerHtml(row.collateralToken)} ${copyButton(row.collateralToken)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Lending</span>
              <span class="info-value">${explorerHtml(row.lendingToken)} ${copyButton(row.lendingToken)}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="metric-stack">
            <div class="metric-row">
              <span class="metric-label">Flash Loan Fee</span>
              <span class="metric-value">${formatRate(row.flashLoanFeeRate)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Slippage</span>
              <span class="metric-value">${formatRate(row.slippage)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Wait Time</span>
              <span class="metric-value">${formatDaysFromSeconds(row.nonFlashLoanParams.waitTime)}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="oracle-token-list">
            ${(row.tokenSymbols || []).length
              ? row.tokenSymbols.map((symbol) => `<span class="oracle-token-chip">${escapeHtml(symbol)}</span>`).join('')
              : '<span class="metric-value">No JR token registered yet</span>'}
          </div>
        </td>
        <td>
          <button class="mini-btn" data-action="register-jr" data-oracle-index="${index}">Create JR</button>
        </td>
      </tr>
    `).join('');
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('tab-token-list')?.classList.toggle('hidden', tab !== 'token-list');
    document.getElementById('tab-oracle-management')?.classList.toggle('hidden', tab !== 'oracle-management');
  }

  function applyEnvironmentCapabilities() {
    const env = currentEnv();
    const hasJrPricing = env.hasJrPricing === true;
    const hasBondify = env.hasBondify === true;
    const createOracleBtn = document.getElementById('btn-create-oracle');

    if (createOracleBtn) {
      const disabled = !hasJrPricing || !hasBondify;
      createOracleBtn.disabled = disabled;
      createOracleBtn.title = disabled
        ? (!hasJrPricing ? 'JR Pricing factory is not configured for the current environment' : 'Bondify principal converters are not fully configured for the current environment')
        : '';
    }
  }

  async function getPrivilegedActorAddress(contract) {
    try {
      const role = await callContract(contract, 'OPERATOR_ROLE');
      const count = await callContract(contract, 'getRoleMemberCount', [role]);
      if (Number(count || 0) > 0) {
        return await callContract(contract, 'getRoleMember', [role, 0]);
      }
    } catch {}

    try {
      const count = await callContract(contract, 'getRoleMemberCount', [HASH_ZERO]);
      if (Number(count || 0) > 0) {
        return await callContract(contract, 'getRoleMember', [HASH_ZERO, 0]);
      }
    } catch {}

    return ZERO_ADDRESS;
  }

  async function multicallOrFallback(calls) {
    if (!calls.length) return [];

    if (window.RpcManager?.multicall) {
      return window.RpcManager.multicall(calls);
    }

    return Promise.all(calls.map(async (call) => {
      try {
        const contract = new ethers.Contract(call.target, call.abi, provider());
        const result = await contract[call.method](...(call.params || []));
        return result;
      } catch (error) {
        if (call.allowFailure) return null;
        throw error;
      }
    }));
  }

  async function loadRow(factory, jrTokenInput) {
    const jrToken = ethers.utils.getAddress(jrTokenInput);

    try {
      const oracleAddr = await callContract(factory, 'getOracle', [jrToken]);
      const oracle = getOracle(oracleAddr);
      const [
        symbol,
        cfg,
        oracleCfg,
        slippage,
        borrowRate,
        nonFlashLoanParams,
        spotPrice,
        operator
      ] = await Promise.all([
        readSymbol(jrToken),
        callContract(oracle, 'getJrTokenConfig', [jrToken]),
        callContract(oracle, 'getConfig'),
        callContract(oracle, 'getSlippage'),
        callContract(oracle, 'getBorrowRate', [jrToken]),
        callContract(oracle, 'getNonFlashLoanParams', [jrToken]),
        callContract(oracle, 'getSpotPrice', [jrToken]),
        getPrivilegedActorAddress(oracle)
      ]);

      const exitPrice = await readExitPrice(oracle, jrToken, cfg.supportedExitTypes);

      return {
        jrToken,
        symbol,
        oracle: ethers.utils.getAddress(oracleAddr),
        operator: COMMON.isAddress(operator) ? ethers.utils.getAddress(operator) : ZERO_ADDRESS,
        collateralToken: oracleCfg.collateralToken,
        lendingToken: oracleCfg.lendingToken,
        principalConverterSplit: oracleCfg.principalConverterSplit,
        aavePrincipalConverter: oracleCfg.aavePrincipalConverter,
        supportedExitTypes: cfg.supportedExitTypes,
        bondifySourceType: cfg.bondifySourceType,
        bondifyConfigId: cfg.bondifyConfigId,
        marketAdjustment: cfg.marketAdjustment,
        hasCustomParams: !!cfg.hasCustomParams,
        customParams: cloneNonFlashParams(cfg.customParams),
        flashLoanFeeRate: oracleCfg.flashLoanFeeRate,
        slippage,
        borrowRate,
        nonFlashLoanParams: cloneNonFlashParams(nonFlashLoanParams),
        spotPrice,
        exitPrice
      };
    } catch (error) {
      return {
        jrToken,
        symbol: await readSymbol(jrToken),
        error: error?.message || String(error)
      };
    }
  }

  async function loadRowsForTokens(factoryAddress, jrTokens) {
    if (!jrTokens.length) {
      return [];
    }

    const [symbols, oracleAddrsRaw] = await Promise.all([
      multicallOrFallback(
        jrTokens.map((jrToken) => ({
          target: jrToken,
          abi: erc20MetadataAbi,
          method: 'symbol',
          params: [],
          allowFailure: true
        }))
      ),
      multicallOrFallback(
        jrTokens.map((jrToken) => ({
          target: factoryAddress,
          abi: FACTORY_ABI,
          method: 'getOracle',
          params: [jrToken],
          allowFailure: true
        }))
      )
    ]);

    const oracleAddrs = oracleAddrsRaw.map((addr) => (COMMON.isAddress(addr) ? ethers.utils.getAddress(addr) : ZERO_ADDRESS));
    const uniqueOracles = [...new Set(oracleAddrs.filter((addr) => COMMON.isAddress(addr) && addr !== ZERO_ADDRESS))];

    const oracleInfoResults = await multicallOrFallback(
      uniqueOracles.flatMap((oracleAddr) => [
        { target: oracleAddr, abi: ORACLE_ABI, method: 'getConfig', params: [], allowFailure: true },
        { target: oracleAddr, abi: ORACLE_ABI, method: 'getSlippage', params: [], allowFailure: true },
        { target: oracleAddr, abi: ORACLE_ABI, method: 'OPERATOR_ROLE', params: [], allowFailure: true }
      ])
    );

    const oracleInfoMap = new Map();
    let oracleInfoIdx = 0;
    uniqueOracles.forEach((oracleAddr) => {
      oracleInfoMap.set(oracleAddr, {
        config: oracleInfoResults[oracleInfoIdx++],
        slippage: oracleInfoResults[oracleInfoIdx++],
        role: oracleInfoResults[oracleInfoIdx++]
      });
    });

    const uniqueFakeOracles = [...new Set(
      uniqueOracles
        .map((oracleAddr) => oracleInfoMap.get(oracleAddr)?.config?.spotOracle)
        .filter((addr) => COMMON.isAddress(addr) && addr !== ZERO_ADDRESS)
        .map((addr) => ethers.utils.getAddress(addr))
    )];

    const fakeOracleOwnerResults = await multicallOrFallback(
      uniqueFakeOracles.map((fakeOracleAddr) => ({
        target: fakeOracleAddr,
        abi: FAKE_ORACLE_ABI,
        method: 'owner',
        params: [],
        allowFailure: true
      }))
    );
    const fakeOracleOwnerMap = new Map();
    uniqueFakeOracles.forEach((fakeOracleAddr, index) => {
      const owner = fakeOracleOwnerResults[index];
      fakeOracleOwnerMap.set(fakeOracleAddr, COMMON.isAddress(owner) ? ethers.utils.getAddress(owner) : ZERO_ADDRESS);
    });

    const tokenLevelResults = await multicallOrFallback(
      jrTokens.flatMap((jrToken, index) => {
        const oracleAddr = oracleAddrs[index];
        if (!COMMON.isAddress(oracleAddr) || oracleAddr === ZERO_ADDRESS) return [];
        const oracleCfg = oracleInfoMap.get(oracleAddr)?.config;
        const fakeOracleAddr = COMMON.isAddress(oracleCfg?.spotOracle) ? ethers.utils.getAddress(oracleCfg.spotOracle) : ZERO_ADDRESS;
        const calls = [
          { target: oracleAddr, abi: ORACLE_ABI, method: 'getJrTokenConfig', params: [jrToken], allowFailure: true },
          { target: oracleAddr, abi: ORACLE_ABI, method: 'getBorrowRate', params: [jrToken], allowFailure: true },
          { target: oracleAddr, abi: ORACLE_ABI, method: 'getNonFlashLoanParams', params: [jrToken], allowFailure: true },
          { target: oracleAddr, abi: ORACLE_ABI, method: 'getSpotPrice', params: [jrToken], allowFailure: true }
        ];
        if (fakeOracleAddr !== ZERO_ADDRESS && COMMON.isAddress(oracleCfg?.collateralToken)) {
          calls.push({
            target: fakeOracleAddr,
            abi: FAKE_ORACLE_ABI,
            method: 'getPrice',
            params: [oracleCfg.collateralToken],
            allowFailure: true
          });
        }
        return calls;
      })
    );

    const tokenLevelMap = new Map();
    let tokenLevelIdx = 0;
    jrTokens.forEach((jrToken, index) => {
      const oracleAddr = oracleAddrs[index];
      if (!COMMON.isAddress(oracleAddr) || oracleAddr === ZERO_ADDRESS) return;
      const oracleCfg = oracleInfoMap.get(oracleAddr)?.config;
      const fakeOracleAddr = COMMON.isAddress(oracleCfg?.spotOracle) ? ethers.utils.getAddress(oracleCfg.spotOracle) : ZERO_ADDRESS;
      tokenLevelMap.set(jrToken, {
        config: tokenLevelResults[tokenLevelIdx++],
        borrowRate: tokenLevelResults[tokenLevelIdx++],
        nonFlashLoanParams: tokenLevelResults[tokenLevelIdx++],
        spotPrice: tokenLevelResults[tokenLevelIdx++],
        bondifyOraclePrice: fakeOracleAddr !== ZERO_ADDRESS && COMMON.isAddress(oracleCfg?.collateralToken)
          ? tokenLevelResults[tokenLevelIdx++]
          : null
      });
    });

    const operatorCountResults = await multicallOrFallback(
      uniqueOracles
        .filter((oracleAddr) => oracleInfoMap.get(oracleAddr)?.role)
        .map((oracleAddr) => ({
          target: oracleAddr,
          abi: ORACLE_ABI,
          method: 'getRoleMemberCount',
          params: [oracleInfoMap.get(oracleAddr).role],
          allowFailure: true
        }))
    );

    const operatorMap = new Map();
    let operatorCountIdx = 0;
    const fallbackAdminOracles = [];
    const operatorMemberCalls = [];
    uniqueOracles.forEach((oracleAddr) => {
      const info = oracleInfoMap.get(oracleAddr);
      if (!info?.role) {
        fallbackAdminOracles.push(oracleAddr);
        return;
      }
      const count = operatorCountResults[operatorCountIdx++];
      if (count && Number(count) > 0) {
        operatorMemberCalls.push({
          oracleAddr,
          call: {
            target: oracleAddr,
            abi: ORACLE_ABI,
            method: 'getRoleMember',
            params: [info.role, 0],
            allowFailure: true
          }
        });
      } else {
        fallbackAdminOracles.push(oracleAddr);
      }
    });

    const operatorMembers = await multicallOrFallback(operatorMemberCalls.map((item) => item.call));
    operatorMemberCalls.forEach((item, index) => {
      const member = operatorMembers[index];
      operatorMap.set(item.oracleAddr, COMMON.isAddress(member) ? ethers.utils.getAddress(member) : ZERO_ADDRESS);
    });

    if (fallbackAdminOracles.length) {
      const adminCounts = await multicallOrFallback(
        fallbackAdminOracles.map((oracleAddr) => ({
          target: oracleAddr,
          abi: ORACLE_ABI,
          method: 'getRoleMemberCount',
          params: [HASH_ZERO],
          allowFailure: true
        }))
      );
      const adminMemberCalls = [];
      fallbackAdminOracles.forEach((oracleAddr, index) => {
        if (adminCounts[index] && Number(adminCounts[index]) > 0) {
          adminMemberCalls.push({
            oracleAddr,
            call: {
              target: oracleAddr,
              abi: ORACLE_ABI,
              method: 'getRoleMember',
              params: [HASH_ZERO, 0],
              allowFailure: true
            }
          });
        } else {
          operatorMap.set(oracleAddr, ZERO_ADDRESS);
        }
      });
      const adminMembers = await multicallOrFallback(adminMemberCalls.map((item) => item.call));
      adminMemberCalls.forEach((item, index) => {
        const member = adminMembers[index];
        operatorMap.set(item.oracleAddr, COMMON.isAddress(member) ? ethers.utils.getAddress(member) : ZERO_ADDRESS);
      });
    }

    const primaryExitCalls = jrTokens.flatMap((jrToken, index) => {
      const oracleAddr = oracleAddrs[index];
      const tokenInfo = tokenLevelMap.get(jrToken);
      if (!COMMON.isAddress(oracleAddr) || oracleAddr === ZERO_ADDRESS || !tokenInfo?.config) return [];
      const exitType = [EXIT_TYPE_FLASH_LOAN, EXIT_TYPE_NON_FLASH_LOAN].includes(Number(tokenInfo.config.supportedExitTypes))
        ? Number(tokenInfo.config.supportedExitTypes)
        : EXIT_TYPE_NON_FLASH_LOAN;
      return [{
        target: oracleAddr,
        abi: ORACLE_ABI,
        method: 'getExitPrice',
        params: [jrToken, exitType],
        allowFailure: true
      }];
    });

    const primaryExitResults = await multicallOrFallback(primaryExitCalls);
    const exitPriceMap = new Map();
    let primaryExitIdx = 0;
    const fallbackExitCalls = [];
    jrTokens.forEach((jrToken, index) => {
      const oracleAddr = oracleAddrs[index];
      const tokenInfo = tokenLevelMap.get(jrToken);
      if (!COMMON.isAddress(oracleAddr) || oracleAddr === ZERO_ADDRESS || !tokenInfo?.config) return;
      const primaryResult = primaryExitResults[primaryExitIdx++];
      if (primaryResult != null) {
        exitPriceMap.set(jrToken, primaryResult);
        return;
      }
      fallbackExitCalls.push({
        jrToken,
        call: {
          target: oracleAddr,
          abi: ORACLE_ABI,
          method: 'getExitPrice',
          params: [jrToken, EXIT_TYPE_FLASH_LOAN],
          allowFailure: true
        }
      });
    });

    const fallbackExitResults = await multicallOrFallback(fallbackExitCalls.map((item) => item.call));
    fallbackExitCalls.forEach((item, index) => {
      exitPriceMap.set(item.jrToken, fallbackExitResults[index]);
    });

    return jrTokens.map((jrToken, index) => {
      const symbol = symbols[index] || 'UNKNOWN';
      const oracleAddr = oracleAddrs[index];
      const oracleInfo = oracleInfoMap.get(oracleAddr);
      const tokenInfo = tokenLevelMap.get(jrToken);

      if (!COMMON.isAddress(oracleAddr) || oracleAddr === ZERO_ADDRESS) {
        return { jrToken, symbol, error: 'Oracle not found for JR token' };
      }
      const exitPrice = exitPriceMap.get(jrToken);
      if (!oracleInfo?.config || oracleInfo.slippage == null || !tokenInfo?.config || !tokenInfo.nonFlashLoanParams || tokenInfo.borrowRate == null || tokenInfo.spotPrice == null || exitPrice == null) {
        return { jrToken, symbol, error: 'Failed to load oracle state' };
      }

      return {
        jrToken,
        symbol,
        oracle: oracleAddr,
        operator: operatorMap.get(oracleAddr) || ZERO_ADDRESS,
        collateralToken: oracleInfo.config.collateralToken,
        lendingToken: oracleInfo.config.lendingToken,
        principalConverterSplit: oracleInfo.config.principalConverterSplit,
        aavePrincipalConverter: oracleInfo.config.aavePrincipalConverter,
        fakeOracle: oracleInfo.config.spotOracle,
        fakeOracleOwner: fakeOracleOwnerMap.get(oracleInfo.config.spotOracle) || ZERO_ADDRESS,
        bondifyOracleDetected: tokenInfo.bondifyOraclePrice != null,
        bondifyOracleSettable:
          tokenInfo.bondifyOraclePrice != null
          && COMMON.isAddress(oracleInfo.config.spotOracle)
          && (fakeOracleOwnerMap.get(oracleInfo.config.spotOracle) || ZERO_ADDRESS) !== ZERO_ADDRESS,
        bondifyOraclePrice: tokenInfo.bondifyOraclePrice || 0,
        supportedExitTypes: tokenInfo.config.supportedExitTypes,
        bondifySourceType: tokenInfo.config.bondifySourceType,
        bondifyConfigId: tokenInfo.config.bondifyConfigId,
        marketAdjustment: tokenInfo.config.marketAdjustment,
        hasCustomParams: !!tokenInfo.config.hasCustomParams,
        customParams: cloneNonFlashParams(tokenInfo.config.customParams),
        flashLoanFeeRate: oracleInfo.config.flashLoanFeeRate,
        slippage: oracleInfo.slippage,
        borrowRate: tokenInfo.borrowRate,
        nonFlashLoanParams: cloneNonFlashParams(tokenInfo.nonFlashLoanParams),
        spotPrice: tokenInfo.spotPrice,
        exitPrice
      };
    });
  }

  async function refresh() {
    const refreshButton = document.getElementById('btn-refresh');
    const env = currentEnv();
    applyEnvironmentCapabilities();
    refreshButton.disabled = true;
    setStatus('Loading JR pricing data...', 'info');
    setTableLoading('Loading...');
    setOracleLoading('Loading...');

    try {
      const factoryAddress = getFactoryAddress();
      if (!factoryAddress) {
        state.rows = [];
        state.oracles = [];
        renderRows(state.rows);
        renderOracleRows(state.oracles);
        setTableLoading('JR Pricing factory address is missing from the current environment configuration');
        setOracleLoading('JR Pricing factory address is missing from the current environment configuration');
        setStatus('JR Pricing factory address is missing from the current environment configuration', 'info');
        return;
      }

      const factoryCode = await provider().getCode(factoryAddress);
      if (!factoryCode || factoryCode === '0x') {
        state.rows = [];
        state.oracles = [];
        renderRows(state.rows);
        renderOracleRows(state.oracles);
        setTableLoading('JR Pricing factory is not configured for the current environment');
        setOracleLoading('JR Pricing factory is not configured for the current environment');
        setStatus('JR Pricing factory is not configured for the current environment', 'info');
        const createOracleBtn = document.getElementById('btn-create-oracle');
        if (createOracleBtn) {
          createOracleBtn.disabled = true;
          createOracleBtn.title = 'JR Pricing factory is not configured for the current environment';
        }
        return;
      }

      const factory = getFactory(factoryAddress);
      state.factoryActor = await getPrivilegedActorAddress(factory);
      const jrTokens = (await callContract(factory, 'getSupportedJrTokens')).map((token) => ethers.utils.getAddress(token));
      if (!jrTokens.length) {
        state.rows = [];
        state.oracles = deriveOracleRows(state.rows);
        renderRows(state.rows);
        renderOracleRows(state.oracles);
        setStatus('No JR token records found', 'success');
        return;
      }

      state.rows = buildLoadingRows(jrTokens);
      state.oracles = deriveOracleRows(state.rows);
      renderRows(state.rows);
      renderOracleRows(state.oracles);
      setStatus(`Loading 0 / ${jrTokens.length} JR token records...`, 'info');

      let loadedCount = 0;
      for (let start = 0; start < jrTokens.length; start += JR_ROWS_CHUNK_SIZE) {
        const chunk = jrTokens.slice(start, start + JR_ROWS_CHUNK_SIZE);
        const chunkRows = await loadRowsForTokens(factoryAddress, chunk);
        const chunkMap = new Map(chunkRows.map((row) => [row.jrToken.toLowerCase(), row]));
        state.rows = state.rows.map((row) => chunkMap.get(String(row.jrToken).toLowerCase()) || row);
        state.oracles = deriveOracleRows(state.rows);
        loadedCount += chunkRows.length;
        renderRows(state.rows);
        renderOracleRows(state.oracles);
        setStatus(`Loading ${loadedCount} / ${jrTokens.length} JR token records...`, 'info');
      }

      setStatus(`Loaded ${jrTokens.length} JR token records`, 'success');
    } catch (error) {
      console.error('[jr-pricing] refresh failed', error);
      setTableLoading(`Failed to load JR pricing data: ${error?.message || error}`);
      setStatus(`Failed to load data: ${error?.message || error}`, 'error');
    } finally {
      refreshButton.disabled = false;
    }
  }

  async function refreshRow(rowIndex) {
    const row = state.rows[rowIndex];
    if (!row || !COMMON.isAddress(row.jrToken)) {
      throw new Error('Invalid JR token row');
    }

    const factoryAddress = getFactoryAddress();
    if (!factoryAddress) {
      throw new Error('JR Pricing Factory is not configured in Environment');
    }

    setStatus(`Refreshing ${row.symbol || shortAddress(row.jrToken)} ...`, 'info');
    const [nextRow] = await loadRowsForTokens(factoryAddress, [row.jrToken]);
    state.rows[rowIndex] = nextRow;
    state.oracles = deriveOracleRows(state.rows);
    renderRows(state.rows);
    renderOracleRows(state.oracles);
    setStatus(`Updated ${nextRow.symbol || shortAddress(nextRow.jrToken)}`, 'success');
    return nextRow;
  }

  async function resolvePrivilegedSigner(address, options = {}) {
    const signer = await COMMON.resolveSigner(address, options);
    if (signer) return signer;

    const isProduction = !!window.environment?.getAllParams?.().isProduction;
    if (isProduction) {
      throw new Error('No compatible admin signer is available for this action on the current production RPC');
    }

    throw new Error('No compatible signer is available. Use a local Anvil RPC or connect the matching admin wallet.');
  }

  async function runAsOperator(row, executor) {
    if (!COMMON.isAddress(row.operator) || row.operator === ZERO_ADDRESS) {
      throw new Error('No operator/owner address found on oracle');
    }

    const signer = await resolvePrivilegedSigner(row.operator, {
      requireAdmin: true,
      contractAddress: row.oracle
    });
    return await executor(signer);
  }

  async function runAsFakeOracleOwner(row, executor) {
    if (!row?.bondifyOracleDetected || !COMMON.isAddress(row.fakeOracle) || !COMMON.isAddress(row.fakeOracleOwner) || row.fakeOracleOwner === ZERO_ADDRESS) {
      throw new Error('Bondify Fake Oracle not available');
    }

    const signer = await resolvePrivilegedSigner(row.fakeOracleOwner, {
      preferredAddress: row.fakeOracleOwner,
      contractAddress: row.fakeOracle
    });
    return await executor(new ethers.Contract(row.fakeOracle, FAKE_ORACLE_ABI, signer));
  }

  function openModal(type, rowIndex = -1, oracleIndex = -1) {
    state.modal = { type, rowIndex, oracleIndex };
    const row = rowIndex >= 0 ? state.rows[rowIndex] : null;
    const oracleRow = oracleIndex >= 0 ? state.oracles[oracleIndex] : null;

    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('edit-modal-title');
    const body = document.getElementById('edit-modal-body');

    if ((type === 'token-config' || type === 'oracle-rates' || type === 'nonflash') && !row) return;
    if (type === 'register-jr' && !oracleRow) return;

    if (type === 'token-config') {
      title.textContent = `Edit JR Token Config · ${row.symbol}`;
      body.innerHTML = `
        <div class="modal-form-grid">
          <div class="modal-form-item">
            <label>Supported Exit Type</label>
            <select id="modal-exit-type">
              <option value="1" ${Number(row.supportedExitTypes) === 1 ? 'selected' : ''}>1 · Flash Loan</option>
              <option value="2" ${Number(row.supportedExitTypes) === 2 ? 'selected' : ''}>2 · Non-Flash Loan</option>
            </select>
          </div>
          <div class="modal-form-item">
            <label>Bondify Source</label>
            <input type="text" value="${escapeHtml(formatBondifySourceType(row.bondifySourceType))}" disabled>
          </div>
          <div class="modal-form-item full-width">
            <label>Bondify Config ID</label>
            <input type="text" value="${escapeHtml(formatBondifyConfigId(row.bondifyConfigId, row.bondifySourceType))}" disabled>
          </div>
          <div class="modal-form-item full-width">
            <label>Bondify Fake Oracle Price</label>
            <input id="modal-token-fake-oracle-price" type="number" step="0.000001" value="${row.bondifyOracleDetected ? escapeHtml(ethers.utils.formatUnits(row.bondifyOraclePrice || 0, 18)) : ''}" placeholder="Bondify Not Detected" ${row.bondifyOracleSettable ? '' : 'disabled'}>
            <p class="modal-hint">Written back through <code>supportJrToken</code>. If Bondify fake oracle is detected, the same submit action will also call <code>setPrice</code>.</p>
          </div>
        </div>
      `;
    }

    if (type === 'oracle-rates') {
      title.textContent = `Edit Oracle Rates · ${row.symbol}`;
      body.innerHTML = `
        <div class="modal-form-grid">
          <div class="modal-form-item">
            <label>Flash Loan Fee (%)</label>
            <input id="modal-flash-fee" type="number" step="0.5" value="${escapeHtml(rateToPercentString(row.flashLoanFeeRate))}">
          </div>
          <div class="modal-form-item">
            <label>Slippage (%)</label>
            <input id="modal-slippage" type="number" step="0.5" value="${escapeHtml(rateToPercentString(row.slippage))}">
          </div>
          <div class="modal-form-item full-width">
            <label>Market Adjustment (%)</label>
            <input id="modal-market-adjustment" type="number" step="0.5" value="${escapeHtml(signedRateToPercentString(row.marketAdjustment))}">
          </div>
        </div>
      `;
    }

    if (type === 'nonflash') {
      const params = row.nonFlashLoanParams || emptyNonFlashParams();
      title.textContent = `Edit Non-Flash Params · ${row.symbol}`;
      body.innerHTML = `
        <div class="modal-form-grid">
          <div class="modal-form-item">
            <label>Wait Time (days)</label>
            <input id="modal-wait-time" type="number" min="0" step="0.25" value="${escapeHtml((Number(params.waitTime || 0) / 86400).toString())}">
          </div>
          <div class="modal-form-item">
            <label>Borrow Rate (%)</label>
            <input id="modal-borrow-rate" type="number" step="0.5" value="${escapeHtml(rateToPercentString(params.borrowRate))}">
          </div>
          <div class="modal-form-item">
            <label>Risk Free Rate (%)</label>
            <input id="modal-risk-free-rate" type="number" step="0.5" value="${escapeHtml(rateToPercentString(params.riskFreeRate))}">
          </div>
          <div class="modal-form-item">
            <label>Waiting Period Risk (%)</label>
            <input id="modal-waiting-risk" type="number" step="0.5" value="${escapeHtml(rateToPercentString(params.waitingPeriodRisk))}">
          </div>
          <div class="modal-form-item full-width">
            <label>Borrow Rate Strategy</label>
            <input id="modal-borrow-strategy" type="text" value="${escapeHtml(params.borrowRateStrategy || ZERO_ADDRESS)}" placeholder="0x0000000000000000000000000000000000000000">
            <p class="modal-hint">Leave zero address to use the inline borrow rate value.</p>
          </div>
        </div>
      `;
    }

    if (type === 'create-oracle') {
      title.textContent = 'Create Oracle';
      body.innerHTML = `
        <div class="modal-form-grid">
          <div class="modal-form-item full-width">
            <label>Auxiliary Spot Oracle (optional)</label>
            <input id="modal-create-spot-oracle" type="text" value="${ZERO_ADDRESS}" placeholder="0x...">
            <p class="modal-hint">JR live spot now comes from Bondify <code>previewPrice</code>. This field is retained only for compatibility.</p>
          </div>
          <div class="modal-form-item">
            <label>Collateral Token</label>
            <input id="modal-create-collateral" type="text" placeholder="0x...">
          </div>
          <div class="modal-form-item">
            <label>Lending Token</label>
            <input id="modal-create-lending" type="text" placeholder="0x...">
          </div>
          <div class="modal-form-item">
            <label>Flash Loan Fee (%)</label>
            <input id="modal-create-flash-fee" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item">
            <label>Slippage (%)</label>
            <input id="modal-create-slippage" type="number" step="0.5" value="0.05">
          </div>
          <div class="modal-form-item full-width">
            <label>Slippage Provider</label>
            <input id="modal-create-slippage-provider" type="text" value="${ZERO_ADDRESS}">
          </div>
          <div class="modal-form-item full-width">
            <label>Bondify Source Registry</label>
            <input type="text" value="PCS + Aave + Morpho fixed front-end addresses" disabled>
            <p class="modal-hint">This action uses the three Bondify principal converter addresses configured on the Environment page.</p>
          </div>
          <div class="modal-form-item">
            <label>Wait Time (days)</label>
            <input id="modal-create-wait-time" type="number" min="0" step="0.25" value="7">
          </div>
          <div class="modal-form-item">
            <label>Borrow Rate (%)</label>
            <input id="modal-create-borrow-rate" type="number" step="0.5" value="8">
          </div>
          <div class="modal-form-item">
            <label>Risk Free Rate (%)</label>
            <input id="modal-create-risk-free-rate" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item">
            <label>Waiting Period Risk (%)</label>
            <input id="modal-create-waiting-risk" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item full-width">
            <label>Borrow Rate Strategy</label>
            <input id="modal-create-borrow-strategy" type="text" value="${ZERO_ADDRESS}">
          </div>
        </div>
      `;
    }

    if (type === 'register-jr') {
      title.textContent = `Create JR · ${shortAddress(oracleRow.oracle)}`;
      body.innerHTML = `
        <div class="modal-form-grid">
          <div class="modal-form-item full-width">
            <label>JR Token</label>
            <input id="modal-register-jr-token" type="text" placeholder="0x...">
          </div>
          <div class="modal-form-item">
            <label>Collateral Token</label>
            <input id="modal-register-collateral" type="text" value="${escapeHtml(oracleRow.collateralToken)}">
          </div>
          <div class="modal-form-item">
            <label>Lending Token</label>
            <input id="modal-register-lending" type="text" value="${escapeHtml(oracleRow.lendingToken)}">
          </div>
          <div class="modal-form-item">
            <label>Supported Exit Type</label>
            <select id="modal-register-exit-type">
              <option value="1">1 · Flash Loan</option>
              <option value="2" selected>2 · Non-Flash Loan</option>
            </select>
          </div>
          <div class="modal-form-item full-width">
            <label>Market Adjustment (%)</label>
            <input id="modal-register-market-adjustment" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item">
            <label>Wait Time (days)</label>
            <input id="modal-register-wait-time" type="number" min="0" step="0.25" value="0">
          </div>
          <div class="modal-form-item">
            <label>Borrow Rate (%)</label>
            <input id="modal-register-borrow-rate" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item">
            <label>Risk Free Rate (%)</label>
            <input id="modal-register-risk-free-rate" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item">
            <label>Waiting Period Risk (%)</label>
            <input id="modal-register-waiting-risk" type="number" step="0.5" value="0">
          </div>
          <div class="modal-form-item full-width">
            <label>Borrow Rate Strategy</label>
            <input id="modal-register-borrow-strategy" type="text" value="${ZERO_ADDRESS}">
          </div>
        </div>
      `;
    }

    modal.classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    state.modal = { type: null, rowIndex: -1, oracleIndex: -1 };
  }

  async function runAsFactoryActor(executor) {
    if (!COMMON.isAddress(state.factoryActor) || state.factoryActor === ZERO_ADDRESS) {
      throw new Error('No operator/owner address found on factory');
    }
    const signer = await resolvePrivilegedSigner(state.factoryActor, {
      requireAdmin: true,
      contractAddress: getFactoryAddress()
    });
    return await executor(signer);
  }

  async function submitModal() {
    const { type, rowIndex, oracleIndex } = state.modal;
    const row = rowIndex >= 0 ? state.rows[rowIndex] : null;
    const oracleRow = oracleIndex >= 0 ? state.oracles[oracleIndex] : null;
    if ((type === 'token-config' || type === 'oracle-rates' || type === 'nonflash') && !row) return;
    if (type === 'register-jr' && !oracleRow) return;

    const submitButton = document.getElementById('edit-modal-submit');
    submitButton.disabled = true;

    try {
      if (type === 'token-config' || type === 'oracle-rates' || type === 'nonflash') {
        await runAsOperator(row, async (signer) => {
          const oracle = getOracle(row.oracle, signer);

          if (type === 'token-config') {
            const exitType = Number(document.getElementById('modal-exit-type').value);
            const params = row.hasCustomParams ? cloneNonFlashParams(row.customParams) : emptyNonFlashParams();
            const tx = await oracle.supportJrToken(row.jrToken, exitType, row.marketAdjustment, params);
            await tx.wait();

            const fakeOracleInput = document.getElementById('modal-token-fake-oracle-price');
            const fakeOracleValue = fakeOracleInput ? String(fakeOracleInput.value || '').trim() : '';
            if (fakeOracleValue && row.bondifyOracleSettable) {
              await runAsFakeOracleOwner(row, async (fakeOracle) => {
                const tx3 = await fakeOracle.setPrice(row.collateralToken, ethers.utils.parseUnits(fakeOracleValue, 18));
                await tx3.wait();
              });
            }
          }

          if (type === 'oracle-rates') {
            const flashFee = percentToRate(document.getElementById('modal-flash-fee').value);
            const slippage = percentToRate(document.getElementById('modal-slippage').value);
            const marketAdjustment = Math.round(Number(document.getElementById('modal-market-adjustment').value || '0') * 10000);
            const tx1 = await oracle.setFlashLoanFeeRate(flashFee);
            await tx1.wait();
            const tx2 = await oracle.setSlippage(slippage);
            await tx2.wait();
            const tx3 = await oracle.setJrTokenMarketAdjustment(row.jrToken, marketAdjustment);
            await tx3.wait();
          }

          if (type === 'nonflash') {
            const strategyInput = document.getElementById('modal-borrow-strategy').value.trim();
            const params = {
              waitTime: daysToSeconds(document.getElementById('modal-wait-time').value),
              borrowRate: percentToRate(document.getElementById('modal-borrow-rate').value),
              borrowRateStrategy: COMMON.isAddress(strategyInput) ? ethers.utils.getAddress(strategyInput) : ZERO_ADDRESS,
              riskFreeRate: percentToRate(document.getElementById('modal-risk-free-rate').value),
              waitingPeriodRisk: percentToRate(document.getElementById('modal-waiting-risk').value)
            };
            const tx = await oracle.setJrTokenNonFlashLoanParams(row.jrToken, params);
            await tx.wait();
          }
        });

        COMMON.showToast?.('JR pricing parameter updated');
        closeModal();
        await refreshRow(rowIndex);
      }

      if (type === 'create-oracle') {
        await runAsFactoryActor(async (signer) => {
          const factory = new ethers.Contract(getFactoryAddress(), FACTORY_ABI, signer);
          const principalConverterSplit = getPrincipalConverterSplitAddress();
          const aavePrincipalConverter = getAavePrincipalConverterAddress();
          const morphoPrincipalConverter = getMorphoPrincipalConverterAddress();

          if (!COMMON.isAddress(principalConverterSplit)) {
            throw new Error('Bondify PrincipalConverterSplit address is missing from the current environment');
          }
          if (!COMMON.isAddress(aavePrincipalConverter)) {
            throw new Error('Bondify Aave Principal Converter address is missing from the current environment');
          }
          if (!COMMON.isAddress(morphoPrincipalConverter)) {
            throw new Error('Bondify Morpho Principal Converter address is missing from the current environment');
          }

          const config = {
            spotOracle: addressOrZero(document.getElementById('modal-create-spot-oracle').value.trim()),
            collateralToken: ethers.utils.getAddress(document.getElementById('modal-create-collateral').value.trim()),
            lendingToken: ethers.utils.getAddress(document.getElementById('modal-create-lending').value.trim()),
            principalConverterSplit,
            aavePrincipalConverter,
            morphoPrincipalConverter,
            flashLoanFeeRate: percentToRate(document.getElementById('modal-create-flash-fee').value),
            slippage: percentToRate(document.getElementById('modal-create-slippage').value),
            slippageProvider: addressOrZero(document.getElementById('modal-create-slippage-provider').value.trim()),
            nonFlashLoanParams: {
              waitTime: daysToSeconds(document.getElementById('modal-create-wait-time').value),
              borrowRate: percentToRate(document.getElementById('modal-create-borrow-rate').value),
              borrowRateStrategy: COMMON.isAddress(document.getElementById('modal-create-borrow-strategy').value.trim()) ? ethers.utils.getAddress(document.getElementById('modal-create-borrow-strategy').value.trim()) : ZERO_ADDRESS,
              riskFreeRate: percentToRate(document.getElementById('modal-create-risk-free-rate').value),
              waitingPeriodRisk: percentToRate(document.getElementById('modal-create-waiting-risk').value)
            }
          };
          const tx = await factory.createOracle(config);
          await tx.wait();
          const createdOracle = await factory.getPairOracle(config.collateralToken, config.lendingToken);
          state.extraOracles.push({
            oracle: createdOracle,
            operator: state.factoryActor,
            collateralToken: config.collateralToken,
            lendingToken: config.lendingToken,
            flashLoanFeeRate: config.flashLoanFeeRate,
            slippage: config.slippage,
            nonFlashLoanParams: cloneNonFlashParams(config.nonFlashLoanParams),
            tokenSymbols: [],
            tokenCount: 0
          });
        });
        state.oracles = deriveOracleRows(state.rows);
        renderOracleRows(state.oracles);
        COMMON.showToast?.('Oracle created');
        closeModal();
      }

      if (type === 'register-jr') {
        await runAsFactoryActor(async (signer) => {
          const factory = new ethers.Contract(getFactoryAddress(), FACTORY_ABI, signer);
          const params = {
            waitTime: daysToSeconds(document.getElementById('modal-register-wait-time').value),
            borrowRate: percentToRate(document.getElementById('modal-register-borrow-rate').value),
            borrowRateStrategy: COMMON.isAddress(document.getElementById('modal-register-borrow-strategy').value.trim()) ? ethers.utils.getAddress(document.getElementById('modal-register-borrow-strategy').value.trim()) : ZERO_ADDRESS,
            riskFreeRate: percentToRate(document.getElementById('modal-register-risk-free-rate').value),
            waitingPeriodRisk: percentToRate(document.getElementById('modal-register-waiting-risk').value)
          };
          const tx = await factory.registerJrToken(
            ethers.utils.getAddress(document.getElementById('modal-register-jr-token').value.trim()),
            ethers.utils.getAddress(document.getElementById('modal-register-collateral').value.trim()),
            ethers.utils.getAddress(document.getElementById('modal-register-lending').value.trim()),
            Number(document.getElementById('modal-register-exit-type').value),
            Math.round(Number(document.getElementById('modal-register-market-adjustment').value || '0') * 10000),
            params
          );
          await tx.wait();
        });
        COMMON.showToast?.('JR token created');
        closeModal();
        await refresh();
      }
    } catch (error) {
      console.error('[jr-pricing] update failed', error);
      setStatus(`Update failed: ${error?.message || error}`, 'error');
    } finally {
      submitButton.disabled = false;
    }
  }

  function bindCopyButtons() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy-address]');
      if (!button) return;
      const address = button.getAttribute('data-copy-address') || '';
      if (!COMMON.isAddress(address)) return;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(address);
        } else {
          const area = document.createElement('textarea');
          area.value = address;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        COMMON.showToast?.('Address copied');
      } catch (error) {
        console.error('[jr-pricing] copy failed', error);
      }
    });
  }

  function bindRowActions() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.getAttribute('data-action');

      if (action === 'register-jr') {
        const oracleIndex = Number(button.getAttribute('data-oracle-index'));
        if (Number.isFinite(oracleIndex)) openModal('register-jr', -1, oracleIndex);
        return;
      }

      const rowIndex = Number(button.getAttribute('data-index'));
      if (!Number.isFinite(rowIndex)) return;

      if (action === 'edit-token-config') openModal('token-config', rowIndex);
      if (action === 'edit-oracle-rates') openModal('oracle-rates', rowIndex);
      if (action === 'edit-nonflash') openModal('nonflash', rowIndex);
    });
  }

  function bindTabs() {
    document.querySelectorAll('.tab-button').forEach((button) => {
      button.addEventListener('click', () => setActiveTab(button.dataset.tab));
    });
    document.getElementById('btn-create-oracle')?.addEventListener('click', () => openModal('create-oracle'));
  }

  function bindModal() {
    const modal = document.getElementById('edit-modal');
    let overlayPointerDown = false;

    document.getElementById('edit-modal-close').addEventListener('click', closeModal);
    document.getElementById('edit-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('edit-modal-submit').addEventListener('click', submitModal);

    modal.addEventListener('mousedown', (event) => {
      overlayPointerDown = event.target === modal;
    });

    modal.addEventListener('mouseup', (event) => {
      const shouldClose = overlayPointerDown && event.target === modal;
      overlayPointerDown = false;
      if (shouldClose) closeModal();
    });

    modal.addEventListener('mouseleave', () => {
      overlayPointerDown = false;
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-refresh').addEventListener('click', refresh);
    bindCopyButtons();
    bindRowActions();
    bindTabs();
    bindModal();
    setActiveTab('token-list');
    applyEnvironmentCapabilities();
    await refresh();
  });
})();
