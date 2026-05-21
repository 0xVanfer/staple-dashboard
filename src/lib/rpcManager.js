/**
 * RpcManager handles RPC interactions with rate limiting and Multicall support.
 * It ensures that the application respects the rate limits of public RPC endpoints.
 * This class is a singleton attached to the window object.
 */
// Dependencies: ethers.js
(function () {
    // Prevent multiple initializations
    if (window.RpcManager) return;

    // Multicall3 contract address on most networks (check specific network support if needed)
    const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
    // ABI for the aggregate3 method which allows for failure tolerance
    const MULTICALL3_ABI = [
        'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)'
    ];

    /**
     * Class responsible for managing RPC connections and request queuing.
     */
    class RpcManager {
        constructor() {
            // The ethers.js provider instance
            this.provider = null;
            // Queue for pending RPC requests
            this.queue = [];
            // Flag to indicate if the queue is currently being processed
            this.processing = false;
            // Rate limit in milliseconds between requests (default: 200ms = 5 req/s)
            this.rateLimit = 1000 / 5; 
            // Timestamp of the last executed request
            this.lastRequestTime = 0;
            // Instance of the Multicall3 contract
            this.multicallContract = null;
        }

        /**
         * Initialize the RPC provider with a specific URL and Chain ID.
         * This method must be called before making any requests.
         * 
         * @param {string} rpcUrl - The URL of the RPC endpoint.
         * @param {number} chainId - The Chain ID of the network.
         */
        init(rpcUrl, chainId) {
            if (!rpcUrl) return;
            
            // Ensure ethers.js library is loaded in the global scope
            if (!window.ethers) {
                console.error('Ethers.js is not loaded.');
                return;
            }

            // Do not pin the provider to a static chain id here.
            // Some pages initialize RpcManager before the real network is detected,
            // and passing a temporary / stale chain id causes ethers v5 to throw
            // NETWORK_ERROR: underlying network changed.
            this.provider = new window.ethers.providers.JsonRpcProvider(rpcUrl);
            // Initialize the Multicall3 contract instance
            this.multicallContract = new window.ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, this.provider);
        }

        /**
         * Retrieve the current provider instance.
         * Useful for other parts of the application that need direct access to the provider.
         * 
         * @returns {ethers.providers.JsonRpcProvider} The current provider instance.
         */
        getProvider() {
            return this.provider;
        }

        /**
         * Execute a read-only contract method call.
         * This method wraps the call in the rate-limited queue.
         * 
         * @param {ethers.Contract} contract - The contract instance to call.
         * @param {string} method - The name of the method to call.
         * @param {Array} args - The arguments to pass to the method (default: []).
         * @returns {Promise<any>} - A promise that resolves with the result of the call.
         */
        async call(contract, method, args = []) {
            // Enqueue the call to respect rate limits
            return this.enqueue(async () => {
                return contract[method](...args);
            });
        }

        /**
         * Execute a raw RPC JSON-RPC request.
         * This method wraps the request in the rate-limited queue.
         * 
         * @param {string} method - The RPC method name (e.g., 'eth_blockNumber').
         * @param {Array} params - The parameters for the RPC method (default: []).
         * @returns {Promise<any>} - A promise that resolves with the result of the request.
         */
        async request(method, params = []) {
            // Enqueue the request to respect rate limits
            return this.enqueue(async () => {
                return this.provider.send(method, params);
            });
        }

        /**
         * Execute multiple calls in a single RPC request using the Multicall3 contract.
         * This significantly reduces the number of HTTP requests and improves performance.
         * Supports two formats for the `calls` array:
         * 1. Raw format: Objects with { target, allowFailure, callData }
         * 2. High-level format: Objects with { contract, method, args, allowFailure }
         * 
         * @param {Array} calls - An array of call objects.
         * @returns {Promise<Array>} - A promise that resolves with an array of results.
         *                             If high-level format is used, results are automatically decoded.
         */
        async multicall(calls) {
            // Ensure the multicall contract is initialized
            if (!this.multicallContract) {
                throw new Error('Multicall contract not initialized');
            }
            
            // Return empty array if no calls are provided
            if (calls.length === 0) return [];

            // Detect format
            const isHighLevel = calls[0].contract && calls[0].method;
            const isAbiFormat = calls[0].target && calls[0].abi && calls[0].method;

            let rawCalls;
            if (isHighLevel) {
                // Map high-level calls to raw Multicall3 format
                rawCalls = calls.map(c => ({
                    target: c.contract.address,
                    // Default allowFailure to false if not specified
                    allowFailure: c.allowFailure !== undefined ? c.allowFailure : false,
                    // Encode the function call data using the contract interface
                    callData: c.contract.interface.encodeFunctionData(c.method, c.args || [])
                }));
            } else if (isAbiFormat) {
                // Map ABI format calls to raw Multicall3 format
                rawCalls = calls.map(c => {
                    const iface = new window.ethers.utils.Interface(c.abi);
                    return {
                        target: c.target,
                        allowFailure: c.allowFailure !== undefined ? c.allowFailure : false,
                        callData: iface.encodeFunctionData(c.method, c.params || [])
                    };
                });
            } else {
                // Use raw calls directly
                rawCalls = calls;
            }
            
            // Execute the multicall via the rate-limited queue
            return this.enqueue(async () => {
                // Call the aggregate3 function on the Multicall3 contract
                // Use callStatic to ensure it's treated as a read-only call
                const results = await this.multicallContract.callStatic.aggregate3(rawCalls);
                
                // If high-level format was used, decode the results
                if (isHighLevel) {
                    return results.map((r, i) => {
                        // If the call failed, return null (or handle error as needed)
                        if (!r.success) return null; 
                        try {
                            // Decode the return data using the contract interface
                            const decoded = calls[i].contract.interface.decodeFunctionResult(calls[i].method, r.returnData);
                            // If the result is a single value, return it directly; otherwise return the Result object
                            return decoded.length === 1 ? decoded[0] : decoded;
                        } catch (e) {
                            console.warn('Failed to decode result', e);
                            return null;
                        }
                    });
                }

                // If ABI format was used, decode the results
                if (isAbiFormat) {
                    return results.map((r, i) => {
                        if (!r.success) return null;
                        try {
                            const iface = new window.ethers.utils.Interface(calls[i].abi);
                            const decoded = iface.decodeFunctionResult(calls[i].method, r.returnData);
                            return decoded.length === 1 ? decoded[0] : decoded;
                        } catch (e) {
                            console.warn('Failed to decode result', e);
                            return null;
                        }
                    });
                }
                
                // Return raw results if raw format was used
                return results;
            });
        }

        /**
         * Helper method to encode a function call for manual multicall construction.
         * 
         * @param {ethers.Contract} contract - The contract instance.
         * @param {string} method - The method name.
         * @param {Array} args - The arguments.
         * @returns {string} - The encoded hex string of the call data.
         */
        encodeCall(contract, method, args = []) {
            return contract.interface.encodeFunctionData(method, args);
        }

        /**
         * Helper method to decode a function result from a raw hex string.
         * 
         * @param {ethers.Contract} contract - The contract instance.
         * @param {string} method - The method name.
         * @param {string} data - The returned data (hex string).
         * @returns {any} - The decoded result.
         */
        decodeResult(contract, method, data) {
            return contract.interface.decodeFunctionResult(method, data);
        }

        /**
         * Add a task to the execution queue.
         * This ensures that tasks are executed sequentially and respect the rate limit.
         * 
         * @param {Function} task - The async function to execute.
         * @returns {Promise<any>} - A promise that resolves when the task completes.
         */
        enqueue(task) {
            return new Promise((resolve, reject) => {
                // Push the task and its promise controllers to the queue
                this.queue.push({ task, resolve, reject });
                // Trigger queue processing
                this.processQueue();
            });
        }

        /**
         * Process the queue of pending tasks.
         * This method runs a loop that executes tasks one by one, waiting for the rate limit interval.
         */
        async processQueue() {
            // If already processing, do nothing (the loop is already running)
            if (this.processing) return;
            this.processing = true;

            // Loop until the queue is empty
            while (this.queue.length > 0) {
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                
                // If the time since the last request is less than the rate limit, wait
                if (timeSinceLastRequest < this.rateLimit) {
                    await new Promise(r => setTimeout(r, this.rateLimit - timeSinceLastRequest));
                }

                // Dequeue the next task
                const { task, resolve, reject } = this.queue.shift();
                this.lastRequestTime = Date.now();

                try {
                    // Execute the task
                    const result = await task();
                    // Resolve the promise with the result
                    resolve(result);
                } catch (error) {
                    // Reject the promise if the task fails
                    reject(error);
                }
            }

            // Mark processing as finished
            this.processing = false;
        }
    }

    // Expose the RpcManager instance globally
    window.RpcManager = new RpcManager();
})();
