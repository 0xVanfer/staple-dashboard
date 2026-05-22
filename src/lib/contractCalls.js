(function () {
  // Dependencies: src/lib/common.js, src/lib/rpcManager.js, src/pages/environment/environment.js, abigen/**/*.js
  // Ensure the script runs only in a browser environment
  if (typeof window === 'undefined') return;

  // Use common utilities provided by the application
  const COMMON = window.stapleCommon;

  // =====================================================
  // Contract Instance Getters (No Caching)
  // These functions return ethers.Contract instances for interacting with the blockchain.
  // =====================================================

  // ========= Controller Related Contracts =========
  
  /**
   * Get the Controller Contract Instance.
   * The Controller is the core contract of the system, managing pools, VTPs, and other key components.
   * 
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use for the contract instance.
   * @returns {Promise<ethers.Contract|null>} The Controller contract instance or null if not found.
   */
  async function getController(signerOrAddr) {
    // Retrieve the controller address from the environment parameters
    let addr = window.environment?.getAllParams().controller;
    
    // If the address is not valid, try to fetch it from the UiPoolDataProvider
    if (!COMMON.isAddress(addr)) {
      try {
        const ui = await getUiPoolDataProvider();
        // Use RpcManager to make the call if available
        if (ui && window.RpcManager) addr = await window.RpcManager.call(ui, 'controller');
      } catch (e) {
        // Ignore errors during fallback fetch
      }
    }
    
    // If still no valid address, return null
    if (!COMMON.isAddress(addr)) return null;
    
    // Resolve the signer to use for the contract
    const signer = await COMMON.resolveSigner(signerOrAddr);
    // Return the contract instance connected to the signer or the default provider
    return new ethers.Contract(addr, stapleControllerAbi, signer || COMMON.getRpcProvider());
  }

  /**
   * Get the Incentive Controller Contract Instance.
   * This contract manages the distribution of incentives to users.
   * 
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract|null>} The IncentivesController contract instance.
   */
  async function getIncentivesController(signerOrAddr) {
    // Retrieve the incentives controller address from environment
    let addr = window.environment?.getAllParams().incentivesController;
    
    // Fallback: fetch from UiPoolDataProvider if not set locally
    if (!COMMON.isAddress(addr)) {
      try {
        const ctl = await getUiPoolDataProvider();
        if (ctl && window.RpcManager) addr = await window.RpcManager.call(ctl, 'incentivesController');
      } catch (e) {
        // Ignore errors
      }
    }
    
    if (!COMMON.isAddress(addr)) return null;
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(addr, stapleIncentivesControllerAbi, signer || COMMON.getRpcProvider());
  }

  /**
   * Get the UI Pool Data Provider Contract Instance.
   * This contract aggregates data for all pools and VTPs, optimized for UI consumption.
   * 
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract|null>} The UiPoolDataProvider contract instance.
   */
  async function getUiPoolDataProvider(signerOrAddr) {
    const addr = window.environment?.getAllParams().uiPoolDataProvider;
    if (!COMMON.isAddress(addr)) return null;
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(addr, stapleUIPoolDataProviderAbi, signer || COMMON.getRpcProvider());
  }

  /**
   * Get the Router Contract Instance.
   * The Router executes user operations such as deposits, withdrawals, rebalancing, and swaps.
   * 
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract>} The Router contract instance.
   * @throws {Error} If the Router address is not found.
   */
  async function getRouter(signerOrAddr) {
    const addr = window.environment?.getAllParams().router;
    if (!COMMON.isAddress(addr)) throw new Error('Valid Router address not found');
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(addr, stapleRouterAbi, signer || COMMON.getRpcProvider());
  }

  // ========= Pool Related Contracts =========
  
  /**
   * Get a Pool Contract Instance at a specified address.
   * 
   * @param {string} address - The address of the pool contract.
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract>} The Pool contract instance.
   * @throws {Error} If the pool address is invalid.
   */
  async function getPool(address, signerOrAddr) {
    if (!COMMON.isAddress(address)) throw new Error('Invalid pool address');
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(address, staplePoolBasicAbi, signer || COMMON.getRpcProvider());
  }

  // ========= Price Provider and Oracle Related Contracts =========
  
  /**
   * Get the Price Provider Contract Instance.
   * This contract provides token price information from various oracles.
   * 
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract>} The PriceProvider contract instance.
   * @throws {Error} If the PriceProvider address cannot be determined.
   */
  async function getPriceProvider(signerOrAddr) {
    let addr = window.environment?.getAllParams().priceProvider;
    
    // Fallback: fetch from Controller if not set locally
    if (!COMMON.isAddress(addr)) {
      try {
        const ctl = await getController();
        if (ctl && window.RpcManager) addr = await window.RpcManager.call(ctl, 'priceProvider');
      } catch (e) {
        // Ignore errors
      }
    }
    
    if (!COMMON.isAddress(addr)) throw new Error('Cannot determine priceProvider address');
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(addr, staplePriceProviderAbi, signer || COMMON.getRpcProvider());
  }

  /**
   * Get a Verifier Contract Instance.
   * Verifiers are responsible for verifying oracle data and updating prices.
   * 
   * @param {string} address - The address of the verifier contract.
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract>} The Verifier contract instance.
   * @throws {Error} If the verifier address is invalid.
   */
  async function getVerifier(address, signerOrAddr) {
    if (!COMMON.isAddress(address)) throw new Error('Invalid verifier address');
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(address, stapleOracleVerifierExtensionsAbi, signer || COMMON.getRpcProvider());
  }

  // ========= Token Related Contracts =========
  
  /**
   * Get the Test ERC20 Factory Contract Instance.
   * This factory is used to create and manage test tokens for development.
   * 
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract|null>} The TestERC20Factory contract instance.
   */
    async function getTestERC20Factory(signerOrAddr) {
    const addr = window.environment?.getAllParams().testERC20Factory;
    if (!COMMON.isAddress(addr)) return null;
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(addr, stapleTestERC20FactoryAbi, signer || COMMON.getRpcProvider());
  }

  /**
   * Get an ERC20 Contract Instance at a specified address.
   * 
   * @param {string} address - The address of the ERC20 token.
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.Contract>} The ERC20 contract instance.
   * @throws {Error} If the ERC20 address is invalid.
   */
  async function getErc20(address, signerOrAddr) {
    if (!COMMON.isAddress(address)) throw new Error('Invalid ERC20 address');
    const signer = await COMMON.resolveSigner(signerOrAddr);
    return new ethers.Contract(address, erc20MetadataAbi, signer || COMMON.getRpcProvider());
  }


  // =====================================================
  // Pool Data Manager (Centralized Pool Data & Token Metadata)
  // This module manages caching of pool data and token metadata to reduce RPC calls.
  // DELEGATES TO window.environment FOR CACHING
  // =====================================================
  
    const PoolDataManager = (function() {

    return {
      /**
       * Get all pools data, using cache if available.
       * Delegates to window.environment.
       * 
       * @returns {Promise<Array>} The array of pool data.
       */
      getPools: async function() {
        if (!window.environment) {
            console.warn("PoolDataManager: window.environment not ready");
            return [];
        }
        if (typeof window.environment.waitUntilReady === 'function') {
            await window.environment.waitUntilReady();
        }
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const data = window.environment.getPoolInfo().data;
            if (Array.isArray(data)) return data;
          } catch (_) {}
          try {
            await window.environment.refreshPoolInfo(true);
          } catch (_) {}
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return [];
      },

      /**
       * Force update pools data from blockchain.
       * 
       * @returns {Promise<Array>} The array of pool data.
       */
      updatePools: async function() {
        if (!window.environment) return [];
        if (typeof window.environment.waitUntilReady === 'function') {
          await window.environment.waitUntilReady();
        }
        await window.environment.refreshPoolInfo(true);
        return window.environment.getPoolInfo().data;
      }
    };
  })();

  // Expose PoolDataManager globally
  window.PoolDataManager = PoolDataManager;

  // =====================================================
  // Data Reading Functions (Read-only, No Caching)
  // These functions perform direct reads or use the PoolDataManager.
  // =====================================================

  // ========= Token Data Reading =========
  
  /**
   * Get the list of all supported test tokens from the factory.
   * 
   * @returns {Promise<string[]>} An array of token addresses.
   */

  async function resolveEnvAddress(getter, attempts = 3) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (window.environment && typeof window.environment.waitUntilReady === 'function') {
        await window.environment.waitUntilReady();
      }
      let value = '';
      try {
        value = getter();
      } catch (_) {}
      if (COMMON.isAddress(value)) return value;
      try {
        await window.environment?.refreshPoolInfo?.(true);
      } catch (_) {}
      try {
        await window.environment?.refreshSymbols?.(true);
      } catch (_) {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return '';
  }

  async function getSupportedTokens() {
    try {
      if (window.environment && typeof window.environment.waitUntilReady === 'function') {
        await window.environment.waitUntilReady();
      }
      if (window.RpcManager) {
        const f = await getTestERC20Factory();
        if (f) return await window.RpcManager.call(f, 'supportedTokens', []);
      } else {
        const f = await getTestERC20Factory();
        if (f) {
          const tokens = await f.supportedTokens();
          if (Array.isArray(tokens)) return tokens;
        }
      }

      const pools = await getPools();
      const discovered = new Set();
      (Array.isArray(pools) ? pools : []).forEach((pool) => {
        const asset = pool?.params?.asset;
        const lpAddr = pool?.params?.lpAddr;
        if (COMMON.isAddress(asset)) discovered.add(asset);
        if (COMMON.isAddress(lpAddr)) discovered.add(lpAddr);
      });
      return Array.from(discovered);
    } catch (e) {
      return [];
    }
  }

  // ========= Price Provider Data Reading =========

  // ========= Pool Data Reading =========
  
  /**
   * Get all pools information.
   * Delegates to the PoolDataManager to leverage caching.
   * 
   * @returns {Promise<Array>} An array of pool data.
   */
  async function getPools() {
    return await window.PoolDataManager.getPools();
  }

  // =====================================================
  // Write Operations / Transactions
  // These functions perform state-changing operations on the blockchain.
  // =====================================================

  // ========= Price Verification Related Operations =========
  
  /**
   * Verify all token prices.
   * This function constructs a verification payload and submits it to the Price Provider.
   * 
   * @param {string[]} tokens - An array of token addresses to verify.
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.providers.TransactionReceipt>} The transaction receipt.
   * @throws {Error} If the payload builder is missing or signer cannot be resolved.
   */
  async function verifyAll(tokens, signerOrAddr) {
    if (typeof window.buildPriceProviderVerificationPayload !== 'function') {
      throw new Error('buildPriceProviderVerificationPayload not loaded');
    }
    // Build the verification payload (logic in testtoken.verify.js)
    const encoded = await window.buildPriceProviderVerificationPayload(tokens);
    
    const signer = await COMMON.resolveSigner(signerOrAddr || window.environment?.getAllParams().user);
    if (!signer) throw new Error('Cannot resolve valid signer');
    
    const pp = await getPriceProvider(signer);
    let tx;
    try {
      // Try the standard verify method
      tx = await pp.verify(encoded);
    } catch (e) {
      // Fallback to verifyPrices if verify fails (older interface support)
      if (pp.verifyPrices) {
        tx = await pp.verifyPrices(encoded);
      } else {
        throw e;
      }
    }
    // Wait for transaction confirmation
    return tx.wait();
  }

  /**
   * Update Staple token prices manually.
   * This is typically used for testing or specific oracle types.
   * 
   * @param {string} verifierAddr - The address of the Verifier contract.
   * @param {string[]} tokens - An array of token addresses.
   * @param {number[]} pricesHuman18 - An array of prices in human-readable format (assumed 18 decimals).
   * @param {string|ethers.Signer} signerOrAddr - The signer or address to use.
   * @returns {Promise<ethers.providers.TransactionReceipt>} The transaction receipt.
   * @throws {Error} If inputs are invalid or length mismatch.
   */
  function extractReadableError(error) {
    return error?.reason
      || error?.error?.reason
      || error?.error?.message
      || error?.data?.message
      || error?.message
      || String(error);
  }

  async function getManagerCandidates(verifier) {
    if (!verifier || typeof verifier.MANAGER_ROLE !== 'function') return [];
    if (typeof verifier.getRoleMemberCount !== 'function' || typeof verifier.getRoleMember !== 'function') return [];
    try {
      const role = await verifier.MANAGER_ROLE();
      const count = Number(await verifier.getRoleMemberCount(role));
      const members = [];
      for (let index = 0; index < count; index++) {
        const member = await verifier.getRoleMember(role, index);
        if (COMMON.isAddress(member)) members.push(member);
      }
      return [...new Set(members.map((item) => item.toLowerCase()))];
    } catch (_) {
      return [];
    }
  }

  async function resolveStapleManagerSigner(verifierAddr, signerOrAddr) {
    const verifierRead = await getVerifier(verifierAddr);
    const preferredSigner = await COMMON.resolveSigner(signerOrAddr, {
      contractAddress: verifierAddr,
      requireAdmin: true
    });

    if (preferredSigner && verifierRead && typeof verifierRead.MANAGER_ROLE === 'function' && typeof verifierRead.hasRole === 'function') {
      try {
        const role = await verifierRead.MANAGER_ROLE();
        const signerAddress = await preferredSigner.getAddress();
        if (await verifierRead.hasRole(role, signerAddress)) return preferredSigner;
      } catch (_) {}
    } else if (preferredSigner) {
      return preferredSigner;
    }

    const managerCandidates = await getManagerCandidates(verifierRead);
    for (const candidate of managerCandidates) {
      const signer = await COMMON.resolveSigner(candidate);
      if (signer) return signer;
    }

    if (preferredSigner) {
      throw new Error('Resolved signer does not have MANAGER_ROLE on the Staple verifier');
    }
    throw new Error('Cannot resolve a signer with MANAGER_ROLE for the Staple verifier');
  }

  async function updateStapleTokenPrices(verifierAddr, tokens, pricesHuman18, signerOrAddr) {
    if (!COMMON.isAddress(verifierAddr)) throw new Error('Invalid verifierAddr');
    if (!Array.isArray(tokens) || !Array.isArray(pricesHuman18) || tokens.length !== pricesHuman18.length) {
      throw new Error('tokens/pricesHuman18 length mismatch');
    }

    const signer = await resolveStapleManagerSigner(verifierAddr, signerOrAddr);
    if (!signer) throw new Error('Cannot resolve valid signer');

    const verifier = await getVerifier(verifierAddr, signer);
    const prices = pricesHuman18.map((p) => ethers.utils.parseUnits(String(p), 18));
    const baseTokens = tokens.map(() => ethers.constants.AddressZero);

    const skipPreflight = !!(COMMON.shouldSkipWritePreflight && COMMON.shouldSkipWritePreflight({ requireSigner: true }));

    if (!skipPreflight) {
      try {
        await verifier.callStatic.updatePrices(tokens, baseTokens, prices);
      } catch (error) {
        throw new Error(`Staple price update would revert: ${extractReadableError(error)}`);
      }
    }

    try {
      const tx = await verifier.updatePrices(tokens, baseTokens, prices);
      return tx.wait();
    } catch (error) {
      throw new Error(`Staple price update failed: ${extractReadableError(error)}`);
    }
  }


  // =====================================================
  // Module Exports
  // Expose functions to the global window object for use in other scripts.
  // =====================================================
  
  /**
   * Contract Instance Getters
   */
  window.contracts = {
    // Controller Related
    getController,
    getIncentivesController,
    getUiPoolDataProvider,
    getRouter,
    
    // Pool Related
    getPool,
    
    // Price Provider and Oracle Related
    getPriceProvider,
    getVerifier,
    
    // Token Related
    getTestERC20Factory,
    getErc20,
  };

  /**
   * Data Reading Functions
   */
  window.contractData = {
    // Token Data
    getSupportedTokens,
    getPools,
  };

  /**
   * Transaction Operations
   */
  window.contractActions = {
    // Price Verification
    verifyAll,
    updateStapleTokenPrices,
  };
})();
