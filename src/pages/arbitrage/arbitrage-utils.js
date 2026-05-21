// arbitrage-utils.js

/**
 * Global Utility Object for Arbitrage Page
 * 
 * Provides shared helper functions and state management for:
 * 1. Ethers.js Provider and Signer initialization.
 * 2. Optimized RPC polling management.
 * 3. Common UI helpers (debounce, select population).
 * 4. Token metadata retrieval.
 * 
 * Attached to `window.Utils` for global access across the arbitrage module.
 */
// Dependencies: ethers.js
window.Utils = {
    provider: null, // Singleton Ethers provider instance
    signer: null,   // Singleton Ethers signer instance (if wallet connected)
    userAddr: null, // Current user's wallet address

    /**
     * Initializes the Ethers provider and signer.
     * Sets up an optimized polling strategy to reduce RPC load.
     */
    async initProvider() {
        const rpc = environment.getAllParams().rpc;
        if (rpc) {
            // Use StaticJsonRpcProvider to avoid frequent chainId calls
            // This is more efficient than the standard JsonRpcProvider
            this.provider = new ethers.providers.StaticJsonRpcProvider(rpc);
            
            // Set a very long polling interval (2 minutes) to prevent auto-polling
            this.provider.pollingInterval = 120000; 

            // Override the internal poll method to strictly enforce the interval
            // This prevents the provider from spamming the RPC node
            const originalPoll = this.provider.poll;
            this.provider.poll = async function() {
                const now = Date.now();
                // Only poll if enough time has passed since the last poll
                if (this._lastPoll && (now - this._lastPoll < this.pollingInterval)) {
                    return;
                }
                this._lastPoll = now;
                return originalPoll.call(this);
            };

            // Initialize signer if a user address is configured in the environment
            this.userAddr = environment.getAllParams().user;
            if (this.userAddr) {
                this.signer = this.provider.getSigner(this.userAddr);
            }

            // Override global common provider if it exists to ensure consistency
            if (window.stapleCommon) {
                window.stapleCommon.getRpcProvider = () => this.provider;
            }

            // Monkey-patching removed: environment.js now handles metadata via centralized cache
            // and RpcManager.
        }
    },

    /**
     * Returns the initialized provider instance.
     */
    getProvider() {
        return this.provider;
    },

    /**
     * Returns the initialized signer instance.
     */
    getSigner() {
        return this.signer;
    },

    /**
     * Returns the current user's address.
     */
    getUserAddress() {
        return this.userAddr;
    },

    /**
     * Creates a debounced version of a function.
     * Useful for handling input events (e.g., typing in amount field).
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The delay in milliseconds.
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Populates a HTMLSelectElement with options from a token list.
     * @param {HTMLSelectElement} select - The select element to populate.
     * @param {Array} tokenList - List of token objects {address, symbol}.
     */
    populateSelect(select, tokenList) {
        select.innerHTML = '';
        tokenList.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.address;
            const shortened = COMMON.shortenAddress ? COMMON.shortenAddress(t.address, 4, 4) : `${t.address.slice(0, 6)}...${t.address.slice(-4)}`;
            const sym = t.symbol || shortened;
            opt.textContent = `${sym} (${shortened})`;
            select.appendChild(opt);
        });
    },

    /**
     * Helper to get decimals for a token address from the cached token list.
     * Defaults to 18 if not found.
     * @param {string} tokenAddress - The address to look up.
     * @param {Array} tokens - The list of token objects.
     */
    getTokenDecimals(tokenAddress, tokens) {
        if (!tokenAddress) return 18;
        const t = tokens.find(x => x.address.toLowerCase() === tokenAddress.toLowerCase());
        return t ? t.decimals : 18;
    }
};
