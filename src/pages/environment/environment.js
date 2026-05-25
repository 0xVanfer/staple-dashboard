/*
 * Environment Configuration Module
 */

(function () {
  const COMMON = window.stapleCommon || {};
  const deepClone = (o) => JSON.parse(JSON.stringify(o || {}));
  const esc = (v) => COMMON.escapeHtml ? COMMON.escapeHtml(v) : String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const isAddr = (a) => a && COMMON.isAddress ? COMMON.isAddress(a) : /^0x[0-9a-fA-F]{40}$/.test(a || '');
  const normAddr = (a) => {
    if (!a) return '';
    try {
      return COMMON.normalizeAddress ? COMMON.normalizeAddress(a) : a;
    } catch {
      return a;
    }
  };
  const shorten = (value, left = 6, right = 4) => {
    const text = String(value || '');
    if (!text) return '';
    if (text.length <= left + right + 3) return text;
    return `${text.slice(0, left)}...${text.slice(-right)}`;
  };

  /**
   * IMPORTANT / DO NOT "SIMPLIFY" THIS FEATURE WITHOUT AN EXPLICIT PRODUCT REQUEST.
   *
   * Why this exists:
   * - On local dev nodes we sometimes modify a wallet's native ETH balance directly with
   *   hardhat/anvil state override methods.
   * - MetaMask often does NOT refresh the displayed native balance immediately after that kind
   *   of direct balance mutation.
   * - In practice MetaMask refreshes once it observes a real on-chain transaction from the same
   *   account, so we intentionally provide a tiny native-token transfer helper here.
   *
   * Hard constraints that are INTENTIONAL and MUST remain in place unless the user explicitly
   * asks to change them again:
   * 1. This helper must stay TEST-ONLY. Never enable it for production / non-local RPC usage.
   * 2. This helper must stay IMPERSONATION-ONLY. Do not silently fall back to browser wallet,
   *    hardware wallet, or any other signer path.
   * 3. The recipient must stay equal to the current user (sender). Do not turn it into an
   *    editable input or any third-party destination just because it feels "more flexible".
   *    The point is a deterministic self-transfer refresh poke, not a generic send form.
   * 4. The transfer amount should remain tiny. It only exists to force MetaMask to notice a
   *    state change after direct ETH balance edits.
   *
   * If later code review suggests this looks oddly strict, that strictness is deliberate:
   * this button exists specifically to repair local MetaMask native-balance UX after direct
   * state overrides, and its safety depends on NOT becoming a generic transfer button.
   */
  const MINTER_NATIVE_REFRESH_AMOUNT_ETH = '0.000001';
  const LEDGER_DIRECT_ID = 'ledger-direct-webhid';
  const LEDGER_DIRECT_LABEL = 'Ledger Direct (WebHID)';
  const LEDGER_DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";

  function inferredWalletLabel(provider, fallbackIndex = 0) {
    if (!provider) return 'Injected Wallet';
    const providerName = String(provider?.providerInfo?.name || provider?.name || provider?.wallet || '').trim();
    const providerRdns = String(provider?.providerInfo?.rdns || '').trim().toLowerCase();
    if (provider.isOkxWallet || provider.isOKXWallet || provider.isOKExWallet || provider.isOkexWallet || /okx|okex/.test(providerRdns) || /\bokx\b/i.test(providerName)) return 'OKX Wallet';
    if (provider.isRabby || /rabby/.test(providerRdns) || /\brabby\b/i.test(providerName)) return 'Rabby';
    if (provider.isCoinbaseWallet || /coinbase/.test(providerRdns) || /coinbase/i.test(providerName)) return 'Coinbase Wallet';
    if (provider.isLedger || provider.isLedgerLive || provider.isLedgerConnect || /ledger/.test(providerRdns) || /ledger/i.test(providerName)) return 'Ledger';
    if (provider.isMetaMask || /metamask/.test(providerRdns) || /metamask/i.test(providerName)) return 'MetaMask';
    return `Injected Wallet ${fallbackIndex + 1}`;
  }

  function walletProviderIdentity(provider, fallbackIndex = 0) {
    const info = provider?.providerInfo || {};
    const rdns = String(info.rdns || '').trim().toLowerCase();
    const uuid = String(info.uuid || '').trim().toLowerCase();
    const name = String(info.name || provider?.name || provider?.wallet || '').trim().toLowerCase();
    if (rdns) return `rdns:${rdns}`;
    if (uuid) return `uuid:${uuid}`;
    if (provider.isOkxWallet || provider.isOKXWallet || provider.isOKExWallet || provider.isOkexWallet) return 'flag:okx';
    if (provider.isRabby) return 'flag:rabby';
    if (provider.isCoinbaseWallet) return 'flag:coinbase';
    if (provider.isLedger || provider.isLedgerLive || provider.isLedgerConnect) return 'flag:ledger';
    if (provider.isMetaMask) return 'flag:metamask';
    if (name) return `name:${name}`;
    return `fallback:${fallbackIndex}`;
  }

  function isUsableWalletProvider(provider) {
    return !!(provider && typeof provider === 'object' && typeof provider.request === 'function');
  }

  function getLedgerDirectBridge() {
    return window.StapleLedgerDirect || null;
  }

  function isLedgerDirectSupported() {
    try {
      if (window.__ledgerDirectHooks?.isSupported) return !!window.__ledgerDirectHooks.isSupported();
    } catch (_) {}
    return !!(
      typeof window !== 'undefined'
      && window.isSecureContext
      && navigator?.hid
      && (window.__ledgerDirectHooks?.createSigner || getLedgerDirectBridge()?.createSigner)
    );
  }

  async function listAuthorizedLedgerDirectDevices() {
    try {
      if (window.__ledgerDirectHooks?.listAuthorizedDevices) {
        return await window.__ledgerDirectHooks.listAuthorizedDevices();
      }
      if (window.__ledgerDirectHooks?.hasAuthorizedDevice) {
        return (await window.__ledgerDirectHooks.hasAuthorizedDevice()) ? [{ productName: 'Ledger device' }] : [];
      }
      const bridge = getLedgerDirectBridge();
      if (bridge?.listAuthorizedDevices) {
        const devices = await bridge.listAuthorizedDevices();
        return Array.isArray(devices) ? devices : [];
      }
      if (bridge?.hasAuthorizedDevice) {
        return (await bridge.hasAuthorizedDevice()) ? [{ productName: 'Ledger device' }] : [];
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  async function hasAuthorizedLedgerDirectDevice() {
    const devices = await listAuthorizedLedgerDirectDevices();
    return devices.length > 0;
  }

  function ledgerDirectWalletCandidate() {
    if (!isLedgerDirectSupported()) return null;
    return {
      id: LEDGER_DIRECT_ID,
      label: LEDGER_DIRECT_LABEL,
      kind: 'ledger-direct',
      provider: null
    };
  }

  function detectBrowserWallets() {
    if (typeof window === 'undefined') return [];
    const candidates = [];
    const pushCandidate = (provider) => {
      if (isUsableWalletProvider(provider)) candidates.push(provider);
    };

    const injected = window.ethereum;
    const injectedProviders = Array.isArray(injected?.providers) ? injected.providers.filter((provider) => isUsableWalletProvider(provider)) : [];

    // When multiple wallets are installed, window.ethereum may be an aggregate proxy instead of
    // a concrete wallet provider. Using that proxy can route a "MetaMask" click into OKX (or the
    // reverse), so only concrete child providers are connectable in that case.
    if (injectedProviders.length) {
      injectedProviders.forEach(pushCandidate);
    } else {
      pushCandidate(injected);
    }

    pushCandidate(window.okxwallet?.ethereum);
    pushCandidate(window.okxwallet);
    pushCandidate(window.okexchain);

    const seenProviders = new Set();
    const seenWallets = new Set();
    const wallets = candidates.map((provider, index) => {
      if (seenProviders.has(provider)) return null;
      seenProviders.add(provider);
      const identity = walletProviderIdentity(provider, index);
      if (seenWallets.has(identity)) return null;
      seenWallets.add(identity);
      const label = inferredWalletLabel(provider, index);
      const id = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${identity.replace(/[^a-z0-9:._-]+/g, '-')}`;
      return { id, label, kind: 'injected', provider };
    }).filter(Boolean);

    const ledgerDirect = ledgerDirectWalletCandidate();
    if (ledgerDirect) wallets.push(ledgerDirect);
    return wallets;
  }

  function getSelectedDetectedWallet() {
    const wallets = detectBrowserWallets();
    return wallets.find((item) => item.id === _walletState.providerId) || wallets[0] || null;
  }

  function walletMatchesCurrentRpc() {
    if (!_walletState.connected || !_walletState.chainId || !_chainId) return true;
    return Number(_walletState.chainId) === Number(_chainId);
  }

  function getConnectedWalletSigner() {
    const selected = getSelectedDetectedWallet();
    if (!_walletState.connected || !isAddr(_walletState.address) || !walletMatchesCurrentRpc()) return null;
    if (selected?.kind === 'ledger-direct') {
      return _walletRuntime.kind === 'ledger-direct' ? (_walletRuntime.signer || null) : null;
    }
    if (!selected?.provider || !window.ethers?.providers?.Web3Provider) return null;
    try {
      const web3Provider = new ethers.providers.Web3Provider(selected.provider, 'any');
      return web3Provider.getSigner(_walletState.address);
    } catch (_) {
      return null;
    }
  }

  function effectiveCurrentUserAddress() {
    const walletAddress = normAddr(_walletState.address || '');
    if (_walletState.connected && isAddr(walletAddress)) return walletAddress;
    return normAddr(_selectedUser || '');
  }

  function withTimeout(promise, timeoutMs, fallbackValue = Symbol('timeout')) {
    let timer = null;
    return Promise.race([
      Promise.resolve(promise).finally(() => {
        if (timer) clearTimeout(timer);
      }),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
      })
    ]);
  }

  function readWalletSessionHint() {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE.WALLET_PROVIDER);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        providerId: String(parsed?.providerId || ''),
        providerLabel: String(parsed?.providerLabel || '')
      };
    } catch (_) {
      return null;
    }
  }

  function writeWalletSessionHint(providerInfo = null) {
    try {
      if (!providerInfo?.id) {
        sessionStorage.removeItem(SESSION_STORAGE.WALLET_PROVIDER);
        return;
      }
      sessionStorage.setItem(SESSION_STORAGE.WALLET_PROVIDER, JSON.stringify({
        providerId: String(providerInfo.id || ''),
        providerLabel: String(providerInfo.label || '')
      }));
    } catch (_) {}
  }

  function setWalletRuntimeState(patch = {}) {
    _walletState = {
      connected: !!patch.connected,
      providerId: String(patch.providerId || ''),
      providerLabel: String(patch.providerLabel || ''),
      address: normAddr(patch.address || ''),
      chainId: Number(patch.chainId || 0) || 0
    };
    renderWalletPanel();
    renderUsers();
  }

  async function readProviderChainId(provider) {
    if (!provider?.request) return 0;
    try {
      const chainIdHex = await provider.request({ method: 'eth_chainId' });
      const parsed = Number(chainIdHex);
      return Number.isFinite(parsed) ? parsed : parseInt(String(chainIdHex || '0'), 16) || 0;
    } catch (_) {
      return 0;
    }
  }

  async function revokeWalletAccountPermission(provider, timeoutMs = 1200) {
    if (!provider?.request) return 'unsupported';
    return withTimeout(
      provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
        .then(() => 'revoked')
        .catch((error) => {
          console.warn('wallet_revokePermissions failed', error);
          return 'failed';
        }),
      timeoutMs,
      'timeout'
    );
  }

  async function createLedgerDirectSigner({ provider, silent = false } = {}) {
    const rpcProvider = provider || _provider || (COMMON.getRpcProvider ? COMMON.getRpcProvider() : null);
    if (!rpcProvider) throw new Error('RPC provider is not ready yet. Please let the Environment page finish loading and retry.');

    if (window.__ledgerDirectHooks?.createSigner) {
      const result = await window.__ledgerDirectHooks.createSigner({
        provider: rpcProvider,
        path: LEDGER_DEFAULT_DERIVATION_PATH,
        silent
      });
      const signer = result?.signer || result;
      if (!signer) throw new Error('Ledger direct signer hook returned no signer.');
      return {
        signer,
        address: result?.address || '',
        deviceLabel: String(result?.deviceLabel || ''),
        cleanup: async () => {
          try {
            await window.__ledgerDirectHooks?.disconnect?.();
          } catch (_) {}
        }
      };
    }

    const bridge = getLedgerDirectBridge();
    if (!bridge?.createSigner) {
      throw new Error('Ledger direct runtime is not available locally. Rebuild ledgerDirect.bundle.js and refresh the page.');
    }
    const result = await bridge.createSigner({
      provider: rpcProvider,
      path: LEDGER_DEFAULT_DERIVATION_PATH,
      silent
    });
    const signer = result?.signer || result;
    if (!signer) throw new Error('Ledger direct runtime did not return a signer.');
    return {
      signer,
      address: result?.address || '',
      deviceLabel: String(result?.deviceLabel || ''),
      cleanup: typeof result?.cleanup === 'function'
        ? result.cleanup
        : async () => {
          try {
            await signer?.transport?.close?.();
          } catch (_) {}
        }
    };
  }

  function clearWalletRuntime() {
    const cleanup = _walletRuntime?.cleanup;
    _walletRuntime = { kind: '', signer: null, cleanup: null, deviceLabel: '' };
    if (typeof cleanup === 'function') {
      Promise.resolve().then(() => cleanup()).catch(() => {});
    }
  }

  async function connectLedgerDirectWallet({ silent = false } = {}) {
    if (!isLedgerDirectSupported()) {
      throw new Error('Ledger direct connection requires WebHID in a secure context (Chrome/Edge over https:// or localhost).');
    }
    if (!silent) {
      notify('Ledger direct connect: unlock the device, open the Ethereum app, then choose the Ledger in the browser prompt. Approve any permission request on the device if asked.', 'info');
    }
    const { signer, cleanup, address: returnedAddress, deviceLabel } = await createLedgerDirectSigner({ provider: _provider, silent });
    const address = normAddr(returnedAddress || await signer.getAddress());
    if (!isAddr(address)) {
      await cleanup?.();
      throw new Error('Ledger did not return a valid Ethereum address. Make sure the Ethereum app is open and retry.');
    }
    const network = await (_provider?.getNetwork ? _provider.getNetwork() : Promise.resolve({ chainId: _chainId || 0 }));
    clearWalletRuntime();
    _walletRuntime = { kind: 'ledger-direct', signer, cleanup, deviceLabel: String(deviceLabel || '') };
    writeWalletSessionHint({ id: LEDGER_DIRECT_ID, label: LEDGER_DIRECT_LABEL });
    setWalletRuntimeState({
      connected: true,
      providerId: LEDGER_DIRECT_ID,
      providerLabel: LEDGER_DIRECT_LABEL,
      address,
      chainId: Number(network?.chainId || _chainId || 0) || 0
    });
    if (!silent) notify(`Connected ${LEDGER_DIRECT_LABEL}${deviceLabel ? ` (${deviceLabel})` : ''}`);
    return { ..._walletState };
  }

  async function recoverWalletSession() {
    const hinted = readWalletSessionHint();
    if (!hinted?.providerId) return null;

    if (hinted.providerId === LEDGER_DIRECT_ID) {
      try {
        const authorized = await hasAuthorizedLedgerDirectDevice();
        if (!authorized) {
          writeWalletSessionHint(null);
          clearWalletRuntime();
          setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
          return null;
        }
        return await connectLedgerDirectWallet({ silent: true });
      } catch (error) {
        console.warn('wallet session recover failed', error);
        writeWalletSessionHint(null);
        clearWalletRuntime();
        setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
        return null;
      }
    }

    const wallets = detectBrowserWallets();
    const selected = wallets.find((item) => item.id === hinted.providerId) || null;
    if (!selected?.provider?.request) {
      writeWalletSessionHint(null);
      clearWalletRuntime();
      setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
      return null;
    }

    try {
      const accounts = await withTimeout(selected.provider.request({ method: 'eth_accounts' }), 5000, 'timeout');
      if (accounts === 'timeout' || !Array.isArray(accounts) || !accounts.length) {
        writeWalletSessionHint(null);
        clearWalletRuntime();
        setWalletRuntimeState({ connected: false, providerId: selected.id, providerLabel: selected.label, address: '', chainId: 0 });
        return null;
      }

      const address = normAddr(accounts[0] || '');
      if (!isAddr(address)) {
        writeWalletSessionHint(null);
        clearWalletRuntime();
        setWalletRuntimeState({ connected: false, providerId: selected.id, providerLabel: selected.label, address: '', chainId: 0 });
        return null;
      }

      const chainId = await readProviderChainId(selected.provider);
      setWalletRuntimeState({
        connected: true,
        providerId: selected.id,
        providerLabel: selected.label,
        address,
        chainId
      });
      return { ..._walletState };
    } catch (error) {
      console.warn('wallet session recover failed', error);
      writeWalletSessionHint(null);
      clearWalletRuntime();
      setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
      return null;
    }
  }

  async function connectBrowserWallet(walletId = '') {
    const wallets = detectBrowserWallets();
    const selected = wallets.find((item) => item.id === walletId) || wallets[0] || null;
    if (!selected) throw new Error('No supported browser wallet detected');
    if (selected.kind === 'ledger-direct') {
      return connectLedgerDirectWallet();
    }
    if (!selected?.provider) throw new Error('No supported browser wallet detected');
    const provider = selected.provider;

    // Explicit connect only. No account reads outside this flow should ever mark the page as connected.
    clearWalletRuntime();
    await revokeWalletAccountPermission(provider, 1200);

    try {
      await withTimeout(
        provider.request?.({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }),
        5000,
        'timeout'
      );
    } catch (_) {
      // Some wallets do not support wallet_requestPermissions. Continue to eth_requestAccounts.
    }

    const accounts = await withTimeout(
      provider.request?.({ method: 'eth_requestAccounts' }),
      15000,
      'timeout'
    );

    if (accounts === 'timeout') {
      throw new Error('Wallet connection request timed out. Please reopen the wallet popup and approve the account connection.');
    }
    if (!Array.isArray(accounts) || !accounts.length) {
      setWalletRuntimeState({ connected: false, providerId: selected.id, providerLabel: selected.label });
      throw new Error('Wallet did not return an account. No browser wallet connection was established.');
    }

    const address = normAddr(accounts[0] || '');
    if (!isAddr(address)) {
      setWalletRuntimeState({ connected: false, providerId: selected.id, providerLabel: selected.label });
      throw new Error('Wallet returned an invalid account. No browser wallet connection was established.');
    }

    const chainId = await readProviderChainId(provider);
    writeWalletSessionHint(selected);
    setWalletRuntimeState({
      connected: true,
      providerId: selected.id,
      providerLabel: selected.label,
      address,
      chainId
    });
    notify(`Connected ${selected.label}`);
  }

  async function switchConnectedWalletNetwork() {
    const selected = getSelectedDetectedWallet();
    if (!selected?.provider?.request) throw new Error('Selected wallet does not support network switching');
    if (!_walletState.connected || !isAddr(_walletState.address)) throw new Error('Connect a browser wallet first');
    if (!_chainId) throw new Error('Current RPC chain is not ready yet');
    const chainHex = `0x${Number(_chainId).toString(16)}`;
    try {
      await selected.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] });
    } catch (error) {
      if (error?.code === 4902 || /Unrecognized chain|Unknown chain|not added/i.test(String(error?.message || ''))) {
        throw new Error('Selected wallet does not know this chain yet. Please add it in the wallet and retry.');
      }
      throw error;
    }
    const chainId = await readProviderChainId(selected.provider);
    setWalletRuntimeState({
      connected: true,
      providerId: selected.id,
      providerLabel: selected.label,
      address: _walletState.address,
      chainId
    });
    notify('Wallet network switched to match the selected RPC');
  }

  async function disconnectBrowserWallet() {
    const selected = getSelectedDetectedWallet();
    const provider = selected?.provider || null;
    const providerLabel = _walletState.providerLabel || selected?.label || 'browser wallet';
    const previousAddress = normAddr(_walletState.address || '');

    if (previousAddress && _selectedUser && previousAddress.toLowerCase() === String(_selectedUser).toLowerCase()) {
      _selectedUser = '';
    }

    if (selected?.kind === 'ledger-direct' || _walletState.providerId === LEDGER_DIRECT_ID) {
      writeWalletSessionHint(null);
      clearWalletRuntime();
      setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
      notify(`Disconnected ${providerLabel}. Reconnect to reopen the Ledger prompt and choose the device again.`);
      return;
    }

    const revokeResult = await revokeWalletAccountPermission(provider, 1200);
    writeWalletSessionHint(null);
    clearWalletRuntime();
    setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });

    if (revokeResult === 'revoked') {
      notify(`Disconnected ${providerLabel} and cleared wallet account permission`);
      return;
    }
    if (revokeResult === 'timeout') {
      notify(`Disconnected ${providerLabel}. Wallet permission revoke timed out, so if the old address still auto-selects you may need to revoke this site's access inside the wallet once.`);
      return;
    }
    notify(`Disconnected ${providerLabel}. If the wallet still auto-selects the old address, revoke site access inside the wallet once and retry.`);
  }

  function handleActiveWalletAccountsChanged(providerInfo, accounts) {
    if (!_walletState.connected || providerInfo?.id !== _walletState.providerId) return;
    const nextAddress = normAddr(Array.isArray(accounts) ? accounts[0] || '' : '');
    const previousAddress = normAddr(_walletState.address || '');

    if (!isAddr(nextAddress)) {
      if (previousAddress && _selectedUser && previousAddress.toLowerCase() === String(_selectedUser).toLowerCase()) {
        _selectedUser = '';
      }
      writeWalletSessionHint(null);
      setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
      notify(`${providerInfo?.label || 'Browser wallet'} disconnected or no account is currently shared with this site`);
      return;
    }

    if (previousAddress && previousAddress.toLowerCase() === String(_selectedUser || '').toLowerCase() && previousAddress.toLowerCase() !== nextAddress.toLowerCase()) {
      _selectedUser = '';
    }

    setWalletRuntimeState({
      connected: true,
      providerId: providerInfo.id,
      providerLabel: providerInfo.label,
      address: nextAddress,
      chainId: _walletState.chainId
    });
    notify(`${providerInfo.label} switched account to ${shorten(nextAddress)}`,'info');
  }

  async function handleActiveWalletChainChanged(providerInfo) {
    if (!_walletState.connected || providerInfo?.id !== _walletState.providerId) return;
    const chainId = await readProviderChainId(providerInfo.provider);
    setWalletRuntimeState({
      connected: true,
      providerId: providerInfo.id,
      providerLabel: providerInfo.label,
      address: _walletState.address,
      chainId
    });
  }

  function bindDetectedWalletEvents() {
    detectBrowserWallets().forEach((item) => {
      if (!item.provider?.on || _walletEventBindings.has(item.provider)) return;
      item.provider.on('accountsChanged', (accounts) => {
        handleActiveWalletAccountsChanged(item, accounts);
      });
      item.provider.on('chainChanged', () => {
        handleActiveWalletChainChanged(item);
      });
      _walletEventBindings.add(item.provider);
    });
  }

  const SECTIONS = {
    staple: {
      label: 'Staple',
      modes: ['address-provider'],
      keys: [
        { key: 'jrPricing_factory', label: 'JR Pricing Factory' },
        { key: 'staple_controller', label: 'Controller' },
        { key: 'staple_router', label: 'Router' },
        { key: 'staple_priceProvider', label: 'Price Provider' },
        { key: 'staple_incentivesController', label: 'Incentives Controller' },
        { key: 'staple_poolImpl', label: 'Pool Implementation' },
        { key: 'staple_uiPoolDataProvider', label: 'UI Pool Data Provider' },
        { key: 'staple_testTokenFactory', label: 'Token Factory (Optional)' },
        { key: 'staple_oracleVerifierStaple', label: 'Verifier: Staple' },
        { key: 'staple_oracleVerifierChainlinkDataFeed', label: 'Verifier: Chainlink Data Feed' },
        { key: 'staple_oracleVerifierChainlinkStream', label: 'Verifier: Chainlink Stream' },
        { key: 'staple_oracleVerifierRedstone', label: 'Verifier: Redstone' },
        { key: 'staple_oracleVerifierBondifyJr', label: 'Verifier: Bondify Jr' },
        { key: 'staple_redstoneExtractor', label: 'Redstone Extractor' },
        { key: 'staple_mockCurve', label: 'Mock Curve' },
        { key: 'staple_mockUniswapV2', label: 'Mock Uniswap V2' },
        { key: 'staple_mockUniswapV3', label: 'Mock Uniswap V3' },
        { key: 'staple_mockDexAggregator', label: 'Mock Dex Aggregator' }
      ]
    }
  };

  const MODE_LABELS = {
    fixed: 'Manual Addresses',
    'address-provider': 'Address Provider'
  };

  const PROVIDER_FIELD_MAP = {
    controller: 'staple_controller',
    incentivesController: 'staple_incentivesController',
    router: 'staple_router',
    priceProvider: 'staple_priceProvider',
    oracleVerifierStaple: 'staple_oracleVerifierStaple',
    oracleVerifierChainlinkDataFeed: 'staple_oracleVerifierChainlinkDataFeed',
    oracleVerifierChainlinkStreamV3V8: 'staple_oracleVerifierChainlinkStream',
    oracleVerifierRedstone: 'staple_oracleVerifierRedstone',
    oracleVerifierBondifyJr: 'staple_oracleVerifierBondifyJr',
    redstoneExtractor: 'staple_redstoneExtractor',
    poolImpl: 'staple_poolImpl',
    uiPoolDataProvider: 'staple_uiPoolDataProvider',
    stapleTestERC20Factory: 'staple_testTokenFactory',
    mockCurve: 'staple_mockCurve',
    mockUniswapV2: 'staple_mockUniswapV2',
    mockUniswapV3: 'staple_mockUniswapV3',
    mockDexAggregator: 'staple_mockDexAggregator'
  };

  const ADDRESS_PROVIDER_ABI = [
    'function controller() view returns (address)',
    'function incentivesController() view returns (address)',
    'function router() view returns (address)',
    'function priceProvider() view returns (address)',
    'function oracleVerifierStaple() view returns (address)',
    'function oracleVerifierChainlinkDataFeed() view returns (address)',
    'function oracleVerifierChainlinkStreamV3V8() view returns (address)',
    'function oracleVerifierRedstone() view returns (address)',
    'function oracleVerifierBondifyJr() view returns (address)',
    'function redstoneExtractor() view returns (address)',
    'function poolImpl() view returns (address)',
    'function uiPoolDataProvider() view returns (address)',
    'function stapleTestERC20Factory() view returns (address)',
    'function mockCurve() view returns (address)',
    'function mockUniswapV2() view returns (address)',
    'function mockUniswapV3() view returns (address)',
    'function mockDexAggregator() view returns (address)'
  ];

  const STORAGE = {
    USER: 'staple_env_user_v2',
    RPC: 'staple_env_rpc_v6',
    CONFIG: 'staple_env_config_v7',
    DISCOVERY: 'staple_env_discovery_v7',
    ACCESS: 'staple_env_access_v2',
    CHAINLINK: 'staple_env_chainlink_v4',
    WALLET: 'staple_env_wallet_v1'
  };

  const SESSION_STORAGE = {
    WALLET_PROVIDER: 'staple_env_wallet_provider_session_v1',
    CHAINLINK: 'staple_env_chainlink_session_v1'
  };

  const DEFAULT_RPC_LIST = [
    { id: 'sepolia-publicnode', name: 'Sepolia PublicNode', url: 'https://ethereum-sepolia-rpc.publicnode.com' },
    { id: 'ethereum-publicnode', name: 'Ethereum PublicNode', url: 'https://ethereum-rpc.publicnode.com' }
  ];

  const DEFAULT_ENV_CONFIG = {
    name: 'Global Environment',
    sections: {
      bondify: { mode: 'fixed', addresses: {} },
      staple: { mode: 'address-provider', addresses: {}, versions: [], selectedVersionId: '' }
    }
  };

  const CACHE = { POOL: 'staple_cache_pool_v4', SYM: 'staple_cache_sym_v4', TTL_P: 600000, TTL_S: 86400000, THR: 10000 };
  const STAPLE_UI_POOL_DATA_PROVIDER_ABI = typeof stapleUIPoolDataProviderAbi !== 'undefined'
    ? stapleUIPoolDataProviderAbi
    : (Array.isArray(globalThis?.stapleUIPoolDataProviderAbi) ? globalThis.stapleUIPoolDataProviderAbi : null);

  let _rpcList = [];
  let _selectedRpcIndex = 0;
  let _envConfig = normalizeRpcConfig(DEFAULT_ENV_CONFIG);
  let _discoveryCache = {};
  let _accessCache = {};
  let _currentDiscovery = null;

  let _userList = [];
  let _selectedUser = '';
  let _generatedWalletPreview = null;
  let _chainlinkConfig = { apiKey: '', apiSecret: '' };
  let _rememberChainlinkForSession = false;
  let _walletState = { connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 };
  let _walletRuntime = { kind: '', signer: null, cleanup: null, deviceLabel: '' };
  const _walletEventBindings = new WeakSet();

  let _chainId = 0;
  let _blockNumber = 0;
  let _blockTime = 0;
  let _provider = null;
  let _uiPoolContract = null;
  let _envRefreshing = false;
  let _lastPR = 0;
  let _lastSR = 0;
  let _rpcLoadSeq = 0;
  let _rpcEditorState = { mode: 'create', id: '' };
  let _versionEditorState = { mode: 'create', id: '' };
  let _userEditorState = { mode: 'create', address: '' };
  let _readyResolve = null;
  let _readyPromise = new Promise((resolve) => { _readyResolve = resolve; });
  let _minterAnalyzerPromise = null;
  let _accessControlInspectTimer = null;
  let _accessControlInspectSeq = 0;
  let _accessControlRevokeConfirmState = { key: '', expiresAt: 0 };
  let _accessControlState = {
    inspected: false,
    contractAddress: '',
    role: '',
    currentUser: '',
    roleExists: false,
    enumerable: false,
    canManage: false,
    adminRole: '',
    adminMembers: [],
    selectedAdminUser: '',
    members: [],
    note: 'Waiting for a valid contract address and role.'
  };

  const MINTER_PROXY_STANDARD_SLOTS = [
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3',
    '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7'
  ];
  const MINTER_PROXY_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
  const SEARCH_SELECT_DEBOUNCE_MS = 500;
  const ACCESS_CONTROL_AUTO_INSPECT_MS = 500;
  const ROLE_LIBRARY = [
    { roleConstant: 'DEFAULT_ADMIN_ROLE', roleBodyName: 'DEFAULT_ADMIN_ROLE', bytes32: '0x0000000000000000000000000000000000000000000000000000000000000000', definition: 'bytes32(0)', canonicalSource: 'openzeppelin-accesscontrol-default' },
    { roleConstant: 'OPERATOR_ROLE', roleBodyName: 'OPERATOR_ROLE', bytes32: '0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929', definition: 'keccak256("OPERATOR_ROLE")', canonicalSource: 'contracts/main/controller/Controller.sol' },
    { roleConstant: 'GUARDIAN_ROLE', roleBodyName: 'GUARDIAN_ROLE', bytes32: '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041', definition: 'keccak256("GUARDIAN_ROLE")', canonicalSource: 'contracts/main/controller/Controller.sol' },
    { roleConstant: 'MANAGER_ROLE', roleBodyName: 'MANAGER_ROLE', bytes32: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08', definition: 'keccak256("MANAGER_ROLE")', canonicalSource: 'contracts/main/oracle/OracleVerifierBasic.sol' },
    { roleConstant: 'CREATE_INCENTIVES_ROLE', roleBodyName: 'CREATE_INCENTIVES_ROLE', bytes32: '0x59798917d75c78b7a0e05acf95a9deb3d7eba6d6cb800e51a647fb4d7648e4c9', definition: 'keccak256("CREATE_INCENTIVES_ROLE")', canonicalSource: 'contracts/main/controller/IncentivesController.sol' },
    { roleConstant: 'SWAP_ROLE', roleBodyName: 'SWAP_ROLE', bytes32: '0x499b8dbdbe4f7b12284c4a222a9951ce4488b43af4d09f42655d67f73b612fe1', definition: 'keccak256("SWAP_ROLE")', canonicalSource: 'contracts/main/router/Router.sol' },
    { roleConstant: 'DEPOSIT_ROLE', roleBodyName: 'DEPOSIT_ROLE', bytes32: '0x2561bf26f818282a3be40719542054d2173eb0d38539e8a8d3cff22f29fd2384', definition: 'keccak256("DEPOSIT_ROLE")', canonicalSource: 'contracts/main/router/Router.sol' },
    { roleConstant: 'ADJUST_BUCKET_PARAM_ROLE', roleBodyName: 'ADJUST_BUCKET_PARAM_ROLE', bytes32: '0xe0f04ebee36271f6eed75f10caec313465ff995508c4d01ee2c3d8b3a5aacb03', definition: 'keccak256("ADJUST_BUCKET_PARAM_ROLE")', canonicalSource: 'contracts/main/pool/PoolRateLimited.sol' },
    { roleConstant: 'TOKEN_PRICED_BY_NONE_ROLE', roleBodyName: 'TOKEN_PRICED_BY_NONE_ROLE', bytes32: '0xe14069cb75d3463b05c50fac6e274c42d7a008d9535de15f445716bcaed823b9', definition: 'keccak256("TOKEN_PRICED_BY_NONE_ROLE")', canonicalSource: 'contracts/periphery/testSupport/testToken/StapleTestERC20Factory.sol' },
    { roleConstant: 'TOKEN_PRICED_BY_STAPLE_ROLE', roleBodyName: 'TOKEN_PRICED_BY_STAPLE_ROLE', bytes32: '0x768a17d6ffeb6ba824dd57ae9e51cfc0bbefb90cc255287ca59b7f7928813da3', definition: 'keccak256("TOKEN_PRICED_BY_STAPLE_ROLE")', canonicalSource: 'contracts/periphery/testSupport/testToken/StapleTestERC20Factory.sol' },
    { roleConstant: 'TOKEN_PRICED_BY_CHAINLINK_DATA_FEED_ROLE', roleBodyName: 'TOKEN_PRICED_BY_CHAINLINK_DATA_FEED_ROLE', bytes32: '0x70f2a1a40ca8743cb2f9bd30b56f5549cf5af23bcc4698b3fb92e42a744a3c57', definition: 'keccak256("TOKEN_PRICED_BY_CHAINLINK_DATA_FEED_ROLE")', canonicalSource: 'contracts/periphery/testSupport/testToken/StapleTestERC20Factory.sol' },
    { roleConstant: 'TOKEN_PRICED_BY_CHAINLINK_STREAM_ROLE', roleBodyName: 'TOKEN_PRICED_BY_CHAINLINK_STREAM_ROLE', bytes32: '0x79e7934bf1664083bbeb7845e7514a68f3eb9ba9cbf40f66b0fa6cf7c80518a3', definition: 'keccak256("TOKEN_PRICED_BY_CHAINLINK_STREAM_ROLE")', canonicalSource: 'contracts/periphery/testSupport/testToken/StapleTestERC20Factory.sol' },
    { roleConstant: 'TOKEN_PRICED_BY_REDSTONE_ROLE', roleBodyName: 'TOKEN_PRICED_BY_REDSTONE_ROLE', bytes32: '0x115c3806bbe0ab31d995af19606992e1a03a392b854491fd1a49206abb9dcf4c', definition: 'keccak256("TOKEN_PRICED_BY_REDSTONE_ROLE")', canonicalSource: 'contracts/periphery/testSupport/testToken/StapleTestERC20Factory.sol' },
    { roleConstant: 'TOKEN_PRICED_BY_BONDIFY_JR_ROLE', roleBodyName: 'TOKEN_PRICED_BY_BONDIFY_JR_ROLE', bytes32: '0x5105dcc022fa03e8b9e0a3b8e54c03c8d9d161677f2ec83a31c7aa2b848ec1c3', definition: 'keccak256("TOKEN_PRICED_BY_BONDIFY_JR_ROLE")', canonicalSource: 'contracts/periphery/testSupport/testToken/StapleTestERC20Factory.sol' }
  ];
  const _searchSelectState = {};

  function notify(message) {
    if (!message) return;
    try {
      COMMON.notifyUser?.(String(message));
    } catch {}
  }

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase().trim();
  }

  function fuzzyMatchOption(option, query) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return true;
    const haystack = normalizeSearchText(option?.searchText || `${option?.title || ''} ${option?.subtitle || ''} ${option?.value || ''}`);
    return normalizedQuery.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
  }

  function buildResolvedContractOptions() {
    const byAddress = new Map();
    Object.entries(SECTIONS).forEach(([secId, sec]) => {
      if (secId === 'bondify') return;
      sec.keys.forEach((item) => {
        const meta = resolveAddressMeta(item.key);
        if (!isAddr(meta?.value)) return;
        const address = normAddr(meta.value);
        const key = address.toLowerCase();
        const existing = byAddress.get(key) || {
          value: address,
          title: item.label,
          subtitles: [],
          labels: []
        };
        existing.labels.push(item.label);
        existing.subtitles.push(`${sec.label} · ${meta.source || 'resolved'}`);
        byAddress.set(key, existing);
      });
    });
    return Array.from(byAddress.values()).map((item) => ({
      value: item.value,
      title: item.labels[0],
      subtitle: `${[...new Set(item.subtitles)].join(' · ')} · ${item.value}`,
      searchText: `${item.labels.join(' ')} ${item.subtitles.join(' ')} ${item.value}`
    })).sort((left, right) => left.title.localeCompare(right.title));
  }

  function buildRoleOptions() {
    const byBytes = new Map();
    ROLE_LIBRARY.forEach((role) => {
      const key = normalizeSearchText(role.bytes32);
      if (!key || byBytes.has(key)) return;
      byBytes.set(key, {
        value: role.bytes32,
        title: role.roleConstant,
        subtitle: `${role.bytes32} · ${role.canonicalSource}`,
        searchText: `${role.roleConstant} ${role.roleBodyName} ${role.bytes32} ${role.definition} ${role.canonicalSource}`
      });
    });
    return Array.from(byBytes.values()).sort((left, right) => left.title.localeCompare(right.title));
  }

  function buildUserOptions() {
    return _userList.map((user) => ({
      value: user.address,
      title: user.nickname || shorten(user.address),
      subtitle: `${user.address}${user.tags?.length ? ` · ${user.tags.join(', ')}` : ''}`,
      searchText: `${user.nickname || ''} ${user.address} ${(user.tags || []).join(' ')}`
    })).sort((left, right) => left.title.localeCompare(right.title));
  }

  function buildMinterTokenOptions() {
    let symbolMap = {};
    try {
      symbolMap = getSymbols() || {};
    } catch (_) {
      symbolMap = {};
    }
    return Object.entries(symbolMap)
      .map(([address, symbol]) => ({
        address: normAddr(address),
        symbol: String(symbol || '').trim()
      }))
      .filter((item) => isAddr(item.address))
      .map((item) => ({
        value: item.address,
        title: item.symbol || shorten(item.address),
        subtitle: `${item.address} · cached in Symbols`,
        searchText: `${item.symbol || ''} ${item.address} cached symbol token`
      }))
      .sort((left, right) => left.title.localeCompare(right.title) || left.value.localeCompare(right.value));
  }

  function isAccessControlSearchSelect(key) {
    return key === 'grant-contract' || key === 'grant-role' || key === 'grant-grantee';
  }

  function resolveRoleInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^0x[a-fA-F0-9]{64}$/.test(raw)) return raw;
    const match = ROLE_LIBRARY.find((role) => normalizeSearchText(role.roleConstant) === normalizeSearchText(raw) || normalizeSearchText(role.roleBodyName) === normalizeSearchText(raw));
    return match?.bytes32 || raw;
  }

  function searchSelectConfig(key) {
    return {
      'grant-contract': {
        inputId: 'grant-role-contract',
        panelId: 'search-select-panel-grant-contract',
        listId: 'search-select-list-grant-contract',
        metaId: 'grant-role-contract-meta',
        buildOptions: buildResolvedContractOptions,
        emptyText: 'No resolved contract matches this search.',
        onSelect: (option) => {
          const input = document.getElementById('grant-role-contract');
          if (input) input.value = option.value;
        }
      },
      'grant-role': {
        inputId: 'grant-role-bytes32',
        panelId: 'search-select-panel-grant-role',
        listId: 'search-select-list-grant-role',
        metaId: 'grant-role-bytes32-meta',
        buildOptions: buildRoleOptions,
        emptyText: 'No role matches this search.',
        onSelect: (option) => {
          const input = document.getElementById('grant-role-bytes32');
          if (input) input.value = option.value;
        }
      },
      'grant-grantee': {
        inputId: 'grant-role-account',
        panelId: 'search-select-panel-grant-grantee',
        listId: 'search-select-list-grant-grantee',
        metaId: 'grant-role-account-meta',
        buildOptions: buildUserOptions,
        emptyText: 'No saved user matches this search.',
        onSelect: (option) => {
          const input = document.getElementById('grant-role-account');
          if (input) input.value = option.value;
        }
      },
      'minter-token': {
        inputId: 'minter-v2-token',
        panelId: 'search-select-panel-minter-token',
        listId: 'search-select-list-minter-token',
        metaId: 'minter-v2-token-meta',
        buildOptions: buildMinterTokenOptions,
        emptyText: 'No cached token found in Symbols. Refresh Symbols or paste a token address directly.',
        onSelect: (option) => {
          const input = document.getElementById('minter-v2-token');
          if (input) input.value = option.value;
        }
      },
      'minter-receiver': {
        inputId: 'minter-v2-receiver',
        panelId: 'search-select-panel-minter-receiver',
        listId: 'search-select-list-minter-receiver',
        metaId: 'minter-v2-receiver-meta',
        buildOptions: buildUserOptions,
        emptyText: 'No saved user matches this search.',
        onSelect: (option) => {
          const input = document.getElementById('minter-v2-receiver');
          if (input) input.value = option.value;
        }
      }
    }[key] || null;
  }

  function closeSearchSelect(key) {
    const config = searchSelectConfig(key);
    const root = document.querySelector(`[data-search-select="${key}"]`);
    const panel = document.getElementById(config?.panelId || '');
    if (_searchSelectState[key]?.timer) {
      clearTimeout(_searchSelectState[key].timer);
      _searchSelectState[key].timer = null;
    }
    if (root) root.classList.remove('is-open');
    if (panel) panel.hidden = true;
    if (_searchSelectState[key]) _searchSelectState[key].open = false;
  }

  function updateSearchSelectMeta(key) {
    const config = searchSelectConfig(key);
    const input = document.getElementById(config?.inputId || '');
    const meta = document.getElementById(config?.metaId || '');
    if (!config || !input || !meta) return;
    const options = config.buildOptions();
    const rawValue = String(input.value || '').trim();
    const resolvedValue = key === 'grant-role' ? resolveRoleInput(rawValue) : rawValue;
    const match = options.find((option) => normalizeSearchText(option.value) === normalizeSearchText(resolvedValue));
    if (match) {
      meta.textContent = `${match.title} · ${match.subtitle}`;
      return;
    }
    if (!rawValue) {
      if (key === 'grant-contract') meta.textContent = 'Choose from resolved addresses or enter a contract address directly.';
      if (key === 'grant-role') meta.textContent = 'Search by role name or bytes32. Selecting a role fills the canonical bytes32 value.';
      if (key === 'grant-grantee') meta.textContent = 'Pick a saved user as grantee or enter any address manually.';
      if (key === 'minter-token') meta.textContent = 'Pick a token from the Symbols cache or paste any token address manually.';
      if (key === 'minter-receiver') meta.textContent = 'Pick a saved user as receiver or enter any address manually.';
      return;
    }
    meta.textContent = key === 'grant-role'
      ? `Manual role input: ${resolvedValue}`
      : `Manual value: ${rawValue}`;
  }

  function renderSearchSelectOptions(key, query = '') {
    const config = searchSelectConfig(key);
    const list = document.getElementById(config?.listId || '');
    const panel = document.getElementById(config?.panelId || '');
    const root = document.querySelector(`[data-search-select="${key}"]`);
    if (!config || !list || !panel || !root) return;

    const allOptions = config.buildOptions();
    const filtered = allOptions.filter((option) => fuzzyMatchOption(option, query)).slice(0, 40);
    list.innerHTML = filtered.length
      ? filtered.map((option) => `
          <button type="button" class="search-select__option" data-search-select-option="${esc(key)}" data-value="${esc(option.value)}">
            <span class="search-select__title">${esc(option.title)}</span>
            <span class="search-select__meta">${esc(option.subtitle)}</span>
          </button>
        `).join('')
      : `<div class="search-select__empty">${esc(config.emptyText || 'No results')}</div>`;

    list.querySelectorAll(`[data-search-select-option="${key}"]`).forEach((button) => {
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const value = String(button.getAttribute('data-value') || '');
        const option = allOptions.find((item) => item.value === value);
        if (!option) return;
        config.onSelect?.(option);
        updateSearchSelectMeta(key);
        if (isAccessControlSearchSelect(key)) renderAccessControlState();
        if (key === 'grant-contract' || key === 'grant-role') scheduleAccessControlInspect();
        closeSearchSelect(key);
      });
    });

    panel.hidden = false;
    root.classList.add('is-open');
    _searchSelectState[key] = { ...(_searchSelectState[key] || {}), open: true, query };
  }

  function scheduleSearchSelect(key, query) {
    const nextState = _searchSelectState[key] || {};
    if (nextState.timer) clearTimeout(nextState.timer);
    nextState.timer = setTimeout(() => {
      renderSearchSelectOptions(key, query);
      updateSearchSelectMeta(key);
    }, SEARCH_SELECT_DEBOUNCE_MS);
    _searchSelectState[key] = nextState;
  }

  function bindSearchSelect(key) {
    const config = searchSelectConfig(key);
    const input = document.getElementById(config?.inputId || '');
    const toggle = document.querySelector(`[data-search-select-toggle="${key}"]`);
    if (!config || !input || input.dataset.searchSelectBound === 'true') return;
    input.dataset.searchSelectBound = 'true';

    input.addEventListener('focus', () => {
      renderSearchSelectOptions(key, input.value || '');
      updateSearchSelectMeta(key);
      if (isAccessControlSearchSelect(key)) renderAccessControlState();
    });
    input.addEventListener('input', () => {
      scheduleSearchSelect(key, input.value || '');
      updateSearchSelectMeta(key);
      if (isAccessControlSearchSelect(key)) renderAccessControlState();
      if (key === 'grant-contract' || key === 'grant-role') scheduleAccessControlInspect();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeSearchSelect(key);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        renderSearchSelectOptions(key, input.value || '');
      }
      if (event.key === 'Enter') closeSearchSelect(key);
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        updateSearchSelectMeta(key);
        if (isAccessControlSearchSelect(key)) renderAccessControlState();
        if (key === 'grant-contract' || key === 'grant-role') scheduleAccessControlInspect();
        closeSearchSelect(key);
      }, 120);
    });

    toggle?.addEventListener('click', () => {
      const panel = document.getElementById(config.panelId);
      if (panel && !panel.hidden) {
        closeSearchSelect(key);
        return;
      }
      renderSearchSelectOptions(key, input.value || '');
      input.focus();
    });
  }

  function bindSearchSelects() {
    const keys = ['grant-contract', 'grant-role', 'grant-grantee', 'minter-token', 'minter-receiver'];
    keys.forEach(bindSearchSelect);
    if (!document.body.dataset.searchSelectOutsideBound) {
      document.body.dataset.searchSelectOutsideBound = 'true';
      document.addEventListener('click', (event) => {
        keys.forEach((key) => {
          const root = document.querySelector(`[data-search-select="${key}"]`);
          if (!root || root.contains(event.target)) return;
          closeSearchSelect(key);
        });
      });
    }
  }

  function setGrantRoleStatus(message = '', type = '') {
    const el = document.getElementById('grant-role-status');
    const titleEl = document.getElementById('grant-role-status-title');
    const detailEl = document.getElementById('grant-role-status-detail');
    if (!el || !titleEl || !detailEl) return;
    el.className = 'grant-role-status';
    if (type === 'error') el.classList.add('is-error');
    if (type === 'success') el.classList.add('is-success');
    if (type === 'error') {
      titleEl.textContent = 'Load Failed';
      detailEl.textContent = message || 'Access-control data could not be loaded.';
      return;
    }
    if (type === 'success') {
      if (/transaction/i.test(message || '')) {
        titleEl.textContent = 'Transaction Submitted';
      } else if (/loaded|enumerate|role metadata|access-control data/i.test(message || '')) {
        titleEl.textContent = 'Data Loaded';
      } else {
        titleEl.textContent = 'Updated';
      }
      detailEl.textContent = message || 'Access-control data loaded successfully.';
      return;
    }
    titleEl.textContent = 'Loading';
    detailEl.textContent = message || 'Access-control data is loading automatically.';
  }

  function accessControlRevokeConfirmKey(memberAddress = '') {
    const normalizedMember = normAddr(String(memberAddress || '').trim());
    const selectionKey = accessControlSelectionKey();
    if (!normalizedMember || !selectionKey) return '';
    return `${selectionKey}::${normalizedMember.toLowerCase()}`;
  }

  function isAccessControlRevokeArmed(memberAddress = '') {
    const key = accessControlRevokeConfirmKey(memberAddress);
    return !!(key && _accessControlRevokeConfirmState.key === key && _accessControlRevokeConfirmState.expiresAt > Date.now());
  }

  function resetAccessControlRevokeButtonState(button, memberAddress = '') {
    const key = accessControlRevokeConfirmKey(memberAddress || button?.getAttribute?.('data-access-control-revoke') || '');
    if (!memberAddress || (_accessControlRevokeConfirmState.key && (!key || _accessControlRevokeConfirmState.key === key))) {
      _accessControlRevokeConfirmState = { key: '', expiresAt: 0 };
    }
    if (!button) return;
    if (!button.disabled) button.textContent = 'Remove';
  }

  function resetArmedAccessControlRevokeButtons(exceptButton = null) {
    document.querySelectorAll('[data-access-control-revoke]').forEach((button) => {
      if (exceptButton && button === exceptButton) return;
      resetAccessControlRevokeButtonState(button, button.getAttribute('data-access-control-revoke') || '');
    });
  }

  function armAccessControlRevokeButton(button, memberAddress = '') {
    if (!button) return;
    const key = accessControlRevokeConfirmKey(memberAddress);
    resetArmedAccessControlRevokeButtons(button);
    _accessControlRevokeConfirmState = {
      key,
      expiresAt: Date.now() + 4000
    };
    button.textContent = 'Confirm Remove';
    notify(`Click Confirm Remove again to remove ${shorten(memberAddress)} from the selected role.`);
  }

  function extractAccessControlBodyMessage(candidate) {
    const text = String(candidate || '').trim();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return String(parsed?.error?.message || parsed?.message || '').trim();
    } catch (_) {
      return '';
    }
  }

  function extractAccessControlErrorText(error) {
    const candidates = [
      error?.reason,
      error?.shortMessage,
      error?.data?.message,
      error?.data?.originalError?.message,
      error?.body,
      error?.error?.reason,
      error?.error?.data?.message,
      error?.error?.data?.originalError?.message,
      error?.error?.body,
      error?.error?.message,
      error?.info?.error?.message,
      error?.info?.payload?.method,
      error?.message,
      error
    ];
    for (const candidate of candidates) {
      const text = String(candidate || '').trim();
      if (!text) continue;
      const bodyMessage = extractAccessControlBodyMessage(text);
      if (bodyMessage) return bodyMessage;
      if (/execution reverted|AccessControlUnauthorizedAccount|AccessControlBadConfirmation|missing role|processing response error|Internal JSON-RPC error/i.test(text)) {
        return text;
      }
      return text;
    }
    return '';
  }

  function formatGrantRoleError(error) {
    const raw = extractAccessControlErrorText(error);
    if (!raw) return 'Access control action failed';
    if (raw.includes('Selection changed while data was refreshing') || raw.includes('Inspect the selected role again before modifying members')) {
      return 'Current selection changed. Wait for automatic refresh before editing members.';
    }
    if (raw.includes('Current user cannot manage this role')) {
      return 'Current user does not have admin permission to manage this role on the target contract.';
    }
    if (raw.includes('Selected contract does not expose AccessControl role metadata')) {
      return 'Selected contract does not expose AccessControl metadata.';
    }
    if (raw.includes('0xe2517d3f') || raw.includes('AccessControlUnauthorizedAccount') || /missing role|is missing role/i.test(raw)) {
      return 'Current user does not have admin permission to manage this role on the target contract.';
    }
    if (/AccessControlBadConfirmation|can only renounce roles for self|caller confirmation/i.test(raw)) {
      return 'Self-removal failed because the signer does not match the member address being removed.';
    }
    if (/unsupported operation|does not support sending transactions|contract runner does not support/i.test(raw)) {
      return 'Current user cannot sign transactions on this RPC. Connect the matching wallet or use an impersonation-capable local RPC.';
    }
    if (raw.includes('user rejected') || raw.includes('ACTION_REJECTED')) {
      return 'Access control transaction was cancelled.';
    }
    if (raw.includes('insufficient funds')) {
      return 'Current user does not have enough gas for this access control transaction.';
    }
    const reverted = raw.match(/execution reverted(?::| with reason string )\s*['"]?([^'"]+)['"]?/i);
    if (reverted?.[1]) return reverted[1].trim();
    const sanitized = raw.replace(/^Error:\s*/i, '').trim();
    if (sanitized.length <= 180) return sanitized;
    return 'Access control action failed';
  }

  function setMinterStatus(message = '', type = '') {
    const el = document.getElementById('minter-v2-status');
    const titleEl = document.getElementById('minter-v2-status-title');
    const detailEl = document.getElementById('minter-v2-status-detail');
    if (!el || !titleEl || !detailEl) return;
    el.className = 'minter-v2-status';
    if (type === 'error') el.classList.add('is-error');
    if (type === 'success') el.classList.add('is-success');
    if (type === 'error') {
      titleEl.textContent = 'Override Failed';
      detailEl.textContent = message || 'The balance override could not be applied.';
      return;
    }
    if (type === 'success') {
      titleEl.textContent = 'Override Applied';
      detailEl.textContent = message || 'The balance override completed successfully.';
      return;
    }
    titleEl.textContent = 'Inspecting';
    detailEl.textContent = message || 'Preparing balance override flow.';
  }

  function renderMinterAnalysis(items = []) {
    const container = document.getElementById('minter-v2-analysis');
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = '<div class="placeholder">No analysis yet</div>';
      return;
    }
    container.innerHTML = items.map((item) => `
      <div class="minter-v2-analysis-item">
        <strong>${esc(item.title || 'Analysis')}</strong>
        <div>${esc(item.message || '')}</div>
        ${item.extra ? `<div class="mono" style="margin-top:0.45rem">${esc(item.extra)}</div>` : ''}
      </div>
    `).join('');
  }

  function renderMinterV2Panel() {
    const rpcNameEl = document.getElementById('minter-v2-current-rpc-name');
    const rpcEl = document.getElementById('minter-v2-current-rpc');
    if (rpcNameEl) rpcNameEl.textContent = currentRpcName() || 'Not configured';
    if (rpcEl) rpcEl.textContent = currentRpcUrl() || 'Select an RPC endpoint';

    const effectiveUser = effectiveCurrentUserAddress();
    const userShortEl = document.getElementById('minter-v2-current-user-short');
    const userEl = document.getElementById('minter-v2-current-user');
    if (userShortEl) userShortEl.textContent = effectiveUser ? shorten(effectiveUser) : 'No user selected';
    if (userEl) {
      userEl.textContent = effectiveUser || 'Select a user in the Users tab';
      userEl.style.color = effectiveUser ? 'inherit' : 'red';
    }

    const receiverInput = document.getElementById('minter-v2-receiver');
    if (receiverInput && !receiverInput.value && isAddr(effectiveUser)) {
      receiverInput.value = effectiveUser;
    }

    const nativeRefreshButton = document.getElementById('btn-minter-v2-refresh-native');
    const nativeRefreshNote = document.getElementById('minter-v2-native-refresh-note');
    const nativeRefreshEnabled = !isProductionRuntime() && isAddr(effectiveUser);
    if (nativeRefreshButton) nativeRefreshButton.disabled = !nativeRefreshEnabled;
    if (nativeRefreshNote) {
      if (isProductionRuntime()) {
        nativeRefreshNote.textContent = 'This helper is disabled unless the selected RPC is a local test environment.';
      } else if (!isAddr(effectiveUser)) {
        nativeRefreshNote.textContent = 'Select a current user first. The native refresh transfer always uses the current user as sender.';
      } else {
        nativeRefreshNote.textContent = `Sends ${MINTER_NATIVE_REFRESH_AMOUNT_ETH} native token from the current user back to the same current user through RPC impersonation only, so MetaMask notices the new ETH balance after direct balance overrides.`;
      }
    }

    updateSearchSelectMeta('minter-token');
    updateSearchSelectMeta('minter-receiver');
  }

  async function getMinterAnalyzer() {
    if (!_minterAnalyzerPromise) {
      _minterAnalyzerPromise = import('https://cdn.jsdelivr.net/npm/evmole@0.7.0/dist/evmole.mjs');
    }
    return _minterAnalyzerPromise;
  }

  async function getMinterProvider() {
    const provider = _provider || await refreshProvider();
    if (!provider) throw new Error('RPC provider not ready');
    return provider;
  }

  async function minterPullContract(address, provider) {
    const code = await provider.getCode(address);
    if (!code || code === '0x' || code === '0x0') {
      throw new Error('Target address is not a contract');
    }
    const { contractInfo } = await getMinterAnalyzer();
    return contractInfo(code, { selectors: true, storage: true });
  }

  async function minterDetectAndPullLayout(address, provider) {
    const analysisResult = await minterPullContract(address, provider);
    if (!analysisResult) return null;

    for (const slot of MINTER_PROXY_STANDARD_SLOTS) {
      const slotValue = await provider.getStorageAt(address, toLegalSlot(slot));
      if (slotValue && slotValue.length === 66 && !/^0x0+$/.test(slotValue)) {
        return minterPullContract(`0x${slotValue.substring(26)}`, provider);
      }
    }

    for (const func of analysisResult.functions || []) {
      if (func.selector !== '5c60da1b') continue;
      const implementationExtra = await provider.call({ to: address, data: '0x5c60da1b' });
      if (implementationExtra && implementationExtra.length === 66) {
        return minterPullContract(`0x${implementationExtra.substring(26)}`, provider);
      }
      throw new Error('Cannot resolve proxy implementation address');
    }

    const beaconAddress = await provider.getStorageAt(address, MINTER_PROXY_BEACON_SLOT);
    if (beaconAddress && beaconAddress.length === 66 && !/^0x0+$/.test(beaconAddress)) {
      const implementationExtra = await provider.call({ to: `0x${beaconAddress.substring(26)}`, data: '0x5c60da1b' });
      if (implementationExtra && implementationExtra.length === 66) {
        return minterPullContract(`0x${implementationExtra.substring(26)}`, provider);
      }
      throw new Error('Cannot resolve beacon implementation address');
    }

    return analysisResult;
  }

  function minterExtractBalanceSlots(pullResult) {
    const storage = Array.isArray(pullResult?.storage) ? pullResult.storage : [];
    return storage
      .filter((item) => String(item?.type || '').startsWith('mapping') && !String(item?.type || '').includes('bool'))
      .filter((item) => Array.isArray(item?.reads) && Array.isArray(item?.writes))
      .filter((item) => item.reads.includes('70a08231') && item.writes.includes('23b872dd') && item.writes.includes('a9059cbb'));
  }

  async function minterBalanceOf(address, contract, provider) {
    const response = await provider.call({
      to: contract,
      data: `0x70a08231${String(address).replace(/^0x/, '').padStart(64, '0')}`
    });
    if (response && response.length === 66) return ethers.BigNumber.from(response);
    return null;
  }

  async function minterDetectDecimals(address, provider) {
    try {
      const response = await provider.call({ to: address, data: '0x313ce567' });
      if (response && response.length === 66) return Number(ethers.BigNumber.from(response).toString());
    } catch (_) {}
    return 18;
  }

  function toLegalSlot(slot) {
    const normalized = String(slot || '').startsWith('0x') ? String(slot) : `0x${String(slot || '')}`;
    return normalized.replace(/^0x0+/, '') ? normalized.replace(/^0x0+/, '0x') : '0x0';
  }

  async function minterSlotHash(location, key) {
    return ethers.utils.keccak256(ethers.utils.solidityPack(['uint256', 'uint256'], [location, key]));
  }

  async function minterSetStorage(provider, address, slot, value) {
    await provider.send('hardhat_setStorageAt', [
      address,
      toLegalSlot(slot),
      ethers.utils.hexZeroPad(value, 32)
    ]);
  }

  async function minterSetBalanceSlot(provider, balanceHex, holderAddress, contractAddress, slotInfo) {
    const slot = await minterSlotHash(ethers.utils.hexZeroPad(holderAddress, 32), `0x${slotInfo.slot}`);
    await minterSetStorage(provider, contractAddress, slot, balanceHex);
    return slot;
  }

  function formatMinterError(error) {
    const raw = String(error?.message || error || '').trim();
    if (!raw) return 'Balance override failed';
    if (raw.includes('hardhat_setStorageAt') || raw.includes('Method not found') || raw.includes('does not exist')) {
      return 'Current RPC does not support hardhat_setStorageAt. Use a local Hardhat or Anvil style RPC.';
    }
    if (/invalid address|must be a valid address/i.test(raw)) {
      return raw;
    }
    if (/not a contract/i.test(raw)) {
      return 'Target address is not a contract.';
    }
    if (/candidate|balance mapping|slot/i.test(raw)) {
      return raw;
    }
    return 'Balance override failed';
  }

  async function executeMinterV2() {
    const tokenInput = document.getElementById('minter-v2-token');
    const receiverInput = document.getElementById('minter-v2-receiver');
    const amountInput = document.getElementById('minter-v2-amount');

    const tokenAddress = normAddr(String(tokenInput?.value || '').trim());
    const receiverAddress = normAddr(String(receiverInput?.value || '').trim());
    const amountStr = String(amountInput?.value || '').trim();

    if (!isAddr(tokenAddress)) throw new Error('Token address must be a valid address');
    if (!isAddr(receiverAddress)) throw new Error('Receiver address must be a valid address');
    if (!amountStr || Number.isNaN(Number(amountStr))) throw new Error('Amount must be a valid number');

    const provider = await getMinterProvider();
    const decimals = await minterDetectDecimals(tokenAddress, provider);
    const amountBN = ethers.utils.parseUnits(amountStr, decimals || 18);
    if (amountBN.lte(0)) throw new Error('Amount must be greater than 0');

    setMinterStatus('Inspecting contract layout...');
    renderMinterAnalysis([{ title: 'Inspecting', message: 'Resolving implementation and scanning storage layout.' }]);

    const pullResult = await minterDetectAndPullLayout(tokenAddress, provider);
    const candidateSlots = minterExtractBalanceSlots(pullResult);
    renderMinterAnalysis(candidateSlots.length
      ? candidateSlots.map((slotInfo, index) => ({
          title: `Candidate Slot ${index + 1}`,
          message: `Type: ${slotInfo.type || 'mapping'} | slot ${slotInfo.slot}`,
          extra: `reads=${(slotInfo.reads || []).join(', ')} | writes=${(slotInfo.writes || []).join(', ')}`
        }))
      : [{ title: 'No Candidate Slot', message: 'No balance mapping candidate was detected from the analyzed layout.' }]);

    if (!candidateSlots.length) throw new Error('Unable to locate a candidate balance mapping slot');

    const previousBalance = await minterBalanceOf(receiverAddress, tokenAddress, provider);
    if (!previousBalance) throw new Error('Unable to read current ERC20 balance');
    if (previousBalance.eq(amountBN)) {
      setMinterStatus('Receiver balance already matches the requested amount.', 'success');
      notify('Receiver balance already matches the requested amount');
      return;
    }

    for (const slotInfo of candidateSlots) {
      const storageSlot = await minterSlotHash(ethers.utils.hexZeroPad(receiverAddress, 32), `0x${slotInfo.slot}`);
      const originalSlotValue = await provider.getStorageAt(tokenAddress, toLegalSlot(storageSlot));
      const patchedValue = ethers.BigNumber.from(originalSlotValue).shr(128).shl(128).or(amountBN);

      setMinterStatus(`Testing candidate slot ${shorten(String(slotInfo.slot || ''), 10, 6)} against the receiver balance.`);
      await minterSetBalanceSlot(provider, patchedValue.toHexString(), receiverAddress, tokenAddress, slotInfo);

      const newBalance = await minterBalanceOf(receiverAddress, tokenAddress, provider);
      if (newBalance && !newBalance.eq(previousBalance)) {
        renderMinterAnalysis([
          {
            title: 'Balance Override Succeeded',
            message: `Updated balance through candidate slot ${slotInfo.slot}.`,
            extra: `storage=${storageSlot} | previous=${previousBalance.toString()} | current=${newBalance.toString()}`
          }
        ]);
        setMinterStatus('The receiver balance was updated successfully. Detailed storage information is shown below.', 'success');
        notify('Balance updated successfully');
        return;
      }

      if (candidateSlots.length > 1) {
        await minterSetBalanceSlot(provider, originalSlotValue, receiverAddress, tokenAddress, slotInfo);
      }
    }

    throw new Error('Tried every candidate slot but none changed the ERC20 balance');
  }

  function accessControlUserFresh(state = _accessControlState) {
    const currentUser = effectiveCurrentUserAddress();
    const inspectedUser = normAddr(state?.currentUser || '');
    if (!inspectedUser) return true;
    return currentUser && currentUser.toLowerCase() === inspectedUser.toLowerCase();
  }

  function accessControlSelectionFresh(state = _accessControlState) {
    const contractInput = document.getElementById('grant-role-contract');
    const roleInput = document.getElementById('grant-role-bytes32');
    const selectedContract = normAddr(String(contractInput?.value || '').trim());
    const selectedRole = resolveRoleInput(String(roleInput?.value || '').trim());
    const inspectedContract = normAddr(state?.contractAddress || '');
    const inspectedRole = resolveRoleInput(String(state?.role || '').trim());
    if (!inspectedContract || !inspectedRole) return true;
    return selectedContract && selectedRole
      && selectedContract.toLowerCase() === inspectedContract.toLowerCase()
      && selectedRole.toLowerCase() === inspectedRole.toLowerCase();
  }

  function setAccessControlSummaryValue(id, text, tone = 'muted') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.setAttribute('data-tone', tone);
  }

  function renderAccessControlMembers() {
    const container = document.getElementById('access-control-members');
    const manageCard = document.getElementById('access-control-manage-card');
    if (!container || !manageCard) return;

    const state = _accessControlState || {};
    const currentUser = effectiveCurrentUserAddress();
    const userFresh = accessControlUserFresh(state);
    const selectionFresh = accessControlSelectionFresh(state);
    const canManage = !!state.inspected && !!state.canManage && userFresh && selectionFresh;

    if (!state.inspected || !selectionFresh) {
      container.innerHTML = `<div class="placeholder">${selectionFresh ? 'Access-control data will appear here after the contract address and role are both valid.' : 'Contract or role changed. Access-control data is refreshing automatically.'}</div>`;
      manageCard.hidden = true;
      return;
    }

    if (!state.enumerable) {
      container.innerHTML = '<div class="placeholder">The selected contract does not expose AccessControlEnumerable member listing for this role.</div>';
      manageCard.hidden = true;
      return;
    }

    if (!Array.isArray(state.members) || !state.members.length) {
      container.innerHTML = '<div class="placeholder">No member currently holds this role.</div>';
    } else {
      container.innerHTML = state.members.map((member) => {
        const normalizedMember = normAddr(member);
        const displayAddress = accessControlDisplayAddress(normalizedMember || member);
        const displayName = accessControlDisplayName(normalizedMember || member);
        const badges = [];
        if (currentUser && normalizedMember && normalizedMember.toLowerCase() === currentUser.toLowerCase()) badges.push('Current User');
        return `
          <div class="access-control-member-item">
            <div class="access-control-member-main">
              <div class="access-control-member-primary">
                <div class="access-control-member-address mono">${esc(displayAddress || normalizedMember || member)}</div>
                <div class="access-control-member-badges">${badges.length ? badges.map((badge) => `<span class="access-control-member-badge">${esc(badge)}</span>`).join('') : '<span class="access-control-member-badge is-muted">Member</span>'}</div>
              </div>
              ${displayName ? `<div class="access-control-member-name">${esc(displayName)}</div>` : ''}
            </div>
            <div class="access-control-member-actions">
              <button type="button" class="btn btn-secondary btn-sm access-control-copy-btn" data-copy-address="${esc(normalizedMember || member)}" title="Copy address">Copy</button>
              ${canManage ? `<button type="button" class="btn btn-secondary btn-sm" data-access-control-revoke="${esc(normalizedMember || member)}">${isAccessControlRevokeArmed(normalizedMember || member) ? 'Confirm Remove' : 'Remove'}</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    manageCard.hidden = !canManage;
  }

  function renderAccessControlState() {
    const state = _accessControlState || {};
    const currentUser = effectiveCurrentUserAddress();
    const userFresh = accessControlUserFresh(state);
    const selectionFresh = accessControlSelectionFresh(state);
    const stateFresh = !!state.inspected && userFresh && selectionFresh;
    const canManage = stateFresh && !!state.canManage;
    const adminUserEl = document.getElementById('access-control-admin-user');
    const useAdminButton = document.getElementById('btn-access-control-use-admin');
    const selectedAdminUser = normAddr(state.selectedAdminUser || '');
    const walletAddress = normAddr(_walletState.address || '');
    const walletConnected = !!(_walletState.connected && isAddr(walletAddress));
    const adminMatchesConnectedWallet = !!(walletConnected && selectedAdminUser && selectedAdminUser.toLowerCase() === walletAddress.toLowerCase());
    const adminAlreadyActive = !!(selectedAdminUser && currentUser && selectedAdminUser.toLowerCase() === currentUser.toLowerCase());
    const canUseAdminButton = !!(state.inspected && selectionFresh && selectedAdminUser && !adminAlreadyActive && (!walletConnected || adminMatchesConnectedWallet));
    const adminLabel = selectedAdminUser
      ? `${accessControlDisplayAddress(selectedAdminUser)}${accessControlDisplayName(selectedAdminUser) ? ` · ${accessControlDisplayName(selectedAdminUser)}` : ''}`
      : '-';

    setAccessControlSummaryValue('access-control-role-exists', state.inspected && selectionFresh ? (state.roleExists ? 'Yes' : 'No') : 'Waiting', state.inspected && selectionFresh ? (state.roleExists ? 'success' : 'danger') : 'muted');
    setAccessControlSummaryValue('access-control-user-can-manage', !state.inspected ? 'Waiting' : (!selectionFresh || !userFresh ? 'Refreshing' : (!currentUser ? 'No user selected' : (state.canManage ? 'Yes' : 'No'))), !state.inspected ? 'muted' : (canManage ? 'success' : 'danger'));
    setAccessControlSummaryValue('access-control-admin-role', state.inspected && selectionFresh ? (state.adminRole || '-') : '-', state.inspected && selectionFresh ? 'default' : 'muted');
    setAccessControlSummaryValue('access-control-member-count', state.inspected && selectionFresh && Array.isArray(state.members) ? String(state.members.length) : '0', state.inspected && selectionFresh ? 'default' : 'muted');

    if (adminUserEl) {
      adminUserEl.textContent = state.inspected && selectionFresh ? adminLabel : '-';
      adminUserEl.setAttribute('data-tone', state.inspected && selectionFresh && selectedAdminUser ? 'default' : 'muted');
    }
    if (useAdminButton) {
      useAdminButton.hidden = !canUseAdminButton;
      if (selectedAdminUser) useAdminButton.setAttribute('data-access-control-admin-user', selectedAdminUser);
      else useAdminButton.removeAttribute('data-access-control-admin-user');
    }

    const noteEl = document.getElementById('access-control-role-note');
    if (noteEl) {
      let note = state.note || 'Waiting for a valid contract address and role.';
      if (state.inspected && !selectionFresh) {
        note = 'Contract or role changed. Access-control data is refreshing automatically.';
      } else if (state.inspected && currentUser && !userFresh) {
        note = 'Current user changed. Access-control data is refreshing automatically.';
      } else if (state.inspected && selectionFresh && selectedAdminUser && walletConnected && !adminMatchesConnectedWallet && !canManage) {
        note = 'A different admin user was found, but the connected browser wallet currently controls signing. Connect that admin wallet or disconnect the current wallet before switching.';
      }
      noteEl.textContent = note;
    }

    renderAccessControlMembers();
  }

  function renderGrantRolePanel() {
    const currentUserShortEl = document.getElementById('grant-role-current-user-short');
    const currentUserEl = document.getElementById('grant-role-current-user');
    const currentUserTagsEl = document.getElementById('access-control-current-user-tags');
    const currentUserCopyButton = document.getElementById('grant-role-current-user-copy');
    const currentUser = effectiveCurrentUserAddress();
    const currentUserConfig = findUser(currentUser);
    const currentUserLabel = accessControlDisplayName(currentUser);
    const walletCurrent = !!(_walletState.connected && isAddr(_walletState.address) && currentUser && currentUser.toLowerCase() === String(_walletState.address).toLowerCase());
    if (currentUserShortEl) currentUserShortEl.textContent = currentUser ? accessControlDisplayAddress(currentUser) : 'No user selected';
    if (currentUserEl) {
      currentUserEl.textContent = currentUser
        ? (currentUserLabel || (walletCurrent ? 'Connected Browser Wallet' : 'Unnamed Saved Account'))
        : 'Select a user in Wallet & Accounts';
      currentUserEl.style.color = currentUser ? 'inherit' : 'red';
    }
    if (currentUserTagsEl) {
      const baseUser = currentUser ? (currentUserConfig || { address: currentUser, tags: [] }) : null;
      const tags = currentUser
        ? [...new Set([...(baseUser?.tags || []), ...autoUserTags(baseUser || { address: currentUser, tags: [] }), ...(walletCurrent ? ['browser wallet'] : [])])]
        : [];
      currentUserTagsEl.innerHTML = currentUser
        ? (tags.length ? tags.map((tag) => `<span class="user-tag${tag === 'active' ? '' : ''}">${esc(tag)}</span>`).join('') : `<span class="user-tag muted">${walletCurrent ? 'browser wallet' : 'saved account'}</span>`)
        : '<span class="user-tag muted">access control</span>';
    }
    if (currentUserCopyButton) {
      if (isAddr(currentUser)) {
        currentUserCopyButton.hidden = false;
        currentUserCopyButton.setAttribute('data-copy-address', currentUser);
      } else {
        currentUserCopyButton.hidden = true;
        currentUserCopyButton.removeAttribute('data-copy-address');
      }
    }
    const granteeInput = document.getElementById('grant-role-account');
    if (granteeInput && !granteeInput.value && isAddr(currentUser)) {
      granteeInput.value = currentUser;
    }
    updateSearchSelectMeta('grant-contract');
    updateSearchSelectMeta('grant-role');
    updateSearchSelectMeta('grant-grantee');
    renderAccessControlState();
  }

  async function inspectAccessControlRole({ silent = false } = {}) {
    const contractInput = document.getElementById('grant-role-contract');
    const roleInput = document.getElementById('grant-role-bytes32');
    const contractAddress = normAddr(String(contractInput?.value || '').trim());
    const role = resolveRoleInput(String(roleInput?.value || '').trim());
    const currentUser = effectiveCurrentUserAddress();

    if (!_provider) throw new Error('Current RPC provider is not ready yet');
    if (!isAddr(contractAddress)) throw new Error('Target contract must be a valid address');
    if (!/^0x[a-fA-F0-9]{64}$/.test(role)) throw new Error('Role must be a valid bytes32 hex string');
    if (roleInput) roleInput.value = role;
    if (!silent) setGrantRoleStatus('Reading access-control data...');

    const contract = new ethers.Contract(
      contractAddress,
      [
        'function hasRole(bytes32,address) view returns (bool)',
        'function getRoleAdmin(bytes32) view returns (bytes32)',
        'function getRoleMemberCount(bytes32) view returns (uint256)',
        'function getRoleMember(bytes32,uint256) view returns (address)'
      ],
      _provider
    );

    let adminRole;
    try {
      adminRole = await contract.getRoleAdmin(role);
    } catch (_) {
      throw new Error('Selected contract does not expose AccessControl role metadata');
    }

    let enumerable = true;
    let members = [];
    let adminMembers = [];
    try {
      const countBn = await contract.getRoleMemberCount(role);
      const count = Number(countBn?.toString?.() || countBn || 0);
      if (Number.isFinite(count) && count > 0) {
        const list = await Promise.all(Array.from({ length: count }, (_, index) => contract.getRoleMember(role, index).catch(() => null)));
        members = list.filter((item) => isAddr(item)).map((item) => normAddr(item));
      }

      const adminCountBn = await contract.getRoleMemberCount(adminRole);
      const adminCount = Number(adminCountBn?.toString?.() || adminCountBn || 0);
      if (Number.isFinite(adminCount) && adminCount > 0) {
        const adminList = await Promise.all(Array.from({ length: adminCount }, (_, index) => contract.getRoleMember(adminRole, index).catch(() => null)));
        adminMembers = adminList.filter((item) => isAddr(item)).map((item) => normAddr(item));
      }
    } catch (_) {
      enumerable = false;
    }

    let canManage = false;
    if (isAddr(currentUser)) {
      try {
        canManage = !!(await contract.hasRole(adminRole, currentUser));
      } catch (_) {
        canManage = false;
      }
    }
    const selectedAdminUser = pickAccessControlAdminUser(adminMembers);

    _accessControlState = {
      inspected: true,
      contractAddress,
      role,
      currentUser,
      roleExists: true,
      enumerable,
      canManage,
      adminRole,
      adminMembers,
      selectedAdminUser,
      members,
      note: enumerable
        ? (isAddr(currentUser)
          ? (canManage
            ? 'Current user already holds the required admin role and can add or remove members.'
            : (selectedAdminUser
              ? 'A saved or discoverable admin user is available. You can switch to it directly from the summary area.'
              : 'Current user does not hold the required admin role for this selection.'))
          : 'Select a current user in Wallet & Accounts to check whether the role is manageable.')
        : 'The contract exposes AccessControl metadata, but member enumeration is unavailable on this role contract.'
    };

    renderGrantRolePanel();
    if (!silent) {
      setGrantRoleStatus(enumerable
        ? `Loaded ${members.length} member${members.length === 1 ? '' : 's'} for the selected role.`
        : 'Loaded role metadata, but this contract does not enumerate members.', 'success');
    }
    return _accessControlState;
  }

  async function updateAccessControlMember(action = 'grant', targetAddress = '') {
    const contractInput = document.getElementById('grant-role-contract');
    const roleInput = document.getElementById('grant-role-bytes32');
    const accountInput = document.getElementById('grant-role-account');
    const contractAddress = normAddr(String(contractInput?.value || '').trim());
    const role = resolveRoleInput(String(roleInput?.value || '').trim());
    const memberAddress = normAddr(String(targetAddress || accountInput?.value || '').trim());
    const currentUser = effectiveCurrentUserAddress();
    const verb = action === 'revoke' ? 'remove' : 'add';

    if (!isAddr(currentUser)) throw new Error('Select a current user first');
    if (!isAddr(contractAddress)) throw new Error('Target contract must be a valid address');
    if (!/^0x[a-fA-F0-9]{64}$/.test(role)) throw new Error('Role must be a valid bytes32 hex string');
    if (!isAddr(memberAddress)) throw new Error('Member address must be a valid address');
    if (!_accessControlState.inspected || !accessControlUserFresh(_accessControlState) || !accessControlSelectionFresh(_accessControlState)) {
      throw new Error('Selection changed while data was refreshing');
    }
    if (!_accessControlState.canManage) {
      throw new Error('Current user cannot manage this role on the selected contract');
    }

    const signer = await COMMON.resolveSigner(currentUser);
    if (!signer) throw new Error(`Cannot resolve signer for current user ${currentUser}`);

    const contract = new ethers.Contract(
      contractAddress,
      [
        'function hasRole(bytes32,address) view returns (bool)',
        'function grantRole(bytes32,address)',
        'function revokeRole(bytes32,address)',
        'function renounceRole(bytes32,address)'
      ],
      signer
    );

    const alreadyGranted = await contract.hasRole(role, memberAddress).catch(() => false);
    if (action !== 'revoke' && alreadyGranted) {
      setGrantRoleStatus('The target address already holds this role.', 'success');
      notify('The member already has this role');
      return;
    }
    if (action === 'revoke' && !alreadyGranted) {
      setGrantRoleStatus('The target address does not currently hold this role.', 'success');
      notify('The member does not currently hold this role');
      return;
    }

    const removingSelf = action === 'revoke' && memberAddress.toLowerCase() === currentUser.toLowerCase();

    const tx = action === 'revoke'
      ? (removingSelf && typeof contract.renounceRole === 'function'
        ? await contract.renounceRole(role, currentUser)
        : await contract.revokeRole(role, memberAddress))
      : await contract.grantRole(role, memberAddress);
    await tx.wait();
    await inspectAccessControlRole({ silent: true });
    notify(action === 'revoke'
      ? 'Member removed successfully and the list has been refreshed.'
      : 'Member added successfully and the list has been refreshed.');
    if (accountInput && action !== 'revoke') accountInput.value = memberAddress;
  }

  function resetReadyPromise() {
    _readyPromise = new Promise((resolve) => {
      _readyResolve = resolve;
    });
  }

  function resolveReadyPromise() {
    if (_readyResolve) {
      const done = _readyResolve;
      _readyResolve = null;
      done();
    }
  }

  async function waitUntilReady(timeoutMs = 15000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (_provider && (!_envRefreshing || !!localStorage.getItem(pck()))) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }

  function makeRpcId(prefix = 'rpc') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function makeVersionId(prefix = 'ver') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function ensureRpcIds(list) {
    return (Array.isArray(list) ? list : []).map((entry, index) => ({
      id: entry?.id || makeRpcId(index === 0 ? 'rpc' : 'rpcx'),
      name: String(entry?.name || `RPC ${index + 1}`),
      url: String(entry?.url || '')
    }));
  }

  function normalizeStapleVersionEntry(raw, fallbackIndex = 0) {
    const version = String(raw?.version || '').trim();
    const addressProvider = normAddr(raw?.addressProvider || '');
    const jrPricingFactory = normAddr(raw?.jrPricingFactory || '');
    const label = String(raw?.label || version || `Version ${fallbackIndex + 1}`).trim();
    return {
      id: String(raw?.id || makeVersionId('ver')),
      label,
      version,
      addressProvider,
      jrPricingFactory
    };
  }

  function defaultSectionConfig(secId) {
    if (secId === 'staple') {
      return {
        mode: 'address-provider',
        addresses: {},
        versions: [],
        selectedVersionId: ''
      };
    }
    return {
      mode: 'fixed',
      addresses: {}
    };
  }

  function sanitizeSectionAddresses(secId, rawAddresses) {
    const allowed = new Set((SECTIONS[secId]?.keys || []).map((item) => item.key));
    const next = {};
    Object.entries(rawAddresses || {}).forEach(([key, value]) => {
      if (!allowed.has(key)) return;
      const normalized = normAddr(String(value || '').trim());
      if (!normalized) return;
      next[key] = normalized;
    });
    return next;
  }

  function parseTags(raw) {
    if (Array.isArray(raw)) {
      return [...new Set(raw.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))];
    }
    return [...new Set(String(raw || '')
      .split(/[，,\s]+/)
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean))];
  }

  function sanitizeUserTags(raw) {
    const forbidden = new Set(['pk configured', 'private-key', 'private key', 'privatekey', 'has-private-key', 'has private key']);
    return parseTags(raw).filter((tag) => !forbidden.has(tag));
  }

  function clearGeneratedWalletPreview() {
    _generatedWalletPreview = null;
  }

  function normalizeUserEntry(raw) {
    const address = normAddr(raw?.address || '');
    return {
      address,
      nickname: String(raw?.nickname || '').trim() || (address ? shorten(address) : ''),
      tags: sanitizeUserTags(raw?.tags)
    };
  }

  function accessCacheKey(rpcId, address) {
    return `${rpcId}::${String(address || '').toLowerCase()}`;
  }

  function normalizeAccessProfile(raw, address = '') {
    const owner = normAddr(raw?.owner || '');
    const defaultAdmins = [...new Set((Array.isArray(raw?.defaultAdmins) ? raw.defaultAdmins : [])
      .map((item) => normAddr(item))
      .filter(Boolean))];
    return {
      address: normAddr(raw?.address || address || ''),
      owner,
      defaultAdminCount: Number(raw?.defaultAdminCount || defaultAdmins.length || 0),
      defaultAdmins,
      method: String(raw?.method || (defaultAdmins.length ? 'access-control' : (owner ? 'owner' : 'none'))),
      timestamp: Number(raw?.timestamp || Date.now())
    };
  }

  function currentResolvedAddresses() {
    const values = new Set();
    Object.values(SECTIONS).forEach((sec) => {
      sec.keys.forEach((item) => {
        const addr = resolveAddress(item.key);
        if (isAddr(addr)) values.add(addr);
      });
    });
    if (isAddr(sectionAddressProvider())) values.add(sectionAddressProvider());
    return [...values];
  }

  function getAccessProfile(address) {
    const rpcId = currentRpcId();
    if (!rpcId || !isAddr(address)) return null;
    return _accessCache[accessCacheKey(rpcId, address)] || null;
  }

  function contractAdminCandidates(address) {
    const profile = getAccessProfile(address);
    if (!profile) return [];
    const adminList = Array.isArray(profile.defaultAdmins) ? profile.defaultAdmins.filter(isAddr) : [];
    if (adminList.length) return adminList;
    if (isAddr(profile.owner)) return [profile.owner];
    return [];
  }

  function findUser(address) {
    const normalized = normAddr(address);
    if (!normalized) return null;
    return _userList.find((item) => String(item.address).toLowerCase() === normalized.toLowerCase()) || null;
  }

  function accessControlDisplayAddress(address) {
    const normalized = normAddr(address || '');
    if (!normalized) return '';
    return shorten(normalized, 4, 4);
  }

  function accessControlDisplayName(address) {
    const user = findUser(address);
    return String(user?.nickname || '').trim();
  }

  function pickAccessControlAdminUser(addresses = []) {
    const normalized = [...new Set((Array.isArray(addresses) ? addresses : [])
      .map((item) => normAddr(item))
      .filter((item) => isAddr(item)))];
    if (!normalized.length) return '';

    const currentUser = effectiveCurrentUserAddress();
    if (currentUser && normalized.some((item) => item.toLowerCase() === currentUser.toLowerCase())) return currentUser;

    const configured = normalized.find((item) => !!findUser(item));
    if (configured) return configured;
    return normalized[0] || '';
  }

  function ensureAccessControlUserConfig(address, { nickname = '', tags = [] } = {}) {
    const normalized = normAddr(address || '');
    if (!isAddr(normalized)) return '';

    const nextTags = [...new Set((Array.isArray(tags) ? tags : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean))];
    const existing = findUser(normalized);
    if (existing) {
      existing.tags = [...new Set([...(existing.tags || []), ...nextTags])];
      if (nickname && !String(existing.nickname || '').trim()) existing.nickname = nickname;
      return existing.address;
    }

    const fallbackNickname = nickname || `Admin ${shorten(normalized, 4, 4)}`;
    _userList.push(normalizeUserEntry({
      address: normalized,
      nickname: fallbackNickname,
      tags: nextTags
    }));
    return normalized;
  }

  function currentAccessControlSelection() {
    const contractInput = document.getElementById('grant-role-contract');
    const roleInput = document.getElementById('grant-role-bytes32');
    const contractAddress = normAddr(String(contractInput?.value || '').trim());
    const role = resolveRoleInput(String(roleInput?.value || '').trim());
    const currentUser = effectiveCurrentUserAddress();
    return { contractAddress, role, currentUser };
  }

  function accessControlSelectionKey(selection = currentAccessControlSelection()) {
    if (!selection?.contractAddress || !selection?.role) return '';
    return [selection.contractAddress.toLowerCase(), selection.role.toLowerCase(), String(selection.currentUser || '').toLowerCase()].join('::');
  }

  function clearAccessControlInspectTimer() {
    if (_accessControlInspectTimer) {
      clearTimeout(_accessControlInspectTimer);
      _accessControlInspectTimer = null;
    }
  }

  function scheduleAccessControlInspect({ immediate = false } = {}) {
    clearAccessControlInspectTimer();
    const selection = currentAccessControlSelection();
    const contractValid = isAddr(selection.contractAddress);
    const roleValid = /^0x[a-fA-F0-9]{64}$/.test(selection.role);
    if (!contractValid || !roleValid) {
      setGrantRoleStatus('Access-control data loads automatically after the contract address and role are both valid.');
      return;
    }

    const nextKey = accessControlSelectionKey(selection);
    const currentKey = accessControlSelectionKey(_accessControlState);
    if (_accessControlState.inspected && nextKey && nextKey === currentKey) return;

    const run = async (seq) => {
      setGrantRoleStatus('Reading access-control data...');
      try {
        const result = await inspectAccessControlRole({ silent: true });
        if (seq !== _accessControlInspectSeq) return;
        setGrantRoleStatus(result.enumerable
          ? `Loaded ${result.members.length} member${result.members.length === 1 ? '' : 's'} for the selected role.`
          : 'Loaded role metadata, but this contract does not enumerate members.', 'success');
      } catch (error) {
        if (seq !== _accessControlInspectSeq) return;
        setGrantRoleStatus(formatGrantRoleError(error), 'error');
      }
    };

    const seq = ++_accessControlInspectSeq;
    if (immediate) {
      run(seq).catch(console.error);
      return;
    }
    _accessControlInspectTimer = setTimeout(() => {
      _accessControlInspectTimer = null;
      run(seq).catch(console.error);
    }, ACCESS_CONTROL_AUTO_INSPECT_MS);
  }

  function switchToAccessControlAdminUser() {
    const adminAddress = normAddr(_accessControlState?.selectedAdminUser || '');
    if (!isAddr(adminAddress)) throw new Error('No admin user is available for this role');

    const walletAddress = normAddr(_walletState.address || '');
    const walletConnected = !!(_walletState.connected && isAddr(walletAddress));
    if (walletConnected && adminAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('A browser wallet is currently connected and controls signing. To use this admin user, connect the matching admin wallet or disconnect the current wallet first.');
    }

    const nextAddress = ensureAccessControlUserConfig(adminAddress, {
      tags: ['admin'],
      nickname: accessControlDisplayName(adminAddress) || `Admin ${shorten(adminAddress, 4, 4)}`
    });

    _selectedUser = nextAddress;
    persist();
    render();
    scheduleAccessControlInspect({ immediate: true });
    setGrantRoleStatus(walletConnected
      ? 'The connected wallet already matches the admin account.'
      : 'Switched current user to the admin account.', 'success');
    notify(walletConnected
      ? 'The connected wallet already matches the admin account'
      : 'Switched current user to the admin account');
  }

  function autoUserTags(user) {
    const tags = [];
    if (!user) return tags;
    if (_selectedUser && String(user.address).toLowerCase() === String(_selectedUser).toLowerCase()) tags.push('active');
    const adminAddresses = new Set();
    currentResolvedAddresses().forEach((address) => {
      contractAdminCandidates(address).forEach((admin) => adminAddresses.add(admin.toLowerCase()));
    });
    if (adminAddresses.has(String(user.address).toLowerCase())) tags.push('admin');
    return tags;
  }

  function userTagsForDisplay(user) {
    return [...new Set([...(user?.tags || []), ...autoUserTags(user)])];
  }

  function getSignerCandidate({ preferredAddress = '', contractAddress = '', requireAdmin = false } = {}) {
    const preferred = normAddr(preferredAddress || '');
    const contract = normAddr(contractAddress || '');
    const preferredUser = preferred ? findUser(preferred) : null;
    const walletAddress = normAddr(_walletState.address || '');
    const walletConnected = !!(_walletState.connected && isAddr(walletAddress));

    if (!requireAdmin) {
      if (walletConnected) return { address: walletAddress, source: 'browser-wallet-forced' };
      if (preferredUser) return { address: preferredUser.address, source: 'user' };
      if (preferred && walletAddress && preferred.toLowerCase() === walletAddress.toLowerCase()) {
        return { address: walletAddress, source: 'browser-wallet' };
      }
      if (preferred) return { address: preferred, source: 'preferred' };
      const selected = findUser(_selectedUser);
      if (selected) return { address: selected.address, source: 'selected-user' };
      if (walletAddress) return { address: walletAddress, source: 'browser-wallet' };
      return { address: '', source: 'none' };
    }

    const candidates = contract ? contractAdminCandidates(contract) : [];
    const prioritized = [];
    const push = (value) => {
      const normalized = normAddr(value || '');
      if (normalized && !prioritized.some((item) => item.toLowerCase() === normalized.toLowerCase())) prioritized.push(normalized);
    };

    if (walletConnected) {
      return { address: walletAddress, source: 'browser-wallet-forced-admin' };
    }

    if (preferred && candidates.some((item) => item.toLowerCase() === preferred.toLowerCase())) push(preferred);
    if (walletAddress && candidates.some((item) => item.toLowerCase() === walletAddress.toLowerCase())) push(walletAddress);
    candidates.forEach(push);

    if (walletAddress && prioritized.some((item) => item.toLowerCase() === walletAddress.toLowerCase())) {
      return { address: walletAddress, source: 'browser-wallet-admin' };
    }

    if (prioritized.length) {
      return { address: prioritized[0], source: 'impersonated-admin' };
    }

    const selected = findUser(_selectedUser);
    if (selected) {
      return { address: selected.address, source: 'selected-user' };
    }

    return { address: '', source: 'none' };
  }

  function currentAdminActor() {
    const candidate = getSignerCandidate({ requireAdmin: true });
    return candidate.address ? candidate : null;
  }

  function normalizeSectionConfig(secId, raw) {
    const base = defaultSectionConfig(secId);
    const next = Object.assign(base, raw || {});
    const validModes = SECTIONS[secId]?.modes || (secId === 'staple' ? ['address-provider'] : ['fixed']);
    if (!validModes.includes(next.mode)) next.mode = secId === 'staple' ? 'address-provider' : 'fixed';
    next.addresses = sanitizeSectionAddresses(secId, next.addresses || {});
    if (secId === 'staple') {
      next.addresses = {};
      next.versions = (Array.isArray(next.versions) ? next.versions : [])
        .map((entry, index) => normalizeStapleVersionEntry(entry, index))
        .filter((entry) => entry.version || entry.addressProvider || entry.jrPricingFactory);
      next.selectedVersionId = String(next.selectedVersionId || '').trim();
      if (!next.selectedVersionId && next.versions.length) next.selectedVersionId = next.versions[0].id;
    }
    return next;
  }

  function normalizeRpcConfig(raw) {
    const next = { name: String(raw?.name || ''), sections: {} };
    Object.keys(SECTIONS).forEach((secId) => {
      next.sections[secId] = normalizeSectionConfig(secId, raw?.sections?.[secId]);
    });
    return next;
  }

  function defaultEnvConfig() {
    return normalizeRpcConfig(DEFAULT_ENV_CONFIG);
  }

  function currentRpcEntry() {
    return _rpcList[_selectedRpcIndex] || null;
  }

  function currentRpcId() {
    return currentRpcEntry()?.id || '';
  }

  function currentRpcUrl() {
    return currentRpcEntry()?.url || '';
  }

  function currentRpcName() {
    return currentRpcEntry()?.name || '';
  }

  function isLocalRpcUrl(url = currentRpcUrl()) {
    const raw = String(url || '').trim();
    if (!raw) return false;
    try {
      const parsed = new URL(raw);
      return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
    } catch {
      return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(raw);
    }
  }

  function isProductionRuntime() {
    return !isLocalRpcUrl();
  }

  function setRpcEditorState(mode = 'create', rpcId = '') {
    _rpcEditorState = { mode, id: rpcId || '' };
  }

  function currentRpcEditorEntry() {
    return _rpcList.find((entry) => entry.id === _rpcEditorState.id) || null;
  }

  function setVersionEditorState(mode = 'create', versionId = '') {
    _versionEditorState = { mode, id: versionId || '' };
  }

  function currentVersionEditorEntry() {
    return stapleVersions().find((entry) => entry.id === _versionEditorState.id) || null;
  }

  function setUserEditorState(mode = 'create', address = '') {
    _userEditorState = { mode, address: address || '' };
  }

  function currentUserEditorEntry() {
    return _userList.find((entry) => String(entry.address).toLowerCase() === String(_userEditorState.address).toLowerCase()) || null;
  }

  function currentEnvConfig() {
    return _envConfig;
  }

  function currentRpcConfig() {
    return currentEnvConfig();
  }

  function sectionMode(secId) {
    return currentEnvConfig().sections?.[secId]?.mode || (secId === 'staple' ? 'address-provider' : 'fixed');
  }

  function sectionAddresses(secId) {
    return currentEnvConfig().sections?.[secId]?.addresses || {};
  }

  function stapleVersions() {
    return currentEnvConfig().sections?.staple?.versions || [];
  }

  function activeStapleVersion() {
    const versions = stapleVersions();
    if (!versions.length) return null;
    const selectedId = String(currentEnvConfig().sections?.staple?.selectedVersionId || '').trim();
    return versions.find((entry) => entry.id === selectedId) || versions[0] || null;
  }

  function sectionAddressProvider() {
    return normAddr(activeStapleVersion()?.addressProvider || '');
  }

  function sectionJrPricingFactory() {
    return normAddr(activeStapleVersion()?.jrPricingFactory || '');
  }

  function discoveryCacheKey(rpcId, providerAddr) {
    return `${rpcId}::${String(providerAddr || '').toLowerCase()}`;
  }

  function _sectionForKey(key) {
    for (const [secId, sec] of Object.entries(SECTIONS)) {
      if (sec.keys.some((k) => k.key === key)) return secId;
    }
    return null;
  }

  function resolveAddressMeta(key) {
    const secId = _sectionForKey(key);
    if (!secId) return { value: '', source: 'blank' };

    if (secId === 'staple') {
      if (key === 'jrPricing_factory') {
        const value = sectionJrPricingFactory();
        return { value, source: value ? 'version' : 'blank' };
      }
      if (_currentDiscovery?.addresses?.[key]) return { value: _currentDiscovery.addresses[key], source: 'provider' };
      return { value: '', source: 'blank' };
    }

    const value = sectionAddresses(secId)[key] || '';
    return { value, source: value ? 'manual' : 'blank' };
  }

  function resolveAddress(key) {
    return resolveAddressMeta(key).value || '';
  }

  function currentProfileSummary() {
    const cfg = currentRpcConfig();
    const parts = [];
    const stapleVersion = activeStapleVersion();
    if (stapleVersion?.version || stapleVersion?.label) {
      parts.push(`Staple version ${stapleVersion.version || stapleVersion.label}`);
    }
    if (isAddr(sectionAddressProvider())) {
      parts.push(`Address Provider ${shorten(sectionAddressProvider())}`);
    } else {
      parts.push('No Address Provider selected');
    }
    if (isAddr(sectionJrPricingFactory())) {
      parts.push(`JR Pricing Factory ${shorten(sectionJrPricingFactory())}`);
    } else {
      parts.push('No JR Pricing Factory selected');
    }

    return cfg.name ? `${cfg.name} · ${parts.join(' · ')}` : parts.join(' · ');
  }

  function persistedSelectedUser() {
    const normalized = normAddr(_selectedUser || '');
    if (!normalized) return '';
    return _userList.some((item) => String(item.address).toLowerCase() === normalized.toLowerCase())
      ? normalized
      : '';
  }

  function readChainlinkSessionConfig() {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE.CHAINLINK);
      if (!raw) return null;
      const parsed = JSON.parse(raw) || {};
      return {
        remember: !!parsed.remember,
        apiKey: String(parsed.apiKey || '').trim(),
        apiSecret: String(parsed.apiSecret || '').trim()
      };
    } catch (_) {
      return null;
    }
  }

  function persistChainlinkSession() {
    try {
      if (_rememberChainlinkForSession) {
        sessionStorage.setItem(SESSION_STORAGE.CHAINLINK, JSON.stringify({
          remember: true,
          apiKey: String(_chainlinkConfig.apiKey || '').trim(),
          apiSecret: String(_chainlinkConfig.apiSecret || '').trim()
        }));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE.CHAINLINK);
      }
    } catch (_) {}
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE.USER, JSON.stringify({ userList: _userList, selectedUser: persistedSelectedUser() }));
      localStorage.setItem(STORAGE.RPC, JSON.stringify({ list: _rpcList, selectedIndex: _selectedRpcIndex }));
      localStorage.setItem(STORAGE.CONFIG, JSON.stringify(_envConfig));
      localStorage.setItem(STORAGE.DISCOVERY, JSON.stringify(_discoveryCache));
      localStorage.setItem(STORAGE.ACCESS, JSON.stringify(_accessCache));
      localStorage.removeItem(STORAGE.CHAINLINK);
      localStorage.removeItem(STORAGE.WALLET);
    } catch (e) {
      console.error('persist', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE.USER);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p.userList)) _userList = p.userList.map(normalizeUserEntry).filter((item) => item.address);
        const loadedSelectedUser = normAddr(p.selectedUser || '');
        _selectedUser = _userList.some((item) => String(item.address).toLowerCase() === loadedSelectedUser.toLowerCase())
          ? loadedSelectedUser
          : '';
      }
    } catch (_) {}

    try {
      const raw = localStorage.getItem(STORAGE.RPC);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p.list) && p.list.length) _rpcList = ensureRpcIds(p.list);
        if (typeof p.selectedIndex === 'number') _selectedRpcIndex = p.selectedIndex;
      }
    } catch (_) {}

    try {
      localStorage.removeItem(STORAGE.WALLET);
    } catch (_) {}

    const walletSessionHint = readWalletSessionHint();
    _walletState = {
      connected: false,
      providerId: String(walletSessionHint?.providerId || ''),
      providerLabel: String(walletSessionHint?.providerLabel || ''),
      address: '',
      chainId: 0
    };
    if (!_rpcList.length) _rpcList = ensureRpcIds(deepClone(DEFAULT_RPC_LIST));
    if (_selectedRpcIndex >= _rpcList.length) _selectedRpcIndex = 0;

    try {
      const raw = localStorage.getItem(STORAGE.CONFIG);
      if (raw) {
        _envConfig = normalizeRpcConfig(JSON.parse(raw));
      } else {
        const legacyRaw = localStorage.getItem('staple_env_rpc_configs_v6');
        if (legacyRaw) {
          const legacyConfigs = JSON.parse(legacyRaw) || {};
          const selectedRpcId = _rpcList[_selectedRpcIndex]?.id || '';
          const legacyConfig = legacyConfigs[selectedRpcId] || legacyConfigs[Object.keys(legacyConfigs)[0]] || null;
          _envConfig = legacyConfig ? normalizeRpcConfig(legacyConfig) : defaultEnvConfig();
        } else {
          _envConfig = defaultEnvConfig();
        }
      }
    } catch (_) {
      _envConfig = defaultEnvConfig();
    }

    try {
      const raw = localStorage.getItem(STORAGE.DISCOVERY);
      if (raw) _discoveryCache = JSON.parse(raw) || {};
    } catch (_) {}

    try {
      const raw = localStorage.getItem(STORAGE.ACCESS);
      if (raw) {
        const parsed = JSON.parse(raw) || {};
        const next = {};
        Object.entries(parsed).forEach(([key, value]) => {
          const address = String(key || '').split('::').pop() || '';
          next[key] = normalizeAccessProfile(value, address);
        });
        _accessCache = next;
      }
    } catch (_) {}

    try {
      localStorage.removeItem(STORAGE.CHAINLINK);
    } catch (_) {}

    const chainlinkSession = readChainlinkSessionConfig();
    _rememberChainlinkForSession = !!chainlinkSession?.remember;
    _chainlinkConfig.apiKey = String(chainlinkSession?.apiKey || '').trim();
    _chainlinkConfig.apiSecret = String(chainlinkSession?.apiSecret || '').trim();

    hydrateCurrentDiscovery();
  }

  function hydrateCurrentDiscovery() {
    const providerAddr = sectionAddressProvider();
    const rpcId = currentRpcId();
    const cacheKey = discoveryCacheKey(rpcId, providerAddr);
    _currentDiscovery = providerAddr && _discoveryCache[cacheKey] ? _discoveryCache[cacheKey] : null;
  }

  function clearRpcScopedDerivedCaches(rpcId = currentRpcId()) {
    if (!rpcId) return;
    localStorage.removeItem(`${CACHE.POOL}_${rpcId}`);
    localStorage.removeItem(`${CACHE.SYM}_${rpcId}`);
    if (rpcId === currentRpcId()) {
      _lastPR = 0;
      _lastSR = 0;
    }
  }

  function clearVersionRelatedCaches(versionEntry, rpcId = currentRpcId(), clearRpcDerivedCaches = false) {
    const providerAddr = normAddr(versionEntry?.addressProvider || '');
    if (!rpcId || !isAddr(providerAddr)) {
      if (clearRpcDerivedCaches) clearRpcScopedDerivedCaches(rpcId);
      return;
    }

    const cacheKey = discoveryCacheKey(rpcId, providerAddr);
    const discovery = _discoveryCache[cacheKey];
    const relatedAddresses = new Set([providerAddr.toLowerCase()]);
    const versionFactory = normAddr(versionEntry?.jrPricingFactory || '');
    if (isAddr(versionFactory)) relatedAddresses.add(versionFactory.toLowerCase());

    Object.values(discovery?.addresses || {}).forEach((address) => {
      const normalized = normAddr(address);
      if (isAddr(normalized)) relatedAddresses.add(normalized.toLowerCase());
    });

    delete _discoveryCache[cacheKey];
    Object.keys(_accessCache).forEach((key) => {
      if (!key.startsWith(`${rpcId}::`)) return;
      const [, addressPart = ''] = key.split('::');
      if (relatedAddresses.has(String(addressPart).toLowerCase())) delete _accessCache[key];
    });

    if (rpcId === currentRpcId() && providerAddr === normAddr(sectionAddressProvider())) {
      _currentDiscovery = null;
    }
    if (clearRpcDerivedCaches) clearRpcScopedDerivedCaches(rpcId);
  }

  async function forceRefreshStapleVersionAddresses(versionId = activeStapleVersion()?.id || _versionEditorState.id) {
    const entry = stapleVersions().find((item) => item.id === versionId);
    if (!entry) throw new Error('Staple version not found');

    const rpcId = currentRpcId();
    const providerAddr = normAddr(entry.addressProvider || '');
    if (!isAddr(providerAddr)) throw new Error('Address Provider must be a valid address');

    clearVersionRelatedCaches(entry, rpcId, entry.id === activeStapleVersion()?.id);

    const provider = _provider || await refreshProvider();
    if (!provider) throw new Error('RPC provider not ready');

    const discovery = await refreshAddressProviderDiscovery(true, rpcId, providerAddr, provider, 'address-provider');
    await refreshAddressAccessCache(true, Object.values(discovery?.addresses || {}), rpcId, provider);
    hydrateCurrentDiscovery();
    persist();
    render();
    notify('Staple version addresses refreshed');
  }

  async function refreshProvider(url = currentRpcUrl()) {
    if (!url) return null;
    try {
      const provider = new ethers.providers.JsonRpcProvider(url);
      provider.pollingInterval = 60000;
      if (window.RpcManager) window.RpcManager.init(url);
      return provider;
    } catch (e) {
      return null;
    }
  }

  async function refreshBlockInfo(provider = _provider, url = currentRpcUrl()) {
    if (!provider) {
      return { chainId: 0, blockNumber: 0, blockTime: 0 };
    }
    try {
      const net = await provider.getNetwork();
      const num = await provider.getBlockNumber();
      const blk = await provider.getBlock(num);
      if (window.RpcManager) window.RpcManager.init(url, net.chainId);
      return {
        chainId: net.chainId,
        blockNumber: num,
        blockTime: blk ? blk.timestamp : 0
      };
    } catch (_) {
      return { chainId: 0, blockNumber: 0, blockTime: 0 };
    }
  }

  async function discoverFromAddressProvider(providerAddr, rpcProvider) {
    if (!isAddr(providerAddr)) throw new Error('Invalid Address Provider address');
    const provider = rpcProvider || _provider;
    if (!provider) throw new Error('RPC provider not ready');
    if (!window.RpcManager?.multicall) throw new Error('RpcManager.multicall is not available');

    const fields = Object.keys(PROVIDER_FIELD_MAP);
    const calls = fields.map((field) => ({
      target: providerAddr,
      abi: ADDRESS_PROVIDER_ABI,
      method: field,
      params: [],
      allowFailure: true
    }));
    const results = await window.RpcManager.multicall(calls);

    const discovered = {};
    fields.forEach((field, index) => {
      const result = results[index];
      const value = result && COMMON.isAddress(result) ? ethers.utils.getAddress(result) : '';
      const key = PROVIDER_FIELD_MAP[field];
      if (value) discovered[key] = value;
    });

    const cacheKey = discoveryCacheKey(currentRpcId(), providerAddr);
    const previous = _discoveryCache[cacheKey]?.addresses || {};
    const addresses = { ...previous, ...discovered };

    return {
      provider: ethers.utils.getAddress(providerAddr),
      timestamp: Date.now(),
      addresses,
      partial: Object.keys(discovered).length < fields.length
    };
  }

  async function refreshAddressProviderDiscovery(
    force = false,
    rpcId = currentRpcId(),
    providerAddr = sectionAddressProvider(),
    rpcProvider = _provider,
    stapleMode = sectionMode('staple')
  ) {
    const cacheKey = discoveryCacheKey(rpcId, providerAddr);
    _currentDiscovery = providerAddr && _discoveryCache[cacheKey] ? _discoveryCache[cacheKey] : null;

    if (!rpcId || !isAddr(providerAddr) || stapleMode !== 'address-provider') {
      _currentDiscovery = null;
      return null;
    }

    if (!force && _discoveryCache[cacheKey]) {
      _currentDiscovery = _discoveryCache[cacheKey];
      return _currentDiscovery;
    }

    const discovery = await discoverFromAddressProvider(providerAddr, rpcProvider);
    _discoveryCache[cacheKey] = discovery;
    _currentDiscovery = discovery;
    persist();
    return discovery;
  }

  async function refreshAddressAccessCache(force = false, addressesOverride = null, rpcId = currentRpcId(), rpcProvider = _provider) {
    if (!rpcId || !rpcProvider || !window.RpcManager?.multicall) return {};

    const targets = [...new Set((Array.isArray(addressesOverride) ? addressesOverride : currentResolvedAddresses())
      .map((item) => normAddr(item))
      .filter((item) => isAddr(item)))];
    if (!targets.length) return {};

    const pending = targets.filter((address) => force || !_accessCache[accessCacheKey(rpcId, address)]);
    if (!pending.length) return {};

    const DEFAULT_ADMIN_ROLE = ethers.constants.HashZero;
    const ACCESS_ABI = [
      'function owner() view returns (address)',
      'function getRoleMemberCount(bytes32) view returns (uint256)',
      'function getRoleMember(bytes32,uint256) view returns (address)'
    ];

    const calls = pending.flatMap((address) => [
      { target: address, abi: ACCESS_ABI, method: 'owner', params: [], allowFailure: true },
      { target: address, abi: ACCESS_ABI, method: 'getRoleMemberCount', params: [DEFAULT_ADMIN_ROLE], allowFailure: true },
      { target: address, abi: ACCESS_ABI, method: 'getRoleMember', params: [DEFAULT_ADMIN_ROLE, 0], allowFailure: true },
      { target: address, abi: ACCESS_ABI, method: 'getRoleMember', params: [DEFAULT_ADMIN_ROLE, 1], allowFailure: true },
      { target: address, abi: ACCESS_ABI, method: 'getRoleMember', params: [DEFAULT_ADMIN_ROLE, 2], allowFailure: true },
      { target: address, abi: ACCESS_ABI, method: 'getRoleMember', params: [DEFAULT_ADMIN_ROLE, 3], allowFailure: true }
    ]);

    const results = await window.RpcManager.multicall(calls);
    let index = 0;
    pending.forEach((address) => {
      const owner = results[index++];
      const countRaw = results[index++];
      const members = [results[index++], results[index++], results[index++], results[index++]];
      const count = Number(countRaw || 0);
      const defaultAdmins = members
        .slice(0, Math.max(0, Math.min(count, members.length)))
        .filter((item) => isAddr(item))
        .map((item) => normAddr(item));
      const profile = normalizeAccessProfile({
        address,
        owner: isAddr(owner) ? owner : '',
        defaultAdminCount: count,
        defaultAdmins,
        method: defaultAdmins.length ? 'access-control' : (isAddr(owner) ? 'owner' : 'none'),
        timestamp: Date.now()
      }, address);
      _accessCache[accessCacheKey(rpcId, address)] = profile;
    });

    persist();
    return pending.reduce((acc, address) => {
      acc[address.toLowerCase()] = _accessCache[accessCacheKey(rpcId, address)];
      return acc;
    }, {});
  }

  function currentRpcKey() {
    return currentRpcId() || `idx-${_selectedRpcIndex}`;
  }

  function pck() {
    return `${CACHE.POOL}_${currentRpcKey()}`;
  }

  function sck() {
    return `${CACHE.SYM}_${currentRpcKey()}`;
  }

  function normPool(d) {
    if (!Array.isArray(d)) return [];
    const np = (p) => p ? { id: p.id, decimals: p.decimals, riskLevel: p.riskLevel, asset: p.asset, lpAddr: p.lpAddr } : null;
    const ns = (s) => s ? { assets: s.assets, liability: s.liability } : null;
    const nvp = (p) => p ? { id: p.id, riskLevel: p.riskLevel, n: p.n, p: p.p } : null;
    const nvs = (s) => s ? { po: s.po, pa: s.pa } : null;
    const nvtp = (p) => p ? {
      asset: p.asset,
      decimals: p.decimals,
      riskLevel: p.riskLevel,
      id: p.id,
      lpAddr: p.lpAddr,
      swapFeeIn: p.swapFeeIn,
      swapFeeOut: p.swapFeeOut,
      protocolFeeRate: p.protocolFeeRate,
      maxAllocateRate: p.maxAllocateRate,
      alrLowerBound: p.alrLowerBound
    } : null;
    const nvts = (s) => s ? {
      liability: s.liability,
      assets: s.assets,
      alr: s.alr,
      feeTotal: s.feeTotal,
      feePeriod: s.feePeriod,
      feeProtocol: s.feeProtocol,
      totalShares: s.totalShares,
      paused: s.paused
    } : null;
    const ni = (a) => Array.isArray(a) ? a.map(i => i ? {
      id: i.id,
      token: i.token,
      decimals: i.decimals,
      startTime: i.startTime,
      endTime: i.endTime,
      emissionPerSecond: i.emissionPerSecond
    } : null).filter(Boolean) : [];
    const nvt = (t) => t ? { params: nvtp(t.params), status: nvts(t.status), incentives: ni(t.incentives) } : null;
    const nv = (v) => v ? { params: nvp(v.params), status: nvs(v.status), token0: nvt(v.token0), token1: nvt(v.token1) } : null;
    return d.map(p => ({ params: np(p.params), status: ns(p.status), relatedVtps: Array.isArray(p.relatedVtps) ? p.relatedVtps.map(nv).filter(Boolean) : [] }));
  }

  async function refreshPoolInfo(force) {
    const now = Date.now();
    if (!force && now - _lastPR < CACHE.THR) return;
    _envRefreshing = true;
    render();
    const addr = resolveAddress('staple_uiPoolDataProvider');
    if (!_provider || !addr || !isAddr(addr)) {
      _envRefreshing = false;
      render();
      return;
    }
    try {
      if (!STAPLE_UI_POOL_DATA_PROVIDER_ABI) {
        console.error('pool', new ReferenceError('stapleUIPoolDataProviderAbi is not defined'));
        _envRefreshing = false;
        render();
        return;
      }
      if (!_uiPoolContract || _uiPoolContract.address.toLowerCase() !== addr.toLowerCase()) {
        _uiPoolContract = new ethers.Contract(addr, STAPLE_UI_POOL_DATA_PROVIDER_ABI, _provider);
      }
      const u = effectiveCurrentUserAddress() || ethers.constants.AddressZero;
      const o = u !== ethers.constants.AddressZero ? { from: u } : {};
      const raw = await _uiPoolContract.getAllPools(o);
      const data = normPool(raw);
      let tv = 0;
      data.forEach((p) => { if (p.relatedVtps) tv += p.relatedVtps.length; });
      localStorage.setItem(pck(), JSON.stringify({ timestamp: now, poolLength: data.length, vtpLength: Math.floor(tv / 2), data }, (k, v) => v && v.type === 'BigNumber' ? v.hex : v));
      _lastPR = now;
    } catch (e) {
      console.error('pool', e);
    }
    _envRefreshing = false;
    render();
    refreshSymbols(false).catch(console.error);
  }

  async function refreshSymbols(force) {
    const now = Date.now();
    if (!force && now - _lastSR < CACHE.THR) return;
    const fa = resolveAddress('staple_testTokenFactory');
    if (!_provider) return;
    try {
      const s = new Set();
      if (fa && isAddr(fa)) {
        try {
          const f = new ethers.Contract(fa, stapleTestERC20FactoryAbi, _provider);
          const t = await f.supportedTokens();
          if (Array.isArray(t)) t.forEach(x => s.add(String(x).toLowerCase()));
        } catch (_) {}
      }
      const pr = localStorage.getItem(pck());
      if (pr) {
        try {
          const c = JSON.parse(pr);
          if (c.data) c.data.forEach(p => {
            if (p.params) {
              if (p.params.asset) s.add(String(p.params.asset).toLowerCase());
              if (p.params.lpAddr) s.add(String(p.params.lpAddr).toLowerCase());
            }
          });
        } catch (_) {}
      }
      const arr = Array.from(s);
      if (!arr.length || !window.RpcManager?.multicall) return;
      const calls = arr.map(a => ({ target: a, abi: ['function symbol() view returns (string)'], method: 'symbol', params: [], allowFailure: true }));
      const syms = await window.RpcManager.multicall(calls).catch(() => new Array(arr.length).fill(null));
      const map = {};
      arr.forEach((a, i) => { if (syms[i]) map[a] = syms[i]; });
      localStorage.setItem(sck(), JSON.stringify({ timestamp: now, data: map }));
      _lastSR = now;
    } catch (e) {
      console.error('sym', e);
    }
  }

  /**
   * MetaMask native-balance refresh helper.
   *
   * This is intentionally separate from executeMinterV2():
   * - executeMinterV2() is an ERC20 storage override tool.
   * - this helper is a native ETH transaction poke used only after direct ETH balance changes.
   *
   * The restrictions here are not accidental. They encode the product requirement exactly:
   * - local / test runtime only
   * - impersonation-only signer path
   * - fixed recipient rule: recipient must equal sender/current user
   * - tiny native value
   *
   * DO NOT refactor this to COMMON.resolveSigner(), because resolveSigner() may choose browser
   * wallet signing when available. That would silently turn this helper into a generic signing
   * path, which is specifically what the requirement forbids.
   */
  async function executeMinterNativeRefreshTransfer() {
    if (isProductionRuntime()) {
      throw new Error('This helper is disabled outside local test environments.');
    }

    const senderAddress = normAddr(_selectedUser || '');
    if (!isAddr(senderAddress)) {
      throw new Error('Select a current user first.');
    }

    const provider = await getMinterProvider();
    const impersonated = await COMMON.tryImpersonateAccount?.(provider, senderAddress);
    if (!impersonated) {
      throw new Error('This helper only works with an impersonation-capable local RPC (Hardhat/Anvil style).');
    }

    const signer = provider.getSigner(senderAddress);
    const tx = await signer.sendTransaction({
      to: senderAddress,
      value: ethers.utils.parseEther(MINTER_NATIVE_REFRESH_AMOUNT_ETH)
    });
    await tx.wait();

    notify(`Sent ${MINTER_NATIVE_REFRESH_AMOUNT_ETH} native token from ${shorten(senderAddress)} back to the same address to refresh MetaMask ETH balance tracking.`);
    return tx;
  }

  function getPoolInfo() {
    const r = localStorage.getItem(pck());
    if (!r) throw new Error('Pool Info Cache Missing');
    const c = JSON.parse(r);
    if (Date.now() - c.timestamp > CACHE.TTL_P) throw new Error('Pool Info Cache Expired');
    return c;
  }

  function getSymbols() {
    const r = localStorage.getItem(sck());
    if (!r) throw new Error('Symbol Cache Missing');
    const c = JSON.parse(r);
    if (Date.now() - c.timestamp > CACHE.TTL_S) throw new Error('Symbol Cache Expired');
    return c.data;
  }

  function getAllParams() {
    const adminActor = currentAdminActor();
    const stapleVersion = activeStapleVersion();
    const jrPricingConfigured = isAddr(resolveAddress('jrPricing_factory'));
    return {
      currentNetworkName: currentRpcName(),
      chainID: _chainId,
      rpc: currentRpcUrl(),
      isProduction: isProductionRuntime(),
      profileName: currentEnvConfig().name || '',
      profileSummary: currentProfileSummary(),
      addressProvider: sectionAddressProvider(),

      uiPoolDataProvider: resolveAddress('staple_uiPoolDataProvider'),
      testERC20Factory: resolveAddress('staple_testTokenFactory'),
      stapleVersion: stapleVersion?.version || stapleVersion?.label || '',
      stapleAddressProvider: sectionAddressProvider(),
      jrPricingFactory: resolveAddress('jrPricing_factory'),

      poolImpl: resolveAddress('staple_poolImpl'),
      stapleVerifier: resolveAddress('staple_oracleVerifierStaple'),
      chainlinkDataFeedVerifier: resolveAddress('staple_oracleVerifierChainlinkDataFeed'),
      chainlinkStreamVerifier: resolveAddress('staple_oracleVerifierChainlinkStream'),
      oracleVerifierChainlinkStreamV3V8: resolveAddress('staple_oracleVerifierChainlinkStream'),
      redstoneVerifier: resolveAddress('staple_oracleVerifierRedstone'),
      bondifyJrVerifier: resolveAddress('staple_oracleVerifierBondifyJr'),
      oracleVerifierJR: resolveAddress('staple_oracleVerifierBondifyJr'),
      redstoneExtractor: resolveAddress('staple_redstoneExtractor'),

      router: resolveAddress('staple_router'),
      controller: resolveAddress('staple_controller'),
      incentivesController: resolveAddress('staple_incentivesController'),
      priceProvider: resolveAddress('staple_priceProvider'),

      mockDexAggregator: resolveAddress('staple_mockDexAggregator'),
      mockCurve: resolveAddress('staple_mockCurve'),
      mockUniswapV2: resolveAddress('staple_mockUniswapV2'),
      mockUniswapV3: resolveAddress('staple_mockUniswapV3'),

      chainlinkStreamApiKey: _chainlinkConfig.apiKey,
      chainlinkStreamApiSecret: _chainlinkConfig.apiSecret,
      blockNumber: _blockNumber,
      blockTime: _blockTime,
      user: effectiveCurrentUserAddress() || ethers.constants.AddressZero,
      adminActor,
      walletConnected: !!_walletState.connected,
      walletAddress: _walletState.address || ethers.constants.AddressZero,
      walletChainId: _walletState.chainId || 0,
      walletMatchesRpc: walletMatchesCurrentRpc(),

      hasJrPricing: jrPricingConfigured,
      hasStaple: isAddr(sectionAddressProvider())
    };
  }

  function addUser(addressInput, nick, tags = '') {
    const raw = String(addressInput || '').trim();
    if (raw.length === 66 && raw.startsWith('0x')) {
      try {
        new ethers.Wallet(raw);
        throw new Error('Manual private key configuration is disabled. Use Random if you need a new wallet, then copy the private key immediately.');
      } catch (error) {
        if (String(error?.message || '').includes('Manual private key configuration is disabled')) throw error;
      }
    }
    const n = normAddr(raw);
    if (!n || !isAddr(n)) {
      throw new Error('Invalid address');
    }
    const normalizedTags = sanitizeUserTags(tags);
    const i = _userList.findIndex(u => String(u.address).toLowerCase() === n.toLowerCase());
    if (i >= 0) {
      if (nick) _userList[i].nickname = nick;
      _userList[i].tags = [...new Set([...(_userList[i].tags || []), ...normalizedTags])];
      _selectedUser = _userList[i].address;
    } else {
      _userList.push(normalizeUserEntry({
        address: n,
        nickname: (nick || '').trim() || shorten(n),
        tags: normalizedTags
      }));
      _selectedUser = n;
    }
    clearGeneratedWalletPreview();
    setUserEditorState('create', '');
    persist();
    render();
    scheduleAccessControlInspect();
    notify('User saved');
    return true;
  }

  function selectUser(a) {
    clearGeneratedWalletPreview();
    if (!a) {
      _selectedUser = '';
      persist();
      render();
      scheduleAccessControlInspect();
      return;
    }
    const n = normAddr(a);
    const isSavedUser = _userList.some((u) => String(u.address).toLowerCase() === n.toLowerCase());
    const isConnectedWalletUser = !!(_walletState.connected && isAddr(_walletState.address) && String(_walletState.address).toLowerCase() === n.toLowerCase());
    if (isSavedUser || isConnectedWalletUser) {
      _selectedUser = n;
      persist();
      render();
      scheduleAccessControlInspect();
      notify(`Current user switched to ${shorten(n)}`);
    }
  }

  function deleteUser(a) {
    clearGeneratedWalletPreview();
    _userList = _userList.filter(u => String(u.address).toLowerCase() !== String(a).toLowerCase());
    if (_selectedUser && String(_selectedUser).toLowerCase() === String(a).toLowerCase()) _selectedUser = '';
    if (String(_userEditorState.address).toLowerCase() === String(a).toLowerCase()) {
      setUserEditorState('create', '');
    }
    persist();
    render();
    notify('User deleted');
  }

  function editUser(a) {
    clearGeneratedWalletPreview();
    const u = _userList.find(x => String(x.address).toLowerCase() === String(a).toLowerCase());
    if (!u) return;
    setUserEditorState('edit', u.address);
    renderUserEditor();
  }

  function fmtDur(ms) {
    if (ms <= 0 || !Number.isFinite(ms)) return 'Expired';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h) return `${h}h ${(m % 60)}m`;
    if (m) return `${m}m ${(s % 60)}s`;
    return `${s}s`;
  }

  function renderRpc() {
    const sel = document.getElementById('rpc-select');
    if (sel) {
      sel.innerHTML = '';
      _rpcList.forEach((r, i) => {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = `${r.name}  (${r.url})`;
        if (i === _selectedRpcIndex) o.selected = true;
        sel.appendChild(o);
      });
    }

    const list = document.getElementById('rpc-directory');
    if (list) {
      if (!_rpcList.length) {
        list.innerHTML = '<div class="empty-state">No RPC entries available.</div>';
      } else {
        list.innerHTML = _rpcList.map((entry, index) => {
          const active = index === _selectedRpcIndex;
          return `
            <div class="user-item${active ? ' active' : ''}">
              <div class="user-item-content">
                <div class="user-header"><span class="user-nickname">${esc(entry.name || `RPC ${index + 1}`)}</span></div>
                <div class="user-address mono">${esc(entry.url || 'Missing URL')}</div>
                <div class="user-tag-list"><span class="user-tag">rpc</span>${active ? '<span class="user-tag">active</span>' : ''}</div>
              </div>
              <div class="user-item-actions">${active ? '' : `<button class="btn btn-sm btn-secondary" data-use-rpc="${esc(entry.id)}">Use</button>`}<button class="btn btn-sm btn-secondary" data-edit-rpc="${esc(entry.id)}">Edit</button><button class="btn btn-sm btn-danger" data-delete-rpc="${esc(entry.id)}">Delete</button></div>
            </div>
          `;
        }).join('');
      }
      list.querySelectorAll('[data-use-rpc]').forEach((button) => button.addEventListener('click', async () => {
        const rpcId = String(button.getAttribute('data-use-rpc') || '');
        const nextIndex = _rpcList.findIndex((entry) => entry.id === rpcId);
        if (nextIndex < 0) return;
        _selectedRpcIndex = nextIndex;
        await onRpcChange();
      }));
      list.querySelectorAll('[data-edit-rpc]').forEach((button) => button.addEventListener('click', () => {
        setRpcEditorState('edit', String(button.getAttribute('data-edit-rpc') || ''));
        renderRpcEditor();
      }));
      list.querySelectorAll('[data-delete-rpc]').forEach((button) => button.addEventListener('click', async () => {
        const rpcId = String(button.getAttribute('data-delete-rpc') || '');
        await deleteRpcById(rpcId);
      }));
    }

    renderRpcEditor();
  }

  function renderRpcEditor() {
    const nameInput = document.getElementById('rpc-form-name');
    const urlInput = document.getElementById('rpc-form-url');
    const modeLabel = document.getElementById('rpc-editor-mode');
    const saveButton = document.getElementById('btn-save-rpc');
    const deleteButton = document.getElementById('btn-delete-rpc');
    const createButton = document.getElementById('btn-new-rpc');
    const existing = currentRpcEditorEntry();
    const isEdit = _rpcEditorState.mode === 'edit' && !!existing;

    if (modeLabel) modeLabel.textContent = isEdit ? `Editing RPC entry ${existing.name}` : 'Create a new RPC entry or choose one from the list to edit.';
    if (saveButton) saveButton.textContent = isEdit ? 'Save RPC' : 'Add RPC';
    if (deleteButton) deleteButton.style.display = isEdit ? '' : 'none';
    if (createButton) createButton.disabled = !isEdit;
    if (!nameInput || !urlInput) return;

    if (isEdit) {
      nameInput.value = existing.name || '';
      urlInput.value = existing.url || '';
      return;
    }
    if (document.activeElement && [nameInput, urlInput].includes(document.activeElement)) {
      return;
    }
    nameInput.value = '';
    urlInput.value = '';
  }

  async function saveRpcEditor() {
    const nameInput = document.getElementById('rpc-form-name');
    const urlInput = document.getElementById('rpc-form-url');
    const name = String(nameInput?.value || '').trim();
    const url = String(urlInput?.value || '').trim();
    if (!name || !url) {
      throw new Error('RPC name and URL are required');
    }
    if (_rpcEditorState.mode === 'edit') {
      const existing = currentRpcEditorEntry();
      if (!existing) throw new Error('RPC entry not found');
      existing.name = name;
      existing.url = url;
      const nextIndex = _rpcList.findIndex((entry) => entry.id === existing.id);
      if (nextIndex >= 0) _selectedRpcIndex = nextIndex;
      notify('RPC updated');
    } else {
      const entry = { id: makeRpcId('rpc'), name, url };
      _rpcList.push(entry);
      _selectedRpcIndex = _rpcList.length - 1;
      setRpcEditorState('edit', entry.id);
      notify('RPC added');
    }
    persist();
    await onRpcChange();
  }

  async function deleteRpcById(rpcId) {
    if (_rpcList.length <= 1) {
      throw new Error('Cannot delete the only RPC entry');
    }
    const rpcIndex = _rpcList.findIndex((entry) => entry.id === rpcId);
    if (rpcIndex < 0) return;
    const rpc = _rpcList[rpcIndex];
    Object.keys(_discoveryCache).forEach((key) => {
      if (key.startsWith(`${rpc.id}::`)) delete _discoveryCache[key];
    });
    Object.keys(_accessCache).forEach((key) => {
      if (key.startsWith(`${rpc.id}::`)) delete _accessCache[key];
    });
    _rpcList.splice(rpcIndex, 1);
    _selectedRpcIndex = Math.min(_selectedRpcIndex, _rpcList.length - 1);
    if (_rpcEditorState.id === rpcId) setRpcEditorState('create', '');
    persist();
    notify('RPC deleted');
    await onRpcChange();
  }

  function renderBlock() {
    const el = document.getElementById('current-block-info');
    if (el) {
      el.innerHTML = `
        <div class="status-stack">
          <h4 class="status-title">Current RPC</h4>
          <div class="status-line"><span class="status-label">RPC</span><span class="status-value">${esc(currentRpcName() || 'Unnamed RPC')}</span></div>
          <div class="status-line status-wrap"><span class="status-label">URL</span><span class="status-value mono">${esc(currentRpcUrl() || 'Not configured')}</span></div>
          <div class="status-line"><span class="status-label">Chain</span><span class="status-value mono">${esc(_chainId ? String(_chainId) : 'Reading...')}</span></div>
          <div class="status-line"><span class="status-label">Block</span><span class="status-value mono">${esc(_blockNumber ? String(_blockNumber) : 'Reading...')}</span></div>
        </div>
      `;
    }
  }

  function renderAddresses() {
    const c = document.getElementById('fixed-addresses-container');
    if (!c) return;
    const version = activeStapleVersion();
    let h = '';
    Object.entries(SECTIONS).forEach(([secId, sec]) => {
      const mode = sectionMode(secId);
      h += '<div class="addr-group">';
      h += `<div class="addr-group-header" data-collapse="${esc(secId)}"><span class="collapse-arrow">▸</span> ${esc(sec.label)} <span class="override-badge">${esc(MODE_LABELS[mode] || mode)}</span> <span class="addr-group-count">(${sec.keys.length})</span></div>`;
      h += `<div class="addr-group-body collapsed" id="addr-group-${esc(secId)}">`;
      if (secId === 'staple') {
        h += `<div class="addr-row"><span class="addr-label">Version</span><span class="addr-value">${esc(version?.version || version?.label || '—')}</span></div>`;
        h += `<div class="addr-row"><span class="addr-label">Address Provider</span><span class="addr-value mono">${esc(sectionAddressProvider() || '—')}</span></div>`;
      }
      sec.keys.forEach((item) => {
        const meta = resolveAddressMeta(item.key);
        const sourceBadge = meta.source === 'provider'
          ? '<span class="override-badge">provider</span>'
          : meta.source === 'version'
            ? '<span class="override-badge">version</span>'
            : meta.source === 'manual'
              ? '<span class="override-badge">manual</span>'
              : '<span class="override-badge">blank</span>';
        h += `<div class="addr-row ${meta.source === 'manual' || meta.source === 'provider' ? 'overridden' : ''}"><span class="addr-label">${esc(item.label)}</span><span class="addr-value mono">${esc(meta.value || '—')}</span>${sourceBadge}${meta.value ? `<button class="btn-icon copy-btn" data-copy-address="${esc(meta.value)}">📋</button>` : ''}</div>`;
      });
      h += '</div></div>';
    });
    c.innerHTML = h;
    c.querySelectorAll('.addr-group-header').forEach((hdr) => {
      hdr.addEventListener('click', () => {
        const id = hdr.getAttribute('data-collapse');
        const body = document.getElementById(`addr-group-${id}`);
        const arrow = hdr.querySelector('.collapse-arrow');
        if (body) {
          body.classList.toggle('collapsed');
          if (arrow) arrow.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
        }
      });
    });
  }

  function renderOverridePanel() {
    const c = document.getElementById('override-panel');
    if (!c) return;
    const versions = stapleVersions();
    const activeVersion = activeStapleVersion();
    const editingVersion = currentVersionEditorEntry();
    const isEdit = _versionEditorState.mode === 'edit' && !!editingVersion;

    let h = '';
    h += '<div class="registry-section-card">';
    h += '<h3>Staple Version Registry</h3>';
    h += '<p class="section-desc">Every saved version binds a version or salt label to one Address Provider. Choose one as active or open any entry to edit it.</p>';
    if (!versions.length) {
      h += '<div class="empty-state">No Staple version configured yet.</div>';
    } else {
      h += '<div class="user-list">';
      versions.forEach((entry) => {
        const active = activeVersion && entry.id === activeVersion.id;
        h += `<div class="user-item${active ? ' active' : ''}">`;
        h += '<div class="user-item-content">';
        h += `<div class="user-header"><span class="user-nickname">${esc(entry.version || entry.label || 'Unnamed Version')}</span></div>`;
        h += `<div class="user-address mono">${esc(entry.addressProvider || 'Address Provider not set')}</div>`;
        h += `<div class="user-tag-list"><span class="user-tag">version</span>${active ? '<span class="user-tag">active</span>' : ''}</div>`;
        h += '</div>';
        h += `<div class="user-item-actions">${active ? '' : `<button class="btn btn-sm btn-secondary" data-select-staple-version="${esc(entry.id)}">Use</button>`}<button class="btn btn-sm btn-secondary" data-edit-staple-version="${esc(entry.id)}">Edit</button><button class="btn btn-sm btn-danger" data-delete-staple-version="${esc(entry.id)}">Delete</button></div>`;
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
    h += '<div class="registry-section-card registry-editor-card">';
    h += `<h3>${isEdit ? 'Edit Staple Version' : 'Add Staple Version'}</h3>`;
    h += '<div class="form-grid vertical-form">';
    h += `<div class="form-item"><label>Version or Salt</label><input id="staple-version-name" class="form-control" value="${esc(editingVersion?.version || editingVersion?.label || '')}" placeholder="e.g. 260428-sepolia-01"></div>`;
    h += `<div class="form-item"><label>Address Provider</label><input id="staple-version-provider" class="form-control mono" value="${esc(editingVersion?.addressProvider || '')}" placeholder="0x..."></div>`;
    h += `<div class="form-item"><label>JR Pricing Factory</label><input id="staple-version-jr-factory" class="form-control mono" value="${esc(editingVersion?.jrPricingFactory || '')}" placeholder="0x..."></div>`;
    h += `<div class="form-item"><div class="helper-text">Staple version bindings live here: version label, Address Provider, and JR Pricing Factory. RPC transport settings stay in the RPC workspace above.</div></div>`;
    h += '<div class="form-actions">';
    h += `<button id="btn-save-staple-version" class="btn btn-primary">${isEdit ? 'Save Version' : 'Add Version'}</button>`;
    h += '<button id="btn-new-staple-version" class="btn btn-secondary">New Draft</button>';
    h += `<button id="btn-refresh-staple-version-addresses" class="btn btn-secondary" ${isEdit ? '' : 'style="display:none"'}>Force Refresh Addresses</button>`;
    h += `<button id="btn-delete-staple-version-inline" class="btn btn-danger" ${isEdit ? '' : 'style="display:none"'}>Delete Version</button>`;
    h += '</div>';
    h += '</div></div>';

    c.innerHTML = h;

    c.querySelectorAll('[data-select-staple-version]').forEach((btn) => btn.addEventListener('click', async () => {
      const versionId = String(btn.getAttribute('data-select-staple-version') || '');
      const previousVersionId = activeStapleVersion()?.id || '';
      const next = normalizeRpcConfig(deepClone(currentEnvConfig()));
      next.sections.staple.selectedVersionId = versionId;
      _envConfig = next;
      if (previousVersionId !== versionId) clearRpcScopedDerivedCaches();
      hydrateCurrentDiscovery();
      persist();
      await onRpcChange();
    }));

    c.querySelectorAll('[data-edit-staple-version]').forEach((btn) => btn.addEventListener('click', () => {
      const versionId = String(btn.getAttribute('data-edit-staple-version') || '');
      setVersionEditorState('edit', versionId);
      renderOverridePanel();
    }));

    c.querySelectorAll('[data-delete-staple-version]').forEach((btn) => btn.addEventListener('click', async () => {
      const versionId = String(btn.getAttribute('data-delete-staple-version') || '');
      await deleteStapleVersion(versionId);
    }));

    const saveButton = document.getElementById('btn-save-staple-version');
    if (saveButton) saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      saveButton.textContent = isEdit ? 'Saving...' : 'Adding...';
      try {
        await saveStapleVersionEditor();
      } catch (error) {
        notify(error.message || error);
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = isEdit ? 'Save Version' : 'Add Version';
      }
    });

    const newButton = document.getElementById('btn-new-staple-version');
    if (newButton) newButton.addEventListener('click', () => {
      setVersionEditorState('create', '');
      renderOverridePanel();
    });

    const refreshButton = document.getElementById('btn-refresh-staple-version-addresses');
    if (refreshButton) refreshButton.addEventListener('click', async () => {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Refreshing...';
      try {
        await forceRefreshStapleVersionAddresses(_versionEditorState.id);
      } catch (error) {
        notify(error.message || error);
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = 'Force Refresh Addresses';
      }
    });

    const deleteInlineButton = document.getElementById('btn-delete-staple-version-inline');
    if (deleteInlineButton) deleteInlineButton.addEventListener('click', async () => {
      try {
        await deleteStapleVersion(_versionEditorState.id);
      } catch (error) {
        notify(error.message || error);
      }
    });

  }

  async function saveStapleVersionEditor() {
    const versionInput = document.getElementById('staple-version-name');
    const providerInput = document.getElementById('staple-version-provider');
    const jrPricingFactoryInput = document.getElementById('staple-version-jr-factory');
    const versionText = String(versionInput?.value || '').trim();
    const providerText = normAddr(String(providerInput?.value || '').trim());
    const jrPricingFactoryText = normAddr(String(jrPricingFactoryInput?.value || '').trim());
    if (!versionText) throw new Error('Version or salt is required');
    if (!isAddr(providerText)) throw new Error('Address Provider must be a valid address');
    if (!isAddr(jrPricingFactoryText)) throw new Error('JR Pricing Factory must be a valid address');

    const discovery = await discoverFromAddressProvider(providerText, _provider);
    if (!discovery?.addresses?.staple_controller) {
      throw new Error('Address Provider validation failed: missing controller');
    }

    const next = normalizeRpcConfig(deepClone(currentEnvConfig()));
    const versions = [...(next.sections.staple.versions || [])];
    const previousEntry = _versionEditorState.mode === 'edit' && _versionEditorState.id
      ? versions.find((item) => item.id === _versionEditorState.id) || null
      : null;
    const entry = normalizeStapleVersionEntry({
      id: _versionEditorState.mode === 'edit' && _versionEditorState.id ? _versionEditorState.id : makeVersionId('ver'),
      label: versionText,
      version: versionText,
      addressProvider: providerText,
      jrPricingFactory: jrPricingFactoryText
    }, versions.length);
    const targetIndex = versions.findIndex((item) => item.id === entry.id);
    if (targetIndex >= 0) versions[targetIndex] = entry;
    else versions.push(entry);
    next.sections.staple.versions = versions;
    next.sections.staple.selectedVersionId = entry.id;
    _envConfig = next;
    if (previousEntry && normAddr(previousEntry.addressProvider) !== providerText) {
      clearVersionRelatedCaches(previousEntry, currentRpcId(), true);
    } else {
      clearRpcScopedDerivedCaches();
    }
    setVersionEditorState('edit', entry.id);
    hydrateCurrentDiscovery();
    persist();
    notify('Staple version saved');
    await onRpcChange();
  }

  async function deleteStapleVersion(versionId) {
    const deletedEntry = stapleVersions().find((entry) => entry.id === versionId) || null;
    const versionsNext = stapleVersions().filter((entry) => entry.id !== versionId);
    const next = normalizeRpcConfig(deepClone(currentEnvConfig()));
    next.sections.staple.versions = versionsNext;
    if (!versionsNext.some((entry) => entry.id === next.sections.staple.selectedVersionId)) {
      next.sections.staple.selectedVersionId = versionsNext[0]?.id || '';
    }
    _envConfig = next;
    clearVersionRelatedCaches(deletedEntry, currentRpcId(), true);
    if (_versionEditorState.id === versionId) setVersionEditorState('create', '');
    hydrateCurrentDiscovery();
    persist();
    notify('Staple version deleted');
    await onRpcChange();
  }

  function renderWalletPanel() {
    const select = document.getElementById('wallet-provider-select');
    const card = document.getElementById('wallet-status-card');
    const switchButton = document.getElementById('btn-switch-wallet-network');
    const wallets = detectBrowserWallets();
    const activeWallet = wallets.find((item) => item.id === _walletState.providerId) || wallets[0] || null;
    const walletMatch = walletMatchesCurrentRpc();

    if (select) {
      select.innerHTML = '';
      if (!wallets.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No injected wallet detected';
        select.appendChild(option);
      } else {
        wallets.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = item.label;
          option.selected = item.id === (activeWallet?.id || '');
          select.appendChild(option);
        });
      }
    }

    if (switchButton) {
      const shouldEnable = !!(_walletState.connected && _chainId && !walletMatch && activeWallet?.provider?.request);
      switchButton.disabled = !shouldEnable;
      switchButton.title = shouldEnable
        ? 'Request the connected wallet to switch onto the selected RPC chain'
        : (activeWallet?.kind === 'ledger-direct'
          ? 'Ledger Direct signs against the selected RPC directly, so there is no wallet-side chain switch action.'
          : 'Wallet and RPC already match, or this environment can continue with local/private-key signers without switching the wallet');
    }

    if (card) {
      if (!wallets.length) {
        card.innerHTML = '<div class="status-stack"><h4 class="status-title">Browser Wallet</h4><div class="status-line"><span class="status-label">Status</span><span class="status-value">No injected wallet detected</span></div><div class="status-line status-wrap"><span class="status-label">Hint</span><span class="status-value">Install or unlock MetaMask / OKX Wallet, or use a compatible injected wallet bridge.</span></div></div>';
      } else if (_walletState.connected && isAddr(_walletState.address)) {
        const isLedgerDirect = _walletState.providerId === LEDGER_DIRECT_ID;
        const ledgerDeviceLine = isLedgerDirect && _walletRuntime.deviceLabel
          ? `<div class="status-line status-wrap"><span class="status-label">Device</span><span class="status-value">${esc(_walletRuntime.deviceLabel)}</span></div>`
          : '';
        card.innerHTML = `<div class="status-stack"><h4 class="status-title">Connected Wallet</h4><div class="status-line"><span class="status-label">Provider</span><span class="status-value">${esc(_walletState.providerLabel || activeWallet?.label || 'Injected Wallet')}</span></div>${ledgerDeviceLine}<div class="status-line status-wrap"><span class="status-label">Account</span><span class="status-value mono">${esc(_walletState.address)}</span></div><div class="status-line"><span class="status-label">Wallet Chain</span><span class="status-value mono">${esc(String(_walletState.chainId || 0))}</span></div><div class="status-line"><span class="status-label">RPC Chain</span><span class="status-value mono">${esc(String(_chainId || 0))}</span></div><div class="status-line status-wrap"><span class="status-label">Compatibility</span><span class="status-value">${isLedgerDirect ? 'Ledger Direct signs against the selected RPC directly. If an authorized device is already connected, this page reuses it directly; otherwise the browser will ask you to choose the Ledger once.' : (walletMatch ? 'Wallet chain matches selected RPC' : 'Wallet chain does not match selected RPC. Wallet-backed writes are blocked until you switch, but local Anvil/private-key signer paths can still work.')}</span></div></div>`;
      } else {
        const directLedgerAvailable = wallets.some((item) => item.id === LEDGER_DIRECT_ID);
        card.innerHTML = `<div class="status-stack"><h4 class="status-title">Browser Wallet</h4><div class="status-line"><span class="status-label">Detected</span><span class="status-value">${esc(wallets.map((item) => item.label).join(', '))}</span></div><div class="status-line status-wrap"><span class="status-label">Status</span><span class="status-value">Ready to connect if this environment needs a wallet signer</span></div><div class="status-line"><span class="status-label">RPC Chain</span><span class="status-value mono">${esc(String(_chainId || 0))}</span></div><div class="status-line status-wrap"><span class="status-label">Hint</span><span class="status-value">${directLedgerAvailable ? 'Ledger Direct is available. Click Connect Wallet to use an already-authorized connected Ledger immediately, or approve the browser device picker once if this site has not seen the device yet.' : 'If you are on Anvil/local RPC, you can continue without connecting a wallet. Production writes now require an explicit browser-wallet connection.'}</span></div></div>`;
      }
    }
  }

  function renderUsers() {
    const c = document.getElementById('user-list-container');
    if (!c) return;
    c.innerHTML = '';

    if (_walletState.connected && isAddr(_walletState.address)) {
      const walletCard = document.createElement('div');
      const active = _selectedUser && String(_selectedUser).toLowerCase() === String(_walletState.address).toLowerCase();
      walletCard.className = 'user-item' + (active ? ' active' : '');
      walletCard.innerHTML = `
        <div class="user-item-content">
          <div class="user-header"><span class="user-nickname">${esc(_walletState.providerLabel || 'Browser Wallet')}</span></div>
          <div class="user-address mono">${esc(_walletState.address)}</div>
          <div class="user-tag-list"><span class="user-tag">browser wallet</span><span class="user-tag">chain ${esc(String(_walletState.chainId || 0))}</span>${active ? '<span class="user-tag">active</span>' : ''}</div>
        </div>
        <div class="user-item-actions">${!active ? `<button class="btn btn-sm btn-secondary" data-select-wallet-user="${esc(_walletState.address)}">Use</button>` : ''}</div>`;
      c.appendChild(walletCard);
    }

    if (!_userList.length) {
      if (!_walletState.connected) c.innerHTML = '<div class="empty-state">No saved accounts added yet.</div>';
      c.querySelectorAll('[data-select-wallet-user]').forEach((b) => b.addEventListener('click', () => selectUser(b.getAttribute('data-select-wallet-user'))));
      renderUserEditor();
      return;
    }
    _userList.forEach((u, idx) => {
      const sel = _selectedUser && String(u.address).toLowerCase() === String(_selectedUser).toLowerCase();
      const tags = userTagsForDisplay(u);
      const d = document.createElement('div');
      d.className = 'user-item' + (sel ? ' active' : '');
      d.innerHTML = `
        <div class="user-item-content">
          <div class="user-header">
            <span class="user-nickname">${esc(u.nickname || `User ${idx + 1}`)}</span>
          </div>
          <div class="user-address mono">${esc(u.address)}</div>
          <div class="user-tag-list">
            ${tags.length ? tags.map((tag) => `<span class="user-tag">${esc(tag)}</span>`).join('') : '<span class="user-tag muted">no tags</span>'}
          </div>
        </div>
        <div class="user-item-actions">${!sel ? `<button class="btn btn-sm btn-secondary" data-select-user="${esc(u.address)}">Use</button>` : ''}<button class="btn btn-sm btn-secondary" data-edit-user="${esc(u.address)}">Edit</button><button class="btn btn-sm btn-danger" data-delete-user="${esc(u.address)}">Delete</button></div>`;
      c.appendChild(d);
    });
    c.querySelectorAll('[data-select-wallet-user]').forEach((b) => b.addEventListener('click', () => selectUser(b.getAttribute('data-select-wallet-user'))));
    c.querySelectorAll('[data-select-user]').forEach((b) => b.addEventListener('click', () => selectUser(b.getAttribute('data-select-user'))));
    c.querySelectorAll('[data-edit-user]').forEach((b) => b.addEventListener('click', () => editUser(b.getAttribute('data-edit-user'))));
    c.querySelectorAll('[data-delete-user]').forEach((b) => b.addEventListener('click', () => deleteUser(b.getAttribute('data-delete-user'))));
    renderUserEditor();
  }

  function renderUserEditor() {
    const addressInput = document.getElementById('input-user-address');
    const nicknameInput = document.getElementById('input-user-nickname');
    const tagsInput = document.getElementById('input-user-tags');
    const submitButton = document.getElementById('submit-user-add');
    const cancelButton = document.getElementById('btn-cancel-user-edit');
    const modeLabel = document.getElementById('user-form-mode');
    const generatedPanel = document.getElementById('generated-user-secret-panel');
    const generatedInput = document.getElementById('generated-user-private-key');
    const existing = currentUserEditorEntry();
    const isEdit = _userEditorState.mode === 'edit' && !!existing;

    if (modeLabel) modeLabel.textContent = isEdit ? `Editing ${existing.nickname || shorten(existing.address)}` : 'Create or select a user profile.';
    if (submitButton) submitButton.textContent = isEdit ? 'Save User' : 'Add User';
    if (cancelButton) cancelButton.style.display = isEdit ? '' : 'none';
    if (generatedPanel && generatedInput) {
      if (!isEdit && _generatedWalletPreview?.privateKey && !_generatedWalletPreview.shown) {
        generatedPanel.style.display = '';
        generatedInput.value = _generatedWalletPreview.privateKey;
        _generatedWalletPreview.shown = true;
      } else {
        generatedPanel.style.display = 'none';
        generatedInput.value = '';
      }
    }
    if (!addressInput || !nicknameInput || !tagsInput) return;

    if (isEdit) {
      addressInput.value = existing.address || '';
      addressInput.readOnly = true;
      addressInput.style.backgroundColor = '#f8fafc';
      nicknameInput.value = existing.nickname || '';
      tagsInput.value = sanitizeUserTags(existing.tags || []).join(', ');
      return;
    }

    if (document.activeElement && [addressInput, nicknameInput, tagsInput].includes(document.activeElement)) {
      return;
    }
    addressInput.value = _generatedWalletPreview?.address || '';
    addressInput.readOnly = !!_generatedWalletPreview?.address;
    addressInput.style.backgroundColor = _generatedWalletPreview?.address ? '#f0f0f0' : '';
    nicknameInput.value = _generatedWalletPreview?.nickname || '';
    tagsInput.value = '';
  }

  function renderCreds() {
    const ck = document.getElementById('current-chainlink-key');
    if (ck) {
      ck.textContent = _chainlinkConfig.apiKey || 'Not Set';
      ck.style.color = _chainlinkConfig.apiKey ? 'inherit' : 'red';
    }
    const cs = document.getElementById('current-chainlink-secret');
    if (cs) {
      cs.textContent = _chainlinkConfig.apiSecret ? '***' : 'Not Set';
      cs.style.color = _chainlinkConfig.apiSecret ? 'green' : 'red';
    }
    const remember = document.getElementById('remember-chainlink-session');
    if (remember) remember.checked = !!_rememberChainlinkForSession;
    const status = document.getElementById('chainlink-session-status');
    if (status) {
      status.textContent = _rememberChainlinkForSession
        ? 'Remembered for this browser session only.'
        : 'Stored in current page memory only. Use a password manager to refill when needed.';
    }
  }

  function renderPoolPanel() {
    const st = document.getElementById('pool-info-status');
    if (!st) return;
    try {
      const info = getPoolInfo();
      st.textContent = 'Cached';
      st.className = 'badge badge-success';
      const ts = document.getElementById('pool-info-timestamp');
      if (ts) ts.textContent = new Date(info.timestamp).toLocaleString();
      const ttl = document.getElementById('pool-info-ttl');
      if (ttl) ttl.textContent = fmtDur(CACHE.TTL_P);
      const exp = document.getElementById('pool-info-expires');
      if (exp) exp.textContent = fmtDur(CACHE.TTL_P - (Date.now() - info.timestamp));
      const len = document.getElementById('pool-info-length');
      if (len) len.textContent = info.poolLength;
      const vtp = document.getElementById('pool-info-vtp-length');
      if (vtp) vtp.textContent = info.vtpLength;
      const pre = document.getElementById('pool-info-preview');
      if (pre) pre.textContent = JSON.stringify(info.data, null, 2);
    } catch (e) {
      st.textContent = _envRefreshing ? 'Loading' : (String(e.message || '').includes('Expired') ? 'Expired' : 'Missing');
      st.className = _envRefreshing ? 'badge badge-info' : 'badge badge-warning';
    }
  }

  function renderSymPanel() {
    const st = document.getElementById('symbols-status');
    if (!st) return;
    try {
      const syms = getSymbols();
      const keys = Object.keys(syms);
      const raw = localStorage.getItem(sck());
      const ts = raw ? JSON.parse(raw).timestamp : 0;
      st.textContent = 'Cached';
      st.className = 'badge badge-success';
      const tsEl = document.getElementById('symbols-timestamp');
      if (tsEl) tsEl.textContent = new Date(ts).toLocaleString();
      const cnt = document.getElementById('symbols-count');
      if (cnt) cnt.textContent = keys.length;
      const lst = document.getElementById('symbols-list');
      if (lst) {
        lst.innerHTML = '';
        keys.sort((a, b) => String(syms[a] || '').toLowerCase().localeCompare(String(syms[b] || '').toLowerCase())).forEach((a) => {
          const r = document.createElement('div');
          r.className = 'symbol-item';
          r.innerHTML = `<span style="font-weight:600">${esc(syms[a])}</span> <span class="mono" style="font-size:0.85em">${esc(a)}</span>`;
          lst.appendChild(r);
        });
      }
    } catch (e) {
      st.textContent = _envRefreshing ? 'Loading' : 'Missing';
      st.className = _envRefreshing ? 'badge badge-info' : 'badge badge-warning';
    }
  }

  function render() {
    renderRpc();
    renderBlock();
    renderAddresses();
    renderOverridePanel();
    renderWalletPanel();
    renderUsers();
    renderCreds();
    renderGrantRolePanel();
    renderMinterV2Panel();
    renderPoolPanel();
    renderSymPanel();
  }

  async function onRpcChange() {
    resetReadyPromise();
    const seq = ++_rpcLoadSeq;
    const rpcId = currentRpcId();
    const url = currentRpcUrl();
    const stapleMode = sectionMode('staple');
    const providerAddr = sectionAddressProvider();

    _uiPoolContract = null;
    _provider = null;
    _chainId = 0;
    _blockNumber = 0;
    _blockTime = 0;
    hydrateCurrentDiscovery();
    persist();
    render();

    const provider = await refreshProvider(url);
    if (seq !== _rpcLoadSeq) return;
    _provider = provider;

    const blockInfo = await refreshBlockInfo(provider, url);
    if (seq !== _rpcLoadSeq) return;
    _chainId = blockInfo.chainId;
    _blockNumber = blockInfo.blockNumber;
    _blockTime = blockInfo.blockTime;
    if (_walletState.connected && _walletState.providerId === LEDGER_DIRECT_ID) {
      try {
        await connectLedgerDirectWallet({ silent: true });
      } catch (error) {
        console.warn('ledger direct reconnect failed after RPC change', error);
        writeWalletSessionHint(null);
        clearWalletRuntime();
        setWalletRuntimeState({ connected: false, providerId: '', providerLabel: '', address: '', chainId: 0 });
      }
    }
    render();

    if (stapleMode === 'address-provider' && isAddr(providerAddr)) {
      try {
        await refreshAddressProviderDiscovery(false, rpcId, providerAddr, provider, stapleMode);
      } catch (e) {
        console.error('address provider discovery failed', e);
      }
      if (seq !== _rpcLoadSeq) return;
      render();
    } else {
      _currentDiscovery = null;
      render();
    }

    try {
      await refreshAddressAccessCache(false, null, rpcId, provider);
    } catch (e) {
      console.error('address access discovery failed', e);
    }
    if (seq !== _rpcLoadSeq) return;
    render();
    resolveReadyPromise();
  }

  function wireAll() {
    const rpcSel = document.getElementById('rpc-select');
    if (rpcSel) rpcSel.addEventListener('change', async (e) => {
      _selectedRpcIndex = Number(e.target.value);
      await onRpcChange();
    });

    const walletSelect = document.getElementById('wallet-provider-select');
    if (walletSelect) walletSelect.addEventListener('change', async () => {
      const wallets = detectBrowserWallets();
      const selected = wallets.find((item) => item.id === walletSelect.value) || wallets[0] || null;
      if (!selected) return;
      _walletState.providerId = selected.id;
      _walletState.providerLabel = selected.label;
      renderWalletPanel();
      notify(`Selected browser wallet provider: ${selected.label}`);
    });

    const refreshWalletsButton = document.getElementById('btn-refresh-wallets');
    if (refreshWalletsButton) refreshWalletsButton.addEventListener('click', async () => {
      refreshWalletsButton.disabled = true;
      const originalText = refreshWalletsButton.textContent;
      refreshWalletsButton.textContent = 'Refreshing...';
      try {
        bindDetectedWalletEvents();
        renderWalletPanel();
        const wallets = detectBrowserWallets();
        notify(wallets.length
          ? `Detected wallets refreshed: ${wallets.map((item) => item.label).join(', ')}`
          : 'No injected wallet detected after refresh. Please unlock MetaMask / OKX Wallet, or use Ledger Direct in a WebHID-capable browser.');
      } catch (error) {
        notify(error.message || error);
      } finally {
        refreshWalletsButton.disabled = false;
        refreshWalletsButton.textContent = originalText;
      }
    });

    const connectWalletButton = document.getElementById('btn-connect-wallet');
    if (connectWalletButton) connectWalletButton.addEventListener('click', async () => {
      connectWalletButton.disabled = true;
      const originalText = connectWalletButton.textContent;
      const selectedId = String(document.getElementById('wallet-provider-select')?.value || '');
      connectWalletButton.textContent = selectedId === LEDGER_DIRECT_ID ? 'Opening Ledger Prompt...' : 'Connecting...';
      try {
        await connectBrowserWallet(selectedId);
      } catch (error) {
        notify(error.message || error);
      } finally {
        connectWalletButton.disabled = false;
        connectWalletButton.textContent = originalText;
      }
    });

    const switchWalletNetworkButton = document.getElementById('btn-switch-wallet-network');
    if (switchWalletNetworkButton) switchWalletNetworkButton.addEventListener('click', async () => {
      switchWalletNetworkButton.disabled = true;
      const originalText = switchWalletNetworkButton.textContent;
      switchWalletNetworkButton.textContent = 'Switching...';
      try {
        await switchConnectedWalletNetwork();
      } catch (error) {
        notify(error.message || error);
      } finally {
        switchWalletNetworkButton.textContent = originalText;
        renderWalletPanel();
      }
    });

    const disconnectWalletButton = document.getElementById('btn-disconnect-wallet');
    if (disconnectWalletButton) disconnectWalletButton.addEventListener('click', async () => {
      disconnectWalletButton.disabled = true;
      const originalText = disconnectWalletButton.textContent;
      disconnectWalletButton.textContent = 'Disconnecting...';
      try {
        await disconnectBrowserWallet();
      } finally {
        disconnectWalletButton.disabled = false;
        disconnectWalletButton.textContent = originalText;
      }
    });

    const saveRpc = document.getElementById('btn-save-rpc');
    if (saveRpc) saveRpc.addEventListener('click', async () => {
      try {
        await saveRpcEditor();
      } catch (error) {
        notify(error.message || error);
      }
    });

    const newRpc = document.getElementById('btn-new-rpc');
    if (newRpc) newRpc.addEventListener('click', () => {
      setRpcEditorState('create', '');
      renderRpcEditor();
    });

    const deleteRpcButton = document.getElementById('btn-delete-rpc');
    if (deleteRpcButton) deleteRpcButton.addEventListener('click', async () => {
      try {
        await deleteRpcById(_rpcEditorState.mode === 'edit' ? _rpcEditorState.id : currentRpcId());
      } catch (error) {
        notify(error.message || error);
      }
    });

    const addUsr = document.getElementById('submit-user-add');
    if (addUsr) addUsr.addEventListener('click', () => {
      const ai = document.getElementById('input-user-address');
      const ni = document.getElementById('input-user-nickname');
      const ti = document.getElementById('input-user-tags');
      const a = (ai ? ai.value : '').trim();
      const n = (ni ? ni.value : '').trim();
      const t = (ti ? ti.value : '').trim();
      try {
        if (_userEditorState.mode === 'edit') {
          const existing = currentUserEditorEntry();
          if (!existing) throw new Error('User entry not found');
          existing.nickname = n.trim() || shorten(existing.address);
          existing.tags = sanitizeUserTags(t);
          clearGeneratedWalletPreview();
          setUserEditorState('create', '');
          persist();
          render();
          notify('User updated');
          return;
        }
        if (!a) {
          throw new Error('Enter an address');
        }
        addUser(a, n, t);
      } catch (error) {
        notify(error.message || error);
      }
    });

    const ai = document.getElementById('input-user-address');

    const cancelUserBtn = document.getElementById('btn-cancel-user-edit');
    if (cancelUserBtn) cancelUserBtn.addEventListener('click', () => {
      clearGeneratedWalletPreview();
      setUserEditorState('create', '');
      renderUserEditor();
    });

    const rndBtn = document.getElementById('btn-generate-random');
    if (rndBtn) rndBtn.addEventListener('click', () => {
      const w = ethers.Wallet.createRandom();
      _generatedWalletPreview = {
        address: w.address,
        privateKey: w.privateKey,
        nickname: `Random ${shorten(w.address)}`,
        shown: false
      };
      renderUserEditor();
    });

    const chainlinkRemember = document.getElementById('remember-chainlink-session');
    if (chainlinkRemember) chainlinkRemember.addEventListener('change', () => {
      _rememberChainlinkForSession = !!chainlinkRemember.checked;
      persistChainlinkSession();
      renderCreds();
      notify(_rememberChainlinkForSession
        ? 'Chainlink credentials will be remembered for this browser session'
        : 'Chainlink credentials will no longer be remembered after this page is closed');
    });

    const clearChainlinkSessionBtn = document.getElementById('btn-clear-chainlink-session');
    if (clearChainlinkSessionBtn) clearChainlinkSessionBtn.addEventListener('click', () => {
      _rememberChainlinkForSession = false;
      _chainlinkConfig = { apiKey: '', apiSecret: '' };
      persistChainlinkSession();
      render();
      notify('Cleared Chainlink credentials from the current browser session');
    });

    const ckb = document.getElementById('submit-chainlink-key');
    if (ckb) ckb.addEventListener('click', () => {
      const i = document.getElementById('input-chainlink-key');
      _chainlinkConfig.apiKey = i ? i.value.trim() : '';
      persist();
      persistChainlinkSession();
      render();
      if (i) i.value = '';
    });

    const csb = document.getElementById('submit-chainlink-secret');
    if (csb) csb.addEventListener('click', () => {
      const i = document.getElementById('input-chainlink-secret');
      _chainlinkConfig.apiSecret = i ? i.value.trim() : '';
      persist();
      persistChainlinkSession();
      render();
      if (i) i.value = '';
    });

    const accessControlUseAdminButton = document.getElementById('btn-access-control-use-admin');
    if (accessControlUseAdminButton) accessControlUseAdminButton.addEventListener('click', async () => {
      accessControlUseAdminButton.disabled = true;
      try {
        switchToAccessControlAdminUser();
      } catch (error) {
        const friendly = formatGrantRoleError(error);
        setGrantRoleStatus(friendly, 'error');
        COMMON.showErrorToast(friendly, { raw: true, autoClose: false });
      } finally {
        accessControlUseAdminButton.disabled = false;
      }
    });

    const accessControlAddButton = document.getElementById('btn-access-control-add');
    if (accessControlAddButton) accessControlAddButton.addEventListener('click', async () => {
      accessControlAddButton.disabled = true;
      accessControlAddButton.textContent = 'Adding...';
      setGrantRoleStatus('Submitting access control update...');
      try {
        await updateAccessControlMember('grant');
      } catch (error) {
        const friendly = formatGrantRoleError(error);
        setGrantRoleStatus(friendly, 'error');
        COMMON.showErrorToast(friendly, { raw: true, autoClose: false });
      } finally {
        accessControlAddButton.disabled = false;
        accessControlAddButton.textContent = 'Add Member';
      }
    });

    const minterButton = document.getElementById('btn-minter-v2-execute');
    if (minterButton) minterButton.addEventListener('click', async () => {
      minterButton.disabled = true;
      minterButton.textContent = 'Setting...';
      setMinterStatus('Preparing balance override...');
      try {
        await executeMinterV2();
      } catch (error) {
        const friendly = formatMinterError(error);
        setMinterStatus(friendly, 'error');
        notify(friendly);
      } finally {
        minterButton.disabled = false;
        minterButton.textContent = 'Set Balance';
      }
    });

    const nativeRefreshButton = document.getElementById('btn-minter-v2-refresh-native');
    if (nativeRefreshButton) nativeRefreshButton.addEventListener('click', async () => {
      nativeRefreshButton.disabled = true;
      nativeRefreshButton.textContent = 'Sending...';
      try {
        await executeMinterNativeRefreshTransfer();
      } catch (error) {
        const friendly = String(error?.message || error || 'Native refresh transfer failed');
        COMMON.showErrorToast(friendly, { raw: true, autoClose: false });
      } finally {
        nativeRefreshButton.textContent = 'Send Native Refresh Tx';
        renderMinterV2Panel();
      }
    });

    const pb = document.getElementById('btn-refresh-pool-info');
    if (pb) pb.addEventListener('click', async () => {
      pb.disabled = true;
      pb.textContent = 'Refreshing...';
      try {
        await refreshPoolInfo(true);
      } catch (e) {
        notify(e.message || e);
      }
      pb.disabled = false;
      pb.textContent = 'Force Refresh';
    });

    const sb = document.getElementById('btn-refresh-symbols');
    if (sb) sb.addEventListener('click', async () => {
      sb.disabled = true;
      sb.textContent = 'Refreshing...';
      try {
        await refreshPoolInfo(true);
        await refreshSymbols(true);
        renderSymPanel();
      } catch (e) {
        notify(e.message || e);
      }
      sb.disabled = false;
      sb.textContent = 'Force Refresh';
    });

    document.addEventListener('click', async (e) => {
      const revokeButton = e.target.closest('[data-access-control-revoke]');
      if (revokeButton) {
        const memberAddress = revokeButton.getAttribute('data-access-control-revoke');
        if (!memberAddress) return;
        if (!isAccessControlRevokeArmed(memberAddress)) {
          armAccessControlRevokeButton(revokeButton, memberAddress);
          return;
        }
        resetAccessControlRevokeButtonState(revokeButton, memberAddress);
        revokeButton.disabled = true;
        revokeButton.textContent = 'Removing...';
        setGrantRoleStatus('Submitting access control update...');
        try {
          await updateAccessControlMember('revoke', memberAddress);
        } catch (error) {
          const friendly = formatGrantRoleError(error);
          setGrantRoleStatus(friendly, 'error');
          COMMON.showErrorToast(friendly, { raw: true, autoClose: false });
        } finally {
          revokeButton.disabled = false;
          resetAccessControlRevokeButtonState(revokeButton, memberAddress);
        }
        return;
      }

      const b = e.target.closest('[data-copy-address]');
      if (!b) return;
      const a = b.getAttribute('data-copy-address');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(a);
        } else {
          const t = document.createElement('textarea');
          t.value = a;
          t.style.position = 'fixed';
          t.style.opacity = '0';
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
        }
      } catch (_) {}
    });

    (COMMON.setupCopyDelegation || function () {})();
  }

  function wireTabs() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        const t = document.getElementById(item.getAttribute('data-tab'));
        if (t) t.classList.add('active');
      });
    });
  }

  load();

  document.addEventListener('DOMContentLoaded', async () => {
    wireTabs();
    wireAll();
    bindSearchSelects();
    render();
    try {
      await onRpcChange();
      bindDetectedWalletEvents();
      await recoverWalletSession();
      try {
        getPoolInfo();
      } catch (_) {
        await refreshPoolInfo();
      }
    } catch (e) {
      console.error(e);
    }
    render();
  });

  window.addEventListener('storage', () => {
    load();
    hydrateCurrentDiscovery();
    onRpcChange().catch((error) => console.error(error));
  });

  window.environment = {
    getAllParams,
    waitUntilReady,
    addUser,
    getUserList: () => _userList.slice(),
    selectUser,
    deleteUser,
    editUser,
    refreshPoolInfo,
    refreshSymbols,
    getPoolInfo,
    getSymbols,
    getFixedAddresses: () => ({
      jrPricingFactory: sectionJrPricingFactory()
    }),
    resolveAddress,
    resolveAddressMeta,
    getCurrentConfig: () => deepClone(currentEnvConfig()),
    refreshAddressProviderDiscovery,
    refreshAddressAccessCache,
    getAccessProfile,
    getSignerCandidate,
    currentAdminActor,
    getWalletState: () => ({ ..._walletState }),
    getConnectedWalletSigner,
    connectBrowserWallet,
    disconnectBrowserWallet,
    switchConnectedWalletNetwork,
    recoverWalletSession,
    listBrowserWallets: detectBrowserWallets,
    isProductionRuntime,
    walletMatchesCurrentRpc
  };
})();
