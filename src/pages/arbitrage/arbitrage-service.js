
// arbitrage-service.js

function getEnvSymbols() {
    try {
        if (window.environment && typeof window.environment.getSymbols === 'function') {
            return window.environment.getSymbols();
        }
    } catch (e) {
        console.warn('[arbitrage] getSymbols failed', e);
    }
    return {};
}

function truncateAddr(addr) {
    return COMMON.shortenAddress ? COMMON.shortenAddress(addr, 4, 4) : (typeof addr === 'string' ? addr : '');
}

function pickSymbol(addr) {
    if (!addr) return '';
    const cache = getEnvSymbols();
    const lower = addr.toLowerCase();
    return cache[lower] || cache[addr] || truncateAddr(addr);
}

/**
 * ArbitrageService Class
 * 
 * This class encapsulates the core business logic for the Arbitrage page.
 * It handles:
 * 1. Data fetching (tokens, pools, external DEX states).
 * 2. Arbitrage calculations (both internal cyclic and external cross-DEX).
 * 3. Interaction with smart contracts (Staple Router, Mock DEXs).
 * 4. State management for the arbitrage process.
 * 
 * It communicates with the UI through the `ui` instance passed in the constructor.
 */
// Dependencies: src/pages/arbitrage/arbitrage-utils.js, ethers.js
class ArbitrageService {
    /**
     * Constructor
     * @param {ArbitrageUI} ui - The UI instance to handle DOM updates.
     */
    constructor(ui) {
        this.ui = ui; // Reference to the UI handler
        this.tokens = []; // List of available tokens in the system
        this.tokenA = null; // Address of the input token (Token A)
        this.tokenB = null; // Address of the output token (Token B)
        this.currentTab = 'mock-curve'; // Currently selected external DEX tab
        this.swapGraphData = null; // Graph data structure for pathfinding
        this.isCalculating = false; // Flag to prevent concurrent calculations
        this.lastCalcParams = null; // Cache to avoid re-calculating with same params
    }

    /**
     * Initializes the service.
     * 1. Sets up the provider.
     * 2. Loads available tokens.
     * 3. Sets initial token selections.
     * 4. Triggers initial UI updates and calculation.
     */
    async init() {
        // Initialize the ethers provider and signer
        await Utils.initProvider();
        
        // Load tokens from the Staple protocol
        await this.loadTokens();
        
        // If we have at least 2 tokens, set up the default selection
        if (this.tokens.length >= 2) {
            this.tokenA = this.tokens[0].address;
            this.tokenB = this.tokens[1].address;
            
            // Populate dropdowns in the UI
            Utils.populateSelect(this.ui.els.tokenASelect, this.tokens);
            Utils.populateSelect(this.ui.els.tokenBSelect, this.tokens);
            Utils.populateSelect(this.ui.els.internalTokenSelect, this.tokens);
            
            // Set initial values for dropdowns
            this.ui.els.tokenASelect.value = this.tokenA;
            this.ui.els.tokenBSelect.value = this.tokenB;
            
            // Set default amount if empty to ensure initial calculation works
            if (!this.ui.els.amountIn.value) {
                this.ui.els.amountIn.value = "1";
            }

            // Update UI labels based on selected tokens
            this.updateLabels();
            
            // Fetch and display the current state of the selected external DEX
            await this.updateConfigPanel();
            
            // Force calculation on init to show immediate results
            await this.calculateExternalArbitrage(true);
        }
    }

    /**
     * Loads tokens from the Staple UI Pool Data Provider.
     * Also builds the swap graph data needed for pathfinding.
     * Note: strictly relies on pooled metadata/cache; no direct symbol()/decimals() calls.
     */
    async loadTokens() {
        // Ensure we have a provider
        if (!Utils.getProvider()) return;

        try {
            // Fetch all pools using the centralized data manager (handles caching and metadata)
            const pools = await window.contractData.getPools();
            
            // If the swap graph utility is available, build the graph data
            if (window.swapGraph) {
                this.swapGraphData = await window.swapGraph.buildData(pools, environment);

                // Build decimals map strictly from pool info
                const decimalsMap = new Map();
                for (const pool of pools) {
                    const vtps = Array.isArray(pool?.relatedVtps) ? pool.relatedVtps : [];
                    vtps.forEach(v => {
                        const a0 = v?.token0?.params?.asset;
                        const d0 = v?.token0?.params?.decimals;
                        if (a0) decimalsMap.set(a0.toLowerCase(), Number(d0 ?? 18));
                        const a1 = v?.token1?.params?.asset;
                        const d1 = v?.token1?.params?.decimals;
                        if (a1) decimalsMap.set(a1.toLowerCase(), Number(d1 ?? 18));
                    });
                }

                // Extract token symbols and addresses with safe fallbacks
                const symbolCache = (() => {
                    try { return window.environment?.getSymbols() || {}; } catch { return {}; }
                })();

                this.tokens = Object.values(this.swapGraphData.tokenSymbols || {}).map(t => {
                    const lower = t.address?.toLowerCase?.() || '';
                    const decimals = decimalsMap.has(lower) ? Number(decimalsMap.get(lower)) : 18;
                    const symbol = t.symbol || symbolCache[lower] || (t.address ? truncateAddr(t.address) : 'TOKEN');
                    return { ...t, symbol, decimals };
                });
            }
        } catch (e) {
            console.error("Failed to load tokens:", e);
        }
    }

    /**
     * Updates the labels in the UI to reflect the selected tokens.
     * This includes balance labels, reserve labels, and table headers.
     */
    updateLabels() {
        const symA = this.getTokenSymbol(this.tokenA);
        const symB = this.getTokenSymbol(this.tokenB);
        
        // Update Curve balance labels
        const curveBalALabel = document.getElementById('curve-bal-a-label');
        if (curveBalALabel) curveBalALabel.textContent = `Balance ${symA}`;
        const curveBalBLabel = document.getElementById('curve-bal-b-label');
        if (curveBalBLabel) curveBalBLabel.textContent = `Balance ${symB}`;
        
        // Update Uniswap V2 reserve labels
        const univ2ResALabel = document.getElementById('univ2-res-a-label');
        if (univ2ResALabel) univ2ResALabel.textContent = `Reserve ${symA}`;
        const univ2ResBLabel = document.getElementById('univ2-res-b-label');
        if (univ2ResBLabel) univ2ResBLabel.textContent = `Reserve ${symB}`;
        
        // Update Uniswap V3 column headers
        const univ3HeaderAmt0 = document.getElementById('univ3-header-amt0');
        if (univ3HeaderAmt0) univ3HeaderAmt0.textContent = `Amt ${symA}`;
        const univ3HeaderAmt1 = document.getElementById('univ3-header-amt1');
        if (univ3HeaderAmt1) univ3HeaderAmt1.textContent = `Amt ${symB}`;
    }

    /**
     * Helper to get the symbol of a token by its address.
     * @param {string} addr - Token address
     * @returns {string} Token symbol or '???'
     */
    getTokenSymbol(addr) {
        const t = this.tokens.find(x => x.address.toLowerCase() === addr.toLowerCase());
        if (t) return t.symbol || truncateAddr(t.address);
        return addr ? truncateAddr(addr) : '???';
    }

    /**
     * Updates the configuration panel based on the currently selected tab (DEX).
     * Fetches the current state (reserves, liquidity, etc.) from the mock DEX contract.
     */
    async updateConfigPanel() {
        if (!this.tokenA || !this.tokenB || !Utils.getProvider()) return;
        
        const decimalsA = Utils.getTokenDecimals(this.tokenA, this.tokens);
        const decimalsB = Utils.getTokenDecimals(this.tokenB, this.tokens);

        try {
            // --- Mock Curve Logic ---
            if (this.currentTab === 'mock-curve') {
                const addr = environment.getAllParams().mockCurve;
                if (!addr) return;
                const contract = new ethers.Contract(addr, mockExternalDexExtentionsAbi, Utils.getProvider());
                
                // Fetch Curve pool state
                const pool = await contract.getCurvePool(this.tokenA, this.tokenB);
                
                const t0 = pool.token0 || pool[0];
                if (t0 && t0 !== ethers.constants.AddressZero) {
                    // Determine order of tokens to display correctly
                    const isOrder = t0.toLowerCase() === this.tokenA.toLowerCase();
                    const balA = isOrder ? (pool.balance0 || pool[2]) : (pool.balance1 || pool[3]);
                    const balB = isOrder ? (pool.balance1 || pool[3]) : (pool.balance0 || pool[2]);
                    const A = pool.A || pool[4];
                    const fee = pool.fee || pool[6];
                    
                    // Update UI with fetched values
                    this.ui.updateCurveState(
                        ethers.utils.formatUnits(balA, decimalsA),
                        ethers.utils.formatUnits(balB, decimalsB),
                        A.toString(),
                        (fee / 10000).toString() + '%'
                    );
                } else {
                    this.ui.updateCurveState("Not Initialized", "Not Initialized", "--", "--");
                }
            
            // --- Mock Uniswap V2 Logic ---
            } else if (this.currentTab === 'mock-univ2') {
                const addr = environment.getAllParams().mockUniswapV2;
                if (!addr) return;
                const contract = new ethers.Contract(addr, mockExternalDexExtentionsAbi, Utils.getProvider());
                
                // Fetch Uniswap V2 pair state
                const pair = await contract.getUniswapV2Pair(this.tokenA, this.tokenB);
                
                const pToken0Struct = pair.token0 || pair[0];
                const pFee = pair.feeRate || pair[2];
                const t0Addr = pToken0Struct ? (pToken0Struct.token || pToken0Struct[0]) : ethers.constants.AddressZero;
                const t0Liq = pToken0Struct ? (pToken0Struct.liquidity || pToken0Struct[1]) : ethers.constants.Zero;
                
                const pToken1Struct = pair.token1 || pair[1];
                const t1Liq = pToken1Struct ? (pToken1Struct.liquidity || pToken1Struct[1]) : ethers.constants.Zero;

                if (t0Addr && t0Addr !== ethers.constants.AddressZero) {
                    // Determine order of tokens
                    const isOrder = t0Addr.toLowerCase() === this.tokenA.toLowerCase();
                    const resA = isOrder ? t0Liq : t1Liq;
                    const resB = isOrder ? t1Liq : t0Liq;
                    
                    // Update UI
                    this.ui.updateUniV2State(
                        ethers.utils.formatUnits(resA, decimalsA),
                        ethers.utils.formatUnits(resB, decimalsB),
                        (pFee / 10000).toString() + '%'
                    );
                } else {
                    this.ui.updateUniV2State("Not Initialized", "Not Initialized", "--");
                }

            // --- Mock Uniswap V3 Logic ---
            } else if (this.currentTab === 'mock-univ3') {
                const addr = environment.getAllParams().mockUniswapV3;
                if (!addr) return;
                const contract = new ethers.Contract(addr, mockExternalDexExtentionsAbi, Utils.getProvider());
                
                // Fetch Uniswap V3 pool state
                const pool = await contract.getUniswapV3Pool(this.tokenA, this.tokenB);
                
                const t0 = pool.token0 || pool[0];
                const fee = pool.fee || pool[2];
                
                if (t0 && t0 !== ethers.constants.AddressZero) {
                    const feeStr = (fee / 10000).toString();
                    this.ui.updateUniV3State(feeStr + '%', ''); // Chart handled below
                    
                    const isToken0 = t0.toLowerCase() === this.tokenA.toLowerCase();
                    const t0Symbol = isToken0 ? this.getTokenSymbol(this.tokenA) : this.getTokenSymbol(this.tokenB);
                    const t1Symbol = isToken0 ? this.getTokenSymbol(this.tokenB) : this.getTokenSymbol(this.tokenA);
                    
                    const pPillars = pool.pillars || pool[3];
                    if (pPillars && pPillars.length > 0) {
                        const prices = [];
                        const amount0s = [];
                        const amount1s = [];

                        // Process pillars for chart and form
                        pPillars.forEach(p => {
                            const priceE18 = p.priceE18 || p[0];
                            const amt0 = p.amount0 || p[1];
                            const amt1 = p.amount1 || p[2];
                            
                            prices.push(ethers.utils.formatUnits(priceE18, 18));
                            amount0s.push(ethers.utils.formatUnits(amt0, isToken0 ? decimalsA : decimalsB));
                            amount1s.push(ethers.utils.formatUnits(amt1, isToken0 ? decimalsB : decimalsA));
                        });

                        // Render the liquidity chart
                        this.ui.renderUniV3Chart(amount0s, amount1s, prices, this.ui.els.univ3State.chartContainer, t0Symbol, t1Symbol);

                        // Pre-fill the configuration form with existing pillars
                        this.ui.els.univ3Form.pillarsContainer.innerHTML = '';
                        prices.forEach((price, i) => {
                            let amtA, amtB;
                            if (isToken0) {
                                amtA = amount0s[i];
                                amtB = amount1s[i];
                            } else {
                                amtA = amount1s[i];
                                amtB = amount0s[i];
                            }
                            this.ui.addUniV3PillarRow(price, amtA, amtB);
                        });
                    } else {
                        // No pillars found, clear chart and add empty row
                        this.ui.renderUniV3Chart([], [], [], this.ui.els.univ3State.chartContainer, t0Symbol, t1Symbol);
                        this.ui.els.univ3Form.pillarsContainer.innerHTML = '';
                        this.ui.addUniV3PillarRow();
                    }
                } else {
                    // Pool not initialized
                    this.ui.updateUniV3State("--", "");
                    this.ui.els.univ3Form.pillarsContainer.innerHTML = '';
                    this.ui.addUniV3PillarRow();
                }
            }
        } catch (e) {
            console.error("Error updating config panel:", e);
        }
    }

    /**
     * Calculates internal arbitrage (cyclic path) for a single token.
     * Finds a path Token -> ... -> Token that results in profit.
     */
    async calculateInternalArbitrage() {
        const token = this.ui.els.internalTokenSelect.value;
        const amountVal = this.ui.els.internalAmountIn.value;
        
        // Validation
        if (!token || !amountVal || parseFloat(amountVal) <= 0) {
            alert("Please select a token and enter a valid amount.");
            return;
        }

        // Reset UI state
        this.ui.updateInternalResults({ found: false });
        this.ui.els.internalResults.style.display = 'block';
        this.ui.els.internalBestPath.textContent = "Searching...";
        this.ui.updateInternalPathDetails("Calculating paths...");

        try {
            const decimals = Utils.getTokenDecimals(token, this.tokens);
            const amountInWei = ethers.utils.parseUnits(amountVal, decimals);
            
            // Enumerate cyclic paths (Token -> ... -> Token)
            // Note: allowLoop = true is passed to enable cyclic path finding
            const cycles = window.swapGraph.enumeratePaths(token, token, this.swapGraphData.assetAdj, 3, true);
            
            if (cycles.length === 0) {
                this.ui.updateInternalResults({ found: false });
                this.ui.updateInternalPathDetails("No cyclic paths found in the graph.");
                return;
            }

            // Calculate the best path using the UI Pool Data Provider
            const uiPoolDataProviderAddr = environment.getAllParams().uiPoolDataProvider;
            const uiContract = new ethers.Contract(uiPoolDataProviderAddr, stapleUIPoolDataProviderAbi, Utils.getProvider());
            
            const formattedPaths = cycles.map(path => path.map(vtp => vtp.params.id));

            // Call smart contract to simulate execution
            const res = await uiContract.calcBetterPath(token, amountInWei, formattedPaths, 0);
            
            const amountOutWei = res.userReceive;
            const profitWei = amountOutWei.sub(amountInWei);
            const amountOut = ethers.utils.formatUnits(amountOutWei, decimals);
            const profit = ethers.utils.formatUnits(profitWei, decimals);
            
            // Format and display the best path
            let pathStr = "";
            let pathSymbols = [];
            if (res.assets && res.assets.length > 0) {
                pathSymbols = res.assets.map(a => pickSymbol(a));
                pathStr = pathSymbols.join(" -> ");
            }

            // Use the best path returned by the contract
            const bestPathVtpIds = res.bestPath ? res.bestPath.map(id => Number(id)) : [];
            
            // Reconstruct VTP objects for the UI
            const bestPathVtps = [];
            if (this.swapGraphData && this.swapGraphData.allVtps) {
                for (const id of bestPathVtpIds) {
                    const vtp = this.swapGraphData.allVtps.get(id);
                    if (vtp) bestPathVtps.push(vtp);
                }
            }

            this.lastInternalArbResult = {
                tokenIn: token,
                amountIn: amountInWei,
                path: bestPathVtpIds, // uint32[]
                amountOutMin: amountInWei, // For arb, we want at least our input back + profit. Let's set min to input.
                pathSymbols: pathSymbols
            };

            // Update UI with results
            this.ui.updateInternalResults({
                found: true,
                path: pathSymbols.map(s => ({ symbol: s })),
                amountOut: amountOut,
                profit: profit
            });

            // Generate Detailed Path Output using data from calcBetterPath
            // This avoids making multiple calls to the Controller and uses the data returned by the UI Helper
            const processes = [];
            let currentAmount = amountInWei;
            
            // res.amountsOut and res.fees are arrays corresponding to each hop
            if (res.amountsOut && res.fees) {
                for (let i = 0; i < res.amountsOut.length; i++) {
                    processes.push({
                        amountIn: currentAmount,
                        realOut: res.amountsOut[i],
                        feeIn: ethers.constants.Zero, // calcBetterPath aggregates fees or returns them in a specific way, we map to feeOut for display
                        feeOut: res.fees[i],
                        error: null
                    });
                    currentAmount = res.amountsOut[i];
                }
            }
            
            // Pass detailed data to UI
            this.ui.updateInternalPathDetails(null, {
                vtps: bestPathVtps,
                processes: processes,
                tokenSymbols: this.tokens, // Pass tokens list for symbol lookup
                startAsset: token
            });

        } catch (e) {
            console.error("Internal arb error:", e);
            this.ui.updateInternalResults({ found: false });
            this.ui.els.internalBestPath.textContent = "Error: " + e.message;
            this.ui.updateInternalPathDetails("Error during calculation:\n" + e.message);
        }
    }

    /**
     * Executes the calculated internal arbitrage transaction.
     */
    async executeInternalArbitrage() {
        if (!this.lastInternalArbResult) {
            alert("Please calculate arbitrage first.");
            return;
        }

        const { tokenIn, amountIn, path, amountOutMin, pathSymbols } = this.lastInternalArbResult;
        
        const userAddr = Utils.getUserAddress();
        const signer = await window.stapleCommon.resolveSigner(userAddr);
        if (!signer) {
            alert(await window.stapleCommon.describeMissingSigner(userAddr, { subject: 'User' }));
            return;
        }

        const btn = this.ui.els.internalExecuteBtn;
        const originalText = btn ? btn.textContent : 'Execute';
        
        try {
            // Disable button and show pending state
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Executing...';
            }
            this.ui.updateInternalPathDetails("Preparing execution...\nChecking allowance...");
            
            const routerAddr = environment.getAllParams().router;
            if (!routerAddr) throw new Error("Router address not configured");

            const router = new ethers.Contract(routerAddr, stapleRouterAbi, signer);

            // Determine spender (LP address)
            let spender = routerAddr; // Default to router if LP not found
            
            if (this.swapGraphData && this.swapGraphData.allVtps && path.length > 0) {
                 const firstVtpId = path[0];
                 const firstVtp = this.swapGraphData.allVtps.get(Number(firstVtpId));
                 
                 if (firstVtp) {
                     if (firstVtp.token0?.params?.asset?.toLowerCase() === tokenIn.toLowerCase()) {
                         spender = firstVtp.token0.params.lpAddr;
                     } else if (firstVtp.token1?.params?.asset?.toLowerCase() === tokenIn.toLowerCase()) {
                         spender = firstVtp.token1.params.lpAddr;
                     }
                 }
            }

            // Approve token if needed
            const tokenContract = new ethers.Contract(tokenIn, erc20MetadataAbi, signer);
            const userAddr = await signer.getAddress();
            const allowance = await tokenContract.allowance(userAddr, spender);
            
            if (allowance.lt(amountIn)) {
                if (btn) btn.textContent = 'Approving...';
                this.ui.updateInternalPathDetails("Approving token...");
                const txApprove = await tokenContract.approve(spender, ethers.constants.MaxUint256);
                await txApprove.wait();
                if (btn) btn.textContent = 'Swapping...';
                this.ui.updateInternalPathDetails("Token approved. Sending swap transaction...");
            } else {
                if (btn) btn.textContent = 'Swapping...';
                this.ui.updateInternalPathDetails("Allowance sufficient. Sending swap transaction...");
            }

            // Construct SwapInput
            const swapInput = {
                deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                receiver: userAddr,
                tokenIn: tokenIn,
                tokenOut: tokenIn, // Cyclic: out is same as in
                path: path, // uint32[]
                amountIn: amountIn,
                amountOutMin: amountOutMin // Minimum acceptable output (break-even)
            };

            // Construct verifyData
            let verifyData = "0x";
            try {
                const tokenSet = new Set([tokenIn]);
                if (this.swapGraphData && this.swapGraphData.allVtps) {
                    path.forEach(id => {
                        const v = this.swapGraphData.allVtps.get(Number(id));
                        if (v?.token0?.params?.asset) tokenSet.add(v.token0.params.asset);
                        if (v?.token1?.params?.asset) tokenSet.add(v.token1.params.asset);
                    });
                }
                
                if (window.buildPriceProviderVerificationPayload) {
                     const result = await window.buildPriceProviderVerificationPayload(Array.from(tokenSet));
                     if (result && typeof result === 'object' && result.encoded) {
                         verifyData = result.encoded;
                     } else if (typeof result === 'string') {
                         verifyData = result;
                     }
                }
            } catch (e) {
                console.warn("Failed to build verifyData for internal arb", e);
            }

            // Execute swap
            // swap(SwapInput input, bytes verifyData)
            const tx = await router.swap(swapInput, verifyData); 
            
            if (btn) btn.textContent = 'Confirming...';
            this.ui.updateInternalPathDetails(`Transaction sent: ${tx.hash}\nWaiting for confirmation...`);
            
            const receipt = await tx.wait();
            
            this.ui.updateInternalPathDetails(`Transaction confirmed!\nBlock: ${receipt.blockNumber}\nGas Used: ${receipt.gasUsed.toString()}\n\nArbitrage executed successfully!`);
            
            // Refresh balances or re-calculate
            await this.calculateInternalArbitrage();

        } catch (e) {
            console.error("Execution error:", e);
            this.ui.updateInternalPathDetails("Execution failed:\n" + e.message);
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }

    /**
     * Updates the Mock Curve Pool configuration on-chain.
     * Requires a connected wallet with signer.
     */
    async updateCurvePool() {
        const userAddr = Utils.getUserAddress();
        const signer = await window.stapleCommon.resolveSigner(userAddr);
        if (!signer) { alert(await window.stapleCommon.describeMissingSigner(userAddr, { subject: 'User' })); return; }
        const addr = environment.getAllParams().mockCurve;
        if (!addr) { alert("Mock Curve address not set"); return; }
        
        const btn = this.ui.els.curveForm.btn;
        const originalText = btn ? btn.textContent : '';
        
        try {
            // Disable button and show pending state
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Updating...';
            }
            
            const decimalsA = Utils.getTokenDecimals(this.tokenA, this.tokens);
            const decimalsB = Utils.getTokenDecimals(this.tokenB, this.tokens);

            const contract = new ethers.Contract(addr, mockExternalDexExtentionsAbi, signer);
            
            // Parse inputs
            const balA = ethers.utils.parseUnits(this.ui.els.curveForm.balA.value, decimalsA);
            const balB = ethers.utils.parseUnits(this.ui.els.curveForm.balB.value, decimalsB);
            const A = ethers.BigNumber.from(this.ui.els.curveForm.A.value);
            const fee = ethers.BigNumber.from(Math.floor(parseFloat(this.ui.els.curveForm.fee.value) * 10000));
            
            // Send transaction
            if (btn) btn.textContent = 'Sending Tx...';
            const tx = await contract.setCurvePool(this.tokenA, this.tokenB, balA, balB, A, fee);
            if (btn) btn.textContent = 'Confirming...';
            await tx.wait();
            
            alert("Curve Pool Updated!");
            await this.updateConfigPanel();
            this.calculateExternalArbitrage(true); // Recalculate after update
        } catch (e) {
            console.error("Curve Update Error:", e);
            alert("Update failed: " + (e.reason || e.message));
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }

    /**
     * Updates the Mock Uniswap V2 Pair configuration on-chain.
     */
    async updateUniV2Pair() {
        const userAddr = Utils.getUserAddress();
        const signer = await window.stapleCommon.resolveSigner(userAddr);
        if (!signer) { alert(await window.stapleCommon.describeMissingSigner(userAddr, { subject: 'User' })); return; }
        const addr = environment.getAllParams().mockUniswapV2;
        if (!addr) { alert("Mock UniV2 address not set"); return; }

        const btn = this.ui.els.univ2Form.btn;
        const originalText = btn ? btn.textContent : '';
        
        try {
            // Disable button and show pending state
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Updating...';
            }
            
            const decimalsA = Utils.getTokenDecimals(this.tokenA, this.tokens);
            const decimalsB = Utils.getTokenDecimals(this.tokenB, this.tokens);

            const contract = new ethers.Contract(addr, mockExternalDexExtentionsAbi, signer);
            
            // Parse inputs
            const resA = ethers.utils.parseUnits(this.ui.els.univ2Form.resA.value, decimalsA);
            const resB = ethers.utils.parseUnits(this.ui.els.univ2Form.resB.value, decimalsB);
            const fee = ethers.BigNumber.from(Math.floor(parseFloat(this.ui.els.univ2Form.fee.value) * 10000));
            
            // Send transaction
            if (btn) btn.textContent = 'Sending Tx...';
            const tx = await contract.setUniswapV2Pair(this.tokenA, this.tokenB, resA, resB, fee);
            if (btn) btn.textContent = 'Confirming...';
            await tx.wait();
            
            alert("UniV2 Pair Updated!");
            await this.updateConfigPanel();
            this.calculateExternalArbitrage(true);
        } catch (e) {
            console.error("UniV2 Update Error:", e);
            alert("Update failed: " + (e.reason || e.message));
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }

    /**
     * Updates the Mock Uniswap V3 Pool configuration on-chain.
     * Handles complex pillar data structure.
     */
    async updateUniV3Pool() {
        const userAddr = Utils.getUserAddress();
        const signer = await window.stapleCommon.resolveSigner(userAddr);
        if (!signer) { alert(await window.stapleCommon.describeMissingSigner(userAddr, { subject: 'User' })); return; }
        const addr = environment.getAllParams().mockUniswapV3;
        if (!addr) { alert("Mock UniV3 address not set"); return; }

        const btn = this.ui.els.univ3Form.btn;
        const originalText = btn ? btn.textContent : '';
        
        try {
            // Disable button and show pending state
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Updating...';
            }
            
            const decimalsA = Utils.getTokenDecimals(this.tokenA, this.tokens);
            const decimalsB = Utils.getTokenDecimals(this.tokenB, this.tokens);

            const contract = new ethers.Contract(addr, mockExternalDexExtentionsAbi, signer);
            const fee = ethers.BigNumber.from(Math.floor(parseFloat(this.ui.els.univ3Form.fee.value) * 10000));
            
            // Collect pillar data from UI rows
            const rows = Array.from(this.ui.els.univ3Form.pillarsContainer.querySelectorAll('.pillar-row'));
            const pillars = [];

            for (const row of rows) {
                const priceVal = row.querySelector('.pillar-price').value.trim();
                const amtAVal = row.querySelector('.pillar-amt-a').value.trim();
                const amtBVal = row.querySelector('.pillar-amt-b').value.trim();

                if (!priceVal) continue;

                const price = ethers.utils.parseUnits(priceVal, 18);
                const amtA = ethers.utils.parseUnits(amtAVal || '0', decimalsA);
                const amtB = ethers.utils.parseUnits(amtBVal || '0', decimalsB);

                pillars.push({ price, amtA, amtB, priceVal: parseFloat(priceVal) });
            }

            if (pillars.length === 0) {
                alert("Please add at least one liquidity pillar.");
                return;
            }

            // Sort pillars by price descending
            pillars.sort((a, b) => b.priceVal - a.priceVal);

            // Validate strictly decreasing prices
            for (let i = 1; i < pillars.length; i++) {
                if (pillars[i].price.gte(pillars[i-1].price)) {
                    alert(`Prices must be strictly decreasing.`);
                    return;
                }
            }

            // Check token order in the pool to align inputs correctly
            const pool = await contract.getUniswapV3Pool(this.tokenA, this.tokenB);
            const pToken0 = pool.token0 || pool[0];
            
            let isReverse = false;
            if (pToken0 && pToken0 !== ethers.constants.AddressZero) {
                if (pToken0.toLowerCase() === this.tokenB.toLowerCase()) {
                    isReverse = true;
                }
            }

            const inputPrices = pillars.map(p => p.price);
            const inputAmtsA = pillars.map(p => p.amtA);
            const inputAmtsB = pillars.map(p => p.amtB);

            // Send transaction with correct token order
            if (btn) btn.textContent = 'Sending Tx...';
            if (isReverse) {
                const tx = await contract.setUniswapV3Pool(this.tokenB, this.tokenA, inputAmtsB, inputAmtsA, inputPrices, fee);
                if (btn) btn.textContent = 'Confirming...';
                await tx.wait();
            } else {
                const tx = await contract.setUniswapV3Pool(this.tokenA, this.tokenB, inputAmtsA, inputAmtsB, inputPrices, fee);
                if (btn) btn.textContent = 'Confirming...';
                await tx.wait();
            }

            alert("UniV3 Pool Updated!");
            await this.updateConfigPanel();
            this.calculateExternalArbitrage(true);
        } catch (e) {
            console.error("UniV3 Update Error:", e);
            alert("Update failed: " + (e.reason || e.message));
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }

    /**
     * Calculates external arbitrage opportunity.
     * Strategy: Token A -> Staple -> Token B -> External DEX -> Token A
     * @param {boolean} force - If true, bypasses cache check.
     */
    async calculateExternalArbitrage(force = false) {
        const amountInVal = this.ui.els.amountIn.value;
        // Basic validation
        if (!amountInVal || parseFloat(amountInVal) <= 0 || !this.tokenA || !this.tokenB) {
            this.ui.updateExternalResults("--", "--", "--", "--", false, "");
            return;
        }

        // Cache check to avoid redundant calculations
        const currentParams = JSON.stringify({ amountInVal, tokenA: this.tokenA, tokenB: this.tokenB, currentTab: this.currentTab });
        if (!force && this.lastCalcParams === currentParams) {
            return;
        }
        this.lastCalcParams = currentParams;

        // Prevent concurrent calculations
        if (this.isCalculating) {
            return;
        }
        this.isCalculating = true;
        this.ui.setLoading(true);

        try {
            const decimalsA = Utils.getTokenDecimals(this.tokenA, this.tokens);
            const amountInWei = ethers.utils.parseUnits(amountInVal, decimalsA);
            
            // Step 1: Calculate Staple Output (Token A -> Token B)
            const stapleResult = await this.getStapleOutput(this.tokenA, this.tokenB, amountInWei);
            const stapleOutWei = stapleResult.amountOut;
            this.bestStaplePath = stapleResult.path; // Store path for execution

            const decimalsB = Utils.getTokenDecimals(this.tokenB, this.tokens);
            const stapleOutStr = ethers.utils.formatUnits(stapleOutWei, decimalsB);

            if (stapleOutWei.eq(0)) {
                this.ui.updateExternalResults(stapleOutStr, "0 (Staple path not found)", "--", "--", false, "No Opportunity");
                return;
            }

            // Step 2: Calculate External Output (Token B -> Token A)
            const externalOutWei = await this.getExternalOutput(this.tokenB, this.tokenA, stapleOutWei);
            const externalOutStr = ethers.utils.formatUnits(externalOutWei, decimalsA);

            // Step 3: Calculate Profit
            const profitWei = externalOutWei.sub(amountInWei);
            const profitStr = ethers.utils.formatUnits(profitWei, decimalsA);

            let bps = ethers.BigNumber.from(0);
            if (amountInWei.gt(0)) {
                bps = profitWei.mul(10000).div(amountInWei);
            }

            const isProfitable = profitWei.gt(0);
            const statusMsg = isProfitable ? "Arbitrage Opportunity Found!" : "No Opportunity";

            // Update UI
            this.ui.updateExternalResults(stapleOutStr, externalOutStr, profitStr, bps.toString(), isProfitable, statusMsg);

        } catch (e) {
            console.error("Calculation error:", e);
            this.ui.updateExternalResults("Error", "Error", "--", "--", false, "Error");
        } finally {
            this.isCalculating = false;
            this.ui.setLoading(false);
        }
    }

    /**
     * Helper to get output amount from Staple protocol.
     * Uses `calcBetterPath` from UI Pool Data Provider.
     */
    async getStapleOutput(tokenIn, tokenOut, amountIn) {
        if (!window.swapGraph || !this.swapGraphData) return { amountOut: ethers.constants.Zero, path: [] };

        // Enumerate possible paths
        const paths = window.swapGraph.enumeratePaths(tokenIn, tokenOut, this.swapGraphData.assetAdj);
        if (paths.length === 0) return { amountOut: ethers.constants.Zero, path: [] };

        const uiPoolDataProviderAddr = environment.getAllParams().uiPoolDataProvider;
        const uiContract = new ethers.Contract(uiPoolDataProviderAddr, stapleUIPoolDataProviderAbi, Utils.getProvider());

        const formattedPaths = paths.map(path => path.map(vtp => vtp.params.id));

        try {
            // Simulate swap
            const res = await uiContract.calcBetterPath(tokenIn, amountIn, formattedPaths, 0);
            return { amountOut: res[0], path: res[1] };
        } catch (e) {
            console.warn("Staple calcBetterPath failed:", e);
            return { amountOut: ethers.constants.Zero, path: [] };
        }
    }

    /**
     * Helper to get output amount from the currently selected External DEX.
     */
    async getExternalOutput(tokenIn, tokenOut, amountIn) {
        let dexAddr = '';
        if (this.currentTab === 'mock-curve') dexAddr = environment.getAllParams().mockCurve;
        else if (this.currentTab === 'mock-univ2') dexAddr = environment.getAllParams().mockUniswapV2;
        else if (this.currentTab === 'mock-univ3') dexAddr = environment.getAllParams().mockUniswapV3;
        else if (this.currentTab === 'mock-aggregator') dexAddr = environment.getAllParams().mockDexAggregator;

        if (!dexAddr) return ethers.constants.Zero;

        const contract = new ethers.Contract(dexAddr, mockExternalDexExtentionsAbi, Utils.getProvider());
        try {
            if (this.currentTab === 'mock-aggregator') {
                const res = await contract.getBestQuote(tokenIn, tokenOut, amountIn);
                return res.bestAmountOut;
            } else {
                // Standard getDy interface for mock DEXs
                return await contract.getDy(tokenIn, tokenOut, amountIn);
            }
        } catch (e) {
            console.warn("External quote failed:", e);
            return ethers.constants.Zero;
        }
    }

    /**
     * Executes the arbitrage transaction on-chain.
     * 1. Approves Staple Router.
     * 2. Swaps on Staple (Token A -> Token B).
     * 3. Approves External DEX.
     */
    async executeArbitrage() {
        const userAddr = Utils.getUserAddress();
        const signer = await window.stapleCommon.resolveSigner(userAddr);
        if (!signer) { alert(await window.stapleCommon.describeMissingSigner(userAddr, { subject: 'User' })); return; }
        
        const updateState = this.ui.getGlobalUpdateState();
        const amountInVal = this.ui.els.amountIn.value;
        const decimalsA = Utils.getTokenDecimals(this.tokenA, this.tokens);
        const amountInWei = ethers.utils.parseUnits(amountInVal, decimalsA);
        
        const btn = this.ui.els.executeBtn;
        const originalText = btn ? btn.textContent : 'Execute';

        this.ui.els.arbStatus.textContent = "Executing...";
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Executing...';
        }

        try {
            // --- Step 1: Approve Staple ---
            const routerAddr = environment.getAllParams().router;
            if (!routerAddr) throw new Error("Router address not configured");

            const tokenAContract = new ethers.Contract(this.tokenA, erc20MetadataAbi, signer);
            
            // Determine spender (LP address) and verifyData
            let spender = null;
            let verifyData = '0x';
            
            // Logic to find the correct spender (first LP in the path)
            if (typeof this.swapGraphData !== 'undefined' && this.swapGraphData && this.swapGraphData.allVtps) {
                 const firstVtpId = this.bestStaplePath[0];
                 const firstVtp = this.swapGraphData.allVtps.get(Number(firstVtpId));
                 
                 if (firstVtp) {
                     if (firstVtp.token0 && firstVtp.token0.params && firstVtp.token0.params.asset && firstVtp.token0.params.asset.toLowerCase() === this.tokenA.toLowerCase()) {
                         spender = firstVtp.token0.params.lpAddr;
                     } else if (firstVtp.token1 && firstVtp.token1.params && firstVtp.token1.params.asset && firstVtp.token1.params.asset.toLowerCase() === this.tokenA.toLowerCase()) {
                         spender = firstVtp.token1.params.lpAddr;
                     }
                 }
                 
                 // Construct verifyData for Oracle verification if needed
                 try {
                     const tokenSet = new Set([this.tokenA, this.tokenB]);
                     this.bestStaplePath.forEach(id => {
                         const v = this.swapGraphData.allVtps.get(Number(id));
                         if (v?.token0?.params?.asset) tokenSet.add(v.token0.params.asset);
                         if (v?.token1?.params?.asset) tokenSet.add(v.token1.params.asset);
                     });
                     if (window.buildPriceProviderVerificationPayload) {
                         const result = await window.buildPriceProviderVerificationPayload(Array.from(tokenSet));
                         
                         if (result && typeof result === 'object' && result.encoded) {
                             verifyData = result.encoded;
                         } else if (typeof result === 'string') {
                             verifyData = result;
                         }
                         
                     } else {
                         console.warn("[Arbitrage] window.buildPriceProviderVerificationPayload is missing");
                     }
                 } catch (e) {
                     console.warn('[Arbitrage] Failed to build verifyData', e);
                 }
            } else {
                console.warn("[Arbitrage] swapGraphData is missing or invalid");
            }
            
            if (!spender) {
                console.warn("Could not determine spender from VTP, falling back to Router (might fail)");
                spender = routerAddr;
            }

            // Check and set allowance for Token A
            const allowanceA = await tokenAContract.allowance(userAddr, spender);
            if (allowanceA.lt(amountInWei)) {
                if (btn) btn.textContent = 'Approving...';
                await (await tokenAContract.approve(spender, ethers.constants.MaxUint256)).wait();
            }

            // Capture balance of Token B BEFORE Staple swap to calculate exact received amount
            const tokenBContract = new ethers.Contract(this.tokenB, erc20MetadataAbi, signer);
            const balanceB_Before = await tokenBContract.balanceOf(userAddr);

            // --- Step 2: Swap Staple ---
            if (btn) btn.textContent = 'Swapping (Staple)...';
            const router = new ethers.Contract(routerAddr, stapleRouterAbi, signer);
            const swapInput = {
                deadline: Math.floor(Date.now() / 1000) + 3600,
                receiver: userAddr,
                tokenIn: this.tokenA,
                tokenOut: this.tokenB,
                path: this.bestStaplePath,
                amountIn: amountInWei,
                amountOutMin: 0
            };
            

            await (await router.swap(swapInput, verifyData)).wait();

            // Capture balance of Token B AFTER Staple swap
            const balanceB_After = await tokenBContract.balanceOf(userAddr);
            const amountReceived = balanceB_After.sub(balanceB_Before);
            

            if (amountReceived.eq(0)) {
                throw new Error("Staple Swap returned 0 amount. Aborting external swap.");
            }

            // --- Step 3: Approve External ---
            if (btn) btn.textContent = 'Approving External...';
            let dexAddr = '';
            if (this.currentTab === 'mock-curve') dexAddr = environment.getAllParams().mockCurve;
            else if (this.currentTab === 'mock-univ2') dexAddr = environment.getAllParams().mockUniswapV2;
            else if (this.currentTab === 'mock-univ3') dexAddr = environment.getAllParams().mockUniswapV3;
            else if (this.currentTab === 'mock-aggregator') dexAddr = environment.getAllParams().mockDexAggregator;

            if (!dexAddr) throw new Error(`DEX address not configured for ${this.currentTab}`);

            const allowanceB = await tokenBContract.allowance(userAddr, dexAddr);
            if (allowanceB.lt(amountReceived)) {
                await (await tokenBContract.approve(dexAddr, ethers.constants.MaxUint256)).wait();
            }

            // --- Step 4: Swap External ---
            if (btn) btn.textContent = 'Swapping (External)...';
            const dexContract = new ethers.Contract(dexAddr, mockExternalDexExtentionsAbi, signer);
            // Pass the new updateState parameter to optionally update the mock DEX state on-chain
            if (btn) btn.textContent = 'Confirming...';
            await (await dexContract.swap(this.tokenB, this.tokenA, amountReceived, updateState)).wait();

            alert("Arbitrage Executed Successfully!");
            
            // Refresh UI
            await this.updateConfigPanel();
            this.calculateExternalArbitrage(true);

        } catch (e) {
            console.error("Execution failed:", e);
            alert("Execution Failed: " + (e.reason || e.message));
        } finally {
            // Restore button state
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        }
    }
}
