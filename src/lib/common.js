(function () {
  // Dependencies: ethers.js
  if (window.stapleCommon) return; // Prevent duplicate injection

  // =========================
  // Blockscan Links
  // =========================
  const BlockscanLinks = {
    1: "https://etherscan.io/",
    10: "https://optimistic.etherscan.io/",
    56: "https://bscscan.com/",
    66: "https://www.oklink.com/",
    100: "https://gnosisscan.io/",
    137: "https://polygonscan.com/",
    146: "https://sonicscan.org/",
    239: "https://explorer.tac.build/",
    250: "https://ftmscan.com/",
    252: "https://fraxscan.com/",
    314: "https://filscan.io/",
    324: "https://explorer.zksync.io/",
    1101: "https://zkevm.polygonscan.com/",
    1284: "https://moonscan.io/",
    1329: "https://seitrace.com/",
    2031: "https://centrifuge.subscan.io/",
    2222: "https://kavascan.com/",
    4200: "https://scan.merlinchain.io/",
    5000: "https://mantlescan.xyz/",
    8453: "https://basescan.org/",
    9745: "https://plasmascan.to/",
    10143: "https://testnet.monadexplorer.com/",
    13371: "https://immutascan.io/",
    34443: "https://explorer.mode.network/",
    42161: "https://arbiscan.io/",
    42220: "https://celoscan.io/",
    43114: "https://snowscan.xyz/",
    48900: "https://explorer.zircuit.com/",
    59144: "https://lineascan.build/",
    80094: "https://berascan.com/",
    81457: "https://blastscan.io/",
    167000: "https://taikoscan.io/",
    421614: "https://sepolia.arbiscan.io/",
    534352: "https://scrollscan.com/",
    810180: "https://explorer.zklink.io/",
    11155111: "https://sepolia.etherscan.io/",
  };

  function getExplorerLink(chainId, address) {
    if (!chainId || !BlockscanLinks[chainId]) return null;
    const baseUrl = BlockscanLinks[chainId];
    // Handle different explorer URL patterns if necessary, but most support /address/0x...
    // Some might be /account/ or /token/ but /address/ is standard for Etherscan clones.
    // For non-etherscan, we might need to check, but let's assume /address/ works or is redirected.
    // OKLink uses /address/
    // Filscan uses /address/
    // ZkSync uses /address/
    return `${baseUrl.replace(/\/$/, '')}/address/${address}`;
  }

  // =========================
  // STAPLE_CORE_UTILS Basic Utilities
  // =========================
  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function pLimit(concurrency = 6) {
    const queue = [];
    let active = 0;
    const next = () => {
      if (active >= concurrency || queue.length === 0) return;
      const { fn, resolve, reject } = queue.shift();
      active++;
      Promise.resolve()
        .then(fn)
        .then(resolve)
        .catch(reject)
        .finally(() => { active--; next(); });
    };
    return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
  }

  function isValidUrl(maybe) {
    try { new URL(maybe); return true; } catch { return false; }
  }

  function isAddress(addr) {
    if (!addr || typeof addr !== 'string') return false;
    const basic = /^0x[0-9a-fA-F]{40}$/.test(addr.trim());
    if (!basic) return false;
    if (window.ethers?.utils?.isAddress) {
      try { window.ethers.utils.isAddress(addr); return true; } catch { return true; }
    }
    return basic;
  }

  function normalizeAddress(addr) {
    if (!isAddress(addr)) return '';
    try {
      if (window.ethers?.utils?.getAddress) return window.ethers.utils.getAddress(addr);
    } catch {}
    return addr;
  }

  function shortenAddress(addr, visible = 4, suffix = 4) {
    if (typeof addr !== 'string') return '';
    const text = addr.trim();
    if (!text) return '';
    const prefixLength = text.startsWith('0x') ? 2 + Math.max(0, visible) : Math.max(0, visible);
    if (text.length <= prefixLength + Math.max(0, suffix) + 3) return text;
    return `${text.slice(0, prefixLength)}...${text.slice(-Math.max(0, suffix))}`;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function ensureToastInfrastructure() {
    if (!document.getElementById('staple-toast-style')) {
      const style = document.createElement('style');
      style.id = 'staple-toast-style';
      style.textContent = `
        .env-toast-container {
          position: fixed;
          right: 20px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          z-index: 2147483647;
          pointer-events: none;
        }
        .env-toast {
          min-width: 240px;
          max-width: min(420px, calc(100vw - 32px));
          max-height: 20vh;
          padding: 12px 16px;
          border-radius: 10px;
          color: #fff;
          font-size: 14px;
          line-height: 1.45;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.22s ease, transform 0.22s ease;
          pointer-events: auto;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-y: auto;
        }
        .env-toast.show {
          opacity: 1;
          transform: translateY(0);
        }
        .env-toast--success {
          background: #16a34a;
        }
        .env-toast--info {
          background: #2563eb;
        }
        .env-toast--error {
          background: #dc2626;
        }
        .env-toast__close {
          margin-left: 12px;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 0;
        }
        .env-toast__row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .env-toast__text {
          flex: 1;
        }
      `;
      document.head.appendChild(style);
    }

    let container = document.getElementById('staple-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'staple-toast-container';
      container.className = 'env-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function removeToast(el) {
    if (!el) return;
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }

  function normalizeToastText(text) {
    return String(text ?? '').replace(/\s+/g, ' ').trim();
  }

  function classifyToastMessage(message, explicitType = '') {
    if (explicitType) return explicitType;
    const text = normalizeToastText(message).toLowerCase();
    if (/success|successful|successfully|updated|update successful|created|complete|completed|copied|verified|minted|executed|confirmed|loaded|ready|refreshed|connected|disconnected|switched|saved|deleted|added|removed|imported|exported|synced|applied/.test(text)) {
      return 'success';
    }
    if (/fail|failed|error|invalid|missing|blocked|disabled|revert|reverted|cannot|unable|not set|no |please set|required|reject|rejected|denied|forbidden|unsupported|unavailable|timeout|timed out|exception/.test(text)) {
      return 'error';
    }
    return 'info';
  }

  function hasTechnicalErrorDetails(text) {
    return /0x[a-f0-9]{8,}|call_exception|server_error|network_error|nonce_expired|replacement_underpriced|unpredictable_gas_limit|insufficient funds|execution reverted|missing revert data|rpc|json-rpc|stack|\bat\s+[^\s]+:\d+|code=|reason=|method=|body=|params=|transaction hash|tx hash|\bhash\b/i.test(text);
  }

  function sanitizeErrorToastMessage(message) {
    const text = normalizeToastText(message);
    if (!text) return 'Operation failed.';

    const safeActionable = /^(please |select |enter |connect |missing |invalid |no available |operation disabled|signer required|cannot delete|address provider must|version or salt is required|router unavailable|data not ready|no executable path available|transaction blocked)/i;
    if (safeActionable.test(text) && !hasTechnicalErrorDetails(text) && text.length <= 140) {
      return text;
    }

    const [prefix, ...restParts] = text.split(':');
    const suffix = restParts.join(':').trim();
    if (suffix && hasTechnicalErrorDetails(suffix) && prefix.trim()) {
      return prefix.trim();
    }

    if (/private key|signer/.test(text)) {
      return 'Signer is not available. Check Environment settings.';
    }
    if (/network|timeout|fetch|rpc|provider/.test(text)) {
      return 'Network request failed. Check the selected RPC and try again.';
    }
    if (/insufficient funds|balance/.test(text)) {
      return 'Wallet balance is not enough to complete this operation.';
    }
    if (/revert|reverted|call_exception|unpredictable_gas_limit/.test(text)) {
      return prefix && prefix.trim() ? prefix.trim() : 'Transaction failed.';
    }
    if (/liquidity|path|route|slippage/.test(text)) {
      return 'No executable route is available with the current inputs.';
    }
    if (!hasTechnicalErrorDetails(text) && text.length <= 120) {
      return text;
    }
    return 'Operation failed.';
  }

  function sanitizeToastMessage(message, type) {
    const text = normalizeToastText(message);
    if (type === 'error') return sanitizeErrorToastMessage(text);
    if (type === 'success') return text || 'Success';
    return text || 'Done';
  }

  function notifyUser(message, options = {}) {
    const normalized = typeof options === 'number' ? { duration: options } : (options || {});
    const type = classifyToastMessage(message, normalized.type || '');
    if (type === 'success') {
      return showToast(message, { ...normalized, type: 'success', autoClose: normalized.autoClose ?? true });
    }
    if (type === 'error') {
      return showErrorToast(message, { ...normalized, type: 'error', autoClose: normalized.autoClose ?? false });
    }
    return showToast(message, { ...normalized, type: 'info', autoClose: normalized.autoClose ?? true });
  }

  function showToast(text, options = {}) {
    const normalized = typeof options === 'number' ? { duration: options } : (options || {});
    const type = classifyToastMessage(text, normalized.type || 'success');
    const autoClose = normalized.autoClose ?? (type !== 'error');
    const duration = normalized.duration ?? (type === 'error' ? 0 : 2400);
    const displayText = normalized.raw
      ? (normalizeToastText(text) || (type === 'error' ? 'Operation failed' : 'Success'))
      : sanitizeToastMessage(text, type);

    const container = ensureToastInfrastructure();
    const el = document.createElement('div');
    el.className = `env-toast env-toast--${type}`;

    const row = document.createElement('div');
    row.className = 'env-toast__row';

    const textSpan = document.createElement('div');
    textSpan.className = 'env-toast__text';
    textSpan.textContent = displayText || (type === 'error' ? 'Operation failed' : 'Success');

    row.appendChild(textSpan);

    if (!autoClose) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'env-toast__close';
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => removeToast(el));
      row.appendChild(closeBtn);
    }

    el.appendChild(row);
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    if (autoClose && duration > 0) {
      setTimeout(() => removeToast(el), duration);
    }

    return el;
  }

  function showErrorToast(text, options = {}) {
    const normalized = typeof options === 'number' ? { duration: options } : (options || {});
    return showToast(text, { ...normalized, type: 'error', autoClose: normalized.autoClose ?? false });
  }

  function overrideBrowserDialogs() {
    if (window.__stapleDialogsOverridden) return;
    window.__stapleDialogsOverridden = true;

    window.alert = (message) => {
      return notifyUser(String(message || ''), { autoClose: false });
    };

    window.confirm = (message) => {
      showErrorToast(String(message || 'Operation requires a non-dialog flow.'), { autoClose: false });
      return false;
    };

    window.prompt = (message) => {
      showErrorToast(String(message || 'Operation requires a non-dialog flow.'), { autoClose: false });
      return null;
    };
  }

  overrideBrowserDialogs();
  window.showToast = (message, duration = 2400) => showToast(message, { type: 'success', duration, autoClose: true });
  window.showErrorToast = (message) => showErrorToast(message, { autoClose: false });

  function setupCopyDelegation(selector = '.copy-btn', attr = 'data-copy-target') {
    if (document.__stapleCopyBound) return;
    document.__stapleCopyBound = true;
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest(selector);
      if (!btn) return;
      const id = btn.getAttribute(attr);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      const text = (el.textContent || '').trim();
      if (!text) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        showToast('Copied successfully');
      } catch {
        showErrorToast('Copy failed');
      }
    });
  }

  // =========== RPC Provider Access ===========
  function getRpcProvider() {
    if (window.RpcManager && window.RpcManager.getProvider()) {
      return window.RpcManager.getProvider();
    }
    // Fallback if RpcManager is not initialized yet (should not happen if flow is correct)
    const r = window.environment?.getAllParams().rpc;
    if (!r) throw new Error('RPC not set');
    return new ethers.providers.JsonRpcProvider(r);
  }

  // =========== Signer Check ===========
  function isSigner(obj) {
    return obj && typeof obj === 'object' && typeof obj.getAddress === 'function';
  }

  // =========== Resolve Signer Logic ===========
  async function discoverDynamicAdminCandidates(provider, contractAddress) {
    if (!provider || !contractAddress || !isAddress(contractAddress)) return [];
    const candidates = [];
    const push = (value) => {
      const normalized = normalizeAddress(value || '');
      if (normalized && !candidates.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
        candidates.push(normalized);
      }
    };
    try {
      const ownerContract = new window.ethers.Contract(contractAddress, ['function owner() view returns (address)'], provider);
      push(await ownerContract.owner());
    } catch (_) {}
    try {
      const roleReader = new window.ethers.Contract(
        contractAddress,
        [
          'function getRoleMemberCount(bytes32) view returns (uint256)',
          'function getRoleMember(bytes32,uint256) view returns (address)'
        ],
        provider
      );
      const defaultAdminRole = '0x' + '00'.repeat(32);
      const count = Number(await roleReader.getRoleMemberCount(defaultAdminRole));
      for (let index = 0; index < count; index++) {
        push(await roleReader.getRoleMember(defaultAdminRole, index));
      }
    } catch (_) {}
    return candidates;
  }

  async function resolveSigner(signerOrAddr, options = {}) {
    if (isSigner(signerOrAddr)) return signerOrAddr;

    const env = window.environment;
    const provider = getRpcProvider();
    const requireAdmin = !!options.requireAdmin;
    const contractAddress = typeof options.contractAddress === 'string' ? options.contractAddress : '';

    let addr = typeof signerOrAddr === 'string' ? signerOrAddr : '';

    if (env?.getSignerCandidate) {
      const candidate = env.getSignerCandidate({
        preferredAddress: addr,
        contractAddress,
        requireAdmin
      }) || {};
      if (candidate.address) addr = candidate.address;
    }

    if (!isAddress(addr) && requireAdmin && contractAddress) {
      const discoveredAdmins = await discoverDynamicAdminCandidates(provider, contractAddress);
      if (discoveredAdmins.length) addr = discoveredAdmins[0];
    }

    if (!isAddress(addr) && !requireAdmin && env?.getAllParams) {
      const selectedUser = env.getAllParams().user;
      if (isAddress(selectedUser)) addr = selectedUser;
    }

    if (!isAddress(addr)) return null;

    if (window.ethers && window.ethers.constants && addr === window.ethers.constants.AddressZero) return null;
    if (addr === '0x0000000000000000000000000000000000000000') return null;

    if (!env) {
      try { return provider.getSigner(addr); } catch { return null; }
    }

    const allParams = env.getAllParams ? env.getAllParams() : {};
    const isProduction = !!allParams.isProduction;
    const walletState = env?.getWalletState ? env.getWalletState() : null;
    const walletConnected = !!(walletState?.connected && isAddress(walletState.address));

    // Runtime rule: once a browser wallet is connected, write operations must use that
    // wallet signer. Do not silently fall back to local impersonation.
    if (walletConnected) {
      try {
        const walletSigner = env?.getConnectedWalletSigner ? env.getConnectedWalletSigner() : null;
        if (walletSigner) return walletSigner;
      } catch (_) {
        console.warn('Connected browser wallet signer is unavailable for the selected RPC.');
      }
      console.warn('Browser wallet is connected, so signer resolution will not fall back to local impersonation.');
      return null;
    }

    if (isProduction) {
      console.warn('No compatible signer is available for this production RPC. Connect the matching browser wallet.');
      return null;
    }

    try {
      try {
        await provider.send('hardhat_impersonateAccount', [addr]);
      } catch (e) {
        try {
          await provider.send('anvil_impersonateAccount', [addr]);
        } catch (e2) {
          // Ignore if not supported (e.g. real testnet)
        }
      }
      try {
        const balance = await provider.getBalance(addr);
        if (balance.lt(window.ethers.utils.parseEther('1'))) {
          await trySetEthBalance(provider, addr, window.ethers.utils.hexStripZeros(window.ethers.utils.parseEther('100').toHexString()));
        }
      } catch (_) {}
      return provider.getSigner(addr);
    } catch (e) {
      console.warn('Failed to get signer from provider:', e);
    }

    return null;
  }

  // =========================
  // STAPLE_UTIL_FORMAT Number/BigNumber Formatting
  // =========================

  /**
   * Format number
   * STAPLE_PREFERRED_API
   * @param {number|string} value Number or parsable string
   * @param {number|string} digits Decimal places (truncation only); default 6
   * @returns {string} Formatted string
   */
  function formatNumber(value, digits = 6) {
    try {
      if (value === null || value === undefined || value === '') {
        return fixedZeroDigits(digits);
      }
      const d = parseInt(digits, 10);
      const safeDigits = isFinite(d) && d >= 0 ? d : 6;
      let s = typeof value === 'number' && !Number.isNaN(value)
        ? String(value)
        : (typeof value === 'string' ? value.trim() : '');

      if (!s) return fixedZeroDigits(safeDigits);

      // Handle scientific notation
      if (/e/i.test(s)) {
        const n = Number(s);
        if (!isFinite(n)) return fixedZeroDigits(safeDigits);
        s = n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 });
      }

      // Remove non-numeric characters (keep one negative sign and one decimal point)
      const neg = s.startsWith('-');
      s = s.replace(/[^0-9.]/g, '');
      const parts = s.split('.');

      let intPart = parts[0] || '0';
      let decPart = (parts[1] || '').replace(/\./g, '');

      // Truncate
      decPart = decPart.slice(0, safeDigits);
      // Pad with zeros
      while (decPart.length < safeDigits) decPart += '0';

      return `${neg && intPart !== '0' ? '-' : ''}${intPart}.${decPart}`;
    } catch {
      const d = parseInt(digits, 10);
      return fixedZeroDigits(isFinite(d) && d >= 0 ? d : 6);
    }
  }

  function fixedZeroDigits(d) {
    const dd = isFinite(d) && d >= 0 ? d : 6;
    return `0.${'0'.repeat(dd)}`;
  }

  /**
   * Convert BigNumber / string (integer representation) to JS number (potential precision loss)
   * STAPLE_PREFERRED_API
   * @param {import('ethers')?.BigNumber|string|number} value BigNumber or decimal string / number
   * @param {number|string} decimals Decimals (can be string)
   * @returns {number} JS Number
   */
  function fromBigNumber(value, decimals = 18) {
    try {
      const d = parseInt(decimals, 10);
      const safeDecimals = isFinite(d) && d >= 0 ? d : 18;

      const normalizeVal = (v) => {
        if (v === undefined || v === null) return '0';
        if (typeof v === 'string' && v.startsWith('0x') && window.ethers?.BigNumber) {
          try {
            return window.ethers.BigNumber.from(v);
          } catch (_err) {
            return v;
          }
        }
        return v;
      };

      const v = normalizeVal(value);

      if (window.ethers?.utils?.formatUnits) {
        try {
          return Number(window.ethers.utils.formatUnits(v, safeDecimals));
        } catch (_err) {
          // fall through to legacy paths
        }
      }

      if (window.ethers?.BigNumber?.isBigNumber?.(v)) {
        const s = window.ethers.utils.formatUnits(v, safeDecimals);
        return Number(s);
      }

      if (typeof v === 'string' && /^\d+$/.test(v)) {
        if (window.ethers?.utils?.formatUnits) {
          return Number(window.ethers.utils.formatUnits(v, safeDecimals));
        }
        if (v.length <= safeDecimals) {
          const pad = v.padStart(safeDecimals + 1, '0');
          return Number(`${pad.slice(0, pad.length - safeDecimals)}.${pad.slice(-safeDecimals)}`);
        }
        const int = v.slice(0, v.length - safeDecimals);
        const dec = v.slice(v.length - safeDecimals);
        return Number(`${int}.${dec}`);
      }

      return Number(v) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Convert number to BigNumber (or raw decimal string)
   * STAPLE_PREFERRED_API
   * @param {number|string} value Input number
   * @param {number|string} decimals Decimals
   * @returns {import('ethers')?.BigNumber|string} BigNumber or raw string (no decimal point)
   */
  function toBigNumber(value, decimals = 18) {
    const d = parseInt(decimals, 10);
    const safeDecimals = isFinite(d) && d >= 0 ? d : 18;
    const raw = (typeof value === 'number')
      ? (Number.isFinite(value) ? value.toString() : '0')
      : (typeof value === 'string' ? value.trim() : '0');

    if (!raw) return zeroBig(safeDecimals);

    try {
      if (window.ethers?.utils?.parseUnits) {
        return window.ethers.utils.parseUnits(raw, safeDecimals);
      }
    } catch {
      // Fallback
    }

    // String fallback: manual integer construction
    let neg = false;
    let s = raw;
    if (s.startsWith('-')) { neg = true; s = s.slice(1); }
    if (!/^\d+(\.\d+)?$/.test(s)) return zeroBig(safeDecimals);
    const [i, dec = ''] = s.split('.');
    const merged = (i + (dec + '0'.repeat(safeDecimals))).slice(0, i.length + safeDecimals);
    const intStr = merged + (dec.length < safeDecimals ? '' : '');
    const cleaned = intStr.replace(/^0+/, '') || '0';
    return neg ? '-' + cleaned : cleaned;
  }

  function zeroBig(decimals) {
    if (window.ethers?.BigNumber) return window.ethers.BigNumber.from(0);
    return '0'.padEnd(decimals + 1, '0');
  }

  async function tryImpersonateAccount(provider, address) {
    if (!provider || !provider.send) return false;
    try {
      await provider.send('hardhat_impersonateAccount', [address]);
      return true;
    } catch (e) {
      try {
        await provider.send('anvil_impersonateAccount', [address]);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  async function trySetEthBalance(provider, address, balanceHex) {
    if (!provider || !provider.send) return false;
    try {
      await provider.send('hardhat_setBalance', [address, balanceHex]);
      return true;
    } catch (e) {
      try {
        await provider.send('anvil_setBalance', [address, balanceHex]);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  // =========================
  // STAPLE_EXPORT Exports
  // =========================
  window.stapleCommon = {
    // Basics
    debounce,
    pLimit,
    isValidUrl,
    isAddress,
    normalizeAddress,
    shortenAddress,
    escapeHtml,
    showToast,
    showErrorToast,
    notifyUser,
    setupCopyDelegation,
    tryImpersonateAccount,
    trySetEthBalance,

    // Preferred APIs
    formatNumber,       
    fromBigNumber,      
    toBigNumber,        

    // Exports
    getRpcProvider,
    isSigner,
    resolveSigner,
    discoverDynamicAdminCandidates,
    getExplorerLink,
  };
})();
