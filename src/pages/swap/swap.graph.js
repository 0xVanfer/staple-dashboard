/**
 * @file swap.graph.js
 * @description This module provides graph data structures and algorithms for the Swap feature.
 * It is responsible for:
 * - Building a graph representation of the liquidity pools and tokens.
 * - Normalizing data identifiers (e.g., VTP IDs).
 * - Enumerating all possible swap paths between two assets using Depth-First Search (DFS).
 * - Providing utility functions to access VTP (Virtual Trading Pair) data.
 *
 * This module is a core dependency for `swap.main.js` to calculate optimal swap routes.
 */
// Dependencies: None
(function () {
  // Prevent re-initialization if the module is already loaded
  if (window.swapGraph) return;

  /**
   * @function normalizeId
   * @description Normalizes a VTP ID or Pool ID into a standard JavaScript number.
   * It handles various input types such as strings, numbers, BigNumbers, and hex strings.
   *
   * @param {string|number|Object} raw - The raw ID value to normalize.
   * @returns {number|null} The normalized ID as a number, or null if invalid.
   */
  function normalizeId(raw) {
    if (raw == null) return null;
    try {
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') return Number(raw);
      // Handle Ethers.js BigNumber or similar objects
      if (raw._isBigNumber || (raw.hex && raw.toHexString)) return Number(raw.toString());
      if (typeof raw.toString === 'function') return Number(raw.toString());
    } catch (e) {
      // Ignore conversion errors and return null
    }
    return null;
  }

  /**
   * @async
   * @function buildData
   * @description Builds the graph data structures from the raw pool data.
   * It processes the pools to extract VTPs (Virtual Trading Pairs) and builds an adjacency list
   * mapping assets to their connected VTPs. It reads token symbols from the environment cache only
   * (no contract calls) and falls back to truncated addresses when missing.
   *
   * @param {Array} pools - The list of pool objects fetched from the contract.
   * @param {Object} env - The environment configuration object (used for symbol cache reads).
   * @returns {Promise<Object>} An object containing:
   * - `allVtps`: A Map of VTP ID -> VTP object.
   * - `assetAdj`: A Map of Asset Address (lowercase) -> Array of connected VTPs.
   * - `tokenSymbols`: A Map of Asset Address (lowercase) -> { address, symbol }.
   */
  async function buildData(pools, env) {
    const allVtps = new Map();           // Map<number, Object> - Stores all VTPs by ID
    const assetAdj = new Map();          // Map<string, Array<Object>> - Adjacency list for graph traversal
    const tokenAddrSet = new Set();      // Set<string> - To collect unique token addresses for metadata fetching

    try {
      // Iterate through all pools to extract VTPs
      (pools || []).forEach(pool => {
        const vtps = Array.isArray(pool?.relatedVtps) ? pool.relatedVtps : [];
        vtps.forEach(v => {
          const rawId = v?.params?.id;
          const id = normalizeId(rawId);
          
          // Skip invalid VTPs
          if (id == null) return;
          
          // Store unique VTPs
          if (!allVtps.has(id)) allVtps.set(id, v);

          // Extract token addresses from the VTP
          const a0 = v?.token0?.params?.asset;
          const a1 = v?.token1?.params?.asset;
          
          // Update adjacency list and token set
          if (_isAddr(a0)) {
            tokenAddrSet.add(a0);
            _pushAdj(assetAdj, a0.toLowerCase(), v);
          }
          if (_isAddr(a1)) {
            tokenAddrSet.add(a1);
            _pushAdj(assetAdj, a1.toLowerCase(), v);
          }
        });
      });

      const tokenSymbols = {};
      const addrs = Array.from(tokenAddrSet);

      // Read symbols from environment cache only (no contract calls)
      const symbolCache = (() => {
        try {
          if (env && typeof env.getSymbols === 'function') return env.getSymbols();
          if (window.environment && typeof window.environment.getSymbols === 'function') return window.environment.getSymbols();
        } catch (e) {
          console.warn('[swap.graph] getSymbols failed', e);
        }
        return {};
      })();

      addrs.forEach(addr => {
        const lower = addr.toLowerCase();
        const cached = symbolCache[lower] || symbolCache[addr] || '';
        const sym = cached || _truncateAddr(addr);
        tokenSymbols[lower] = { address: addr, symbol: sym };
      });


      return { allVtps, assetAdj, tokenSymbols };
    } catch (e) {
      console.warn('[swap.graph] buildData failed', e);
      return null;
    }
  }

  function _truncateAddr(addr) {
    if (typeof addr !== 'string') return '';
    return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
  }

  /**
   * @function _pushAdj
   * @private
   * @description Helper function to add a VTP to the adjacency list for a given asset.
   * It ensures that the VTP is not added twice for the same asset.
   *
   * @param {Map} map - The adjacency map.
   * @param {string} assetLower - The lowercase address of the asset.
   * @param {Object} vtp - The VTP object to add.
   */
  function _pushAdj(map, assetLower, vtp) {
    if (!map.has(assetLower)) map.set(assetLower, []);
    const arr = map.get(assetLower);
    // Avoid duplicate references in the adjacency list
    if (!arr.includes(vtp)) arr.push(vtp);
  }

  /**
   * @function _isAddr
   * @private
   * @description Helper function to validate if a string is a valid Ethereum address.
   *
   * @param {string} a - The string to check.
   * @returns {boolean} True if it is a valid address, false otherwise.
   */
  function _isAddr(a) {
    return typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
  }

  /**
   * @function enumeratePaths
   * @description Enumerates all valid swap paths from a source asset to a destination asset.
   * It uses a Depth-First Search (DFS) algorithm with a maximum depth limit.
   *
   * @param {string} fromAsset - The address of the source asset.
   * @param {string} toAsset - The address of the destination asset.
   * @param {Map} assetAdj - The adjacency map built by `buildData`.
   * @param {number} [maxDepth=3] - The maximum number of hops (VTPs) allowed in a path.
   * @param {boolean} [allowLoop=false] - Whether to allow paths where start and end assets are the same (usually false for swaps).
   * @returns {Array<Array<Object>>} An array of paths, where each path is an array of VTP objects.
   */
  function enumeratePaths(fromAsset, toAsset, assetAdj, maxDepth = 3, allowLoop = false) {
    if (!_isAddr(fromAsset) || !_isAddr(toAsset)) return [];
    const fromL = fromAsset.toLowerCase();
    const toL = toAsset.toLowerCase();
    
    // Unless explicitly allowed, source and destination should not be the same
    if (!allowLoop && fromL === toL) return [];

    const results = [];
    const visitedVtpId = new Set(); // Track visited VTPs in the current path to prevent cycles

    /**
     * @function pickOtherAsset
     * @private
     * @description Given a VTP and one of its assets, returns the other asset.
     */
    function pickOtherAsset(vtp, currentAsset) {
      const a0 = vtp?.token0?.params?.asset;
      const a1 = vtp?.token1?.params?.asset;
      if (!a0 || !a1) return null;
      const c = currentAsset.toLowerCase();
      if (a0.toLowerCase() === c) return a1;
      if (a1.toLowerCase() === c) return a0;
      return null;
    }

    /**
     * @function dfs
     * @private
     * @description Recursive Depth-First Search function.
     *
     * @param {string} currAsset - The current asset being visited.
     * @param {Array} pathVtps - The current path of VTPs accumulated so far.
     * @param {number} depth - The current depth of the search.
     */
    function dfs(currAsset, pathVtps, depth) {
      // Stop if max depth is exceeded
      if (depth > maxDepth) return;
      
      // If we reached the target asset and have at least one hop, record the path
      if (currAsset.toLowerCase() === toL && pathVtps.length > 0) {
        results.push(pathVtps.slice());
        return;
      }
      
      // Get all VTPs connected to the current asset
      const list = assetAdj.get(currAsset.toLowerCase()) || [];
      
      for (const v of list) {
        const id = normalizeId(v?.params?.id);
        if (id == null) continue;
        
        // Prevent using the same VTP twice in a single path (no loops within path)
        if (visitedVtpId.has(id)) continue; 
        
        const nextAsset = pickOtherAsset(v, currAsset);
        if (!_isAddr(nextAsset)) continue;
        
        // Mark VTP as visited for this branch
        visitedVtpId.add(id);
        pathVtps.push(v);
        
        // Recurse
        dfs(nextAsset, pathVtps, depth + 1);
        
        // Backtrack: unmark VTP and remove from path
        pathVtps.pop();
        visitedVtpId.delete(id);
      }
    }

    // Start DFS from the source asset
    dfs(fromAsset, [], 0);
    
    // Deduplicate paths based on the sequence of VTP IDs
    // This handles cases where multiple graph traversals might yield the same logical path
    const uniq = [];
    const seen = new Set();
    for (const p of results) {
      const key = p.map(v => normalizeId(v?.params?.id)).join('-');
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(p);
      }
    }
    
    return uniq;
  }

  /**
   * @function getVtpById
   * @description Retrieves a VTP object by its ID from the built data structure.
   *
   * @param {Object} data - The data object returned by `buildData`.
   * @param {number|string} idRaw - The VTP ID.
   * @returns {Object|null} The VTP object, or null if not found.
   */
  function getVtpById(data, idRaw) {
    const id = normalizeId(idRaw);
    if (id == null) return null;
    return data?.allVtps?.get(id) || null;
  }

  // Expose the module API globally
  window.swapGraph = {
    buildData,
    enumeratePaths,
    getVtpById,
    normalizeId,
  };
})();

