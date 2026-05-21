// arbitrage-ui.js

/**
 * ArbitrageUI Class
 * 
 * This class is responsible for all User Interface interactions on the Arbitrage page.
 * It handles:
 * 1. DOM Element caching for performance.
 * 2. Event binding and navigation logic.
 * 3. Updating the display with calculation results.
 * 4. Managing the state of configuration forms (Curve, UniV2, UniV3).
 * 5. Rendering charts for Uniswap V3 liquidity distribution.
 * 
 * It is designed to be decoupled from the business logic, which resides in ArbitrageService.
 */
// Dependencies: src/pages/arbitrage/arbitrage-utils.js, ethers.js
class ArbitrageUI {
    /**
     * Constructor
     * Initializes the UI class and caches all necessary DOM elements.
     */
    constructor() {
        // Cache DOM elements to avoid repeated lookups during runtime
        this.els = {
            // Navigation elements
            navItems: document.querySelectorAll('.nav-item'),
            panels: document.querySelectorAll('.content-panel'),
            
            // Main panels
            externalPanel: document.getElementById('external-arb-panel'),
            externalResultsPanel: document.getElementById('external-results-panel'),
            
            // External Arbitrage Inputs
            tokenASelect: document.getElementById('token-a-select'),
            tokenBSelect: document.getElementById('token-b-select'),
            swapBtn: document.getElementById('swap-tokens-btn'),
            amountIn: document.getElementById('amount-in'),
            
            // External Arbitrage Results
            stapleOut: document.getElementById('staple-out-val'),
            externalOut: document.getElementById('external-out-val'),
            profit: document.getElementById('profit-val'),
            profitRatio: document.getElementById('profit-ratio-val'),
            arbStatus: document.getElementById('arb-status'),
            executeBtn: document.getElementById('execute-arb-btn'),
            
            // Global Settings
            updateStateCheckbox: document.getElementById('global-update-state'),

            // Internal Arbitrage Elements
            internalTokenSelect: document.getElementById('internal-token-select'),
            internalAmountIn: document.getElementById('internal-amount-in'),
            internalBtn: document.getElementById('btn-calc-internal'),
            internalResults: document.getElementById('internal-results'),
            internalBestPath: document.getElementById('internal-best-path'),
            internalAmountOut: document.getElementById('internal-amount-out'),
            internalProfit: document.getElementById('internal-profit'),
            internalExecuteBtn: document.getElementById('btn-execute-internal'),
            internalPathDetails: document.getElementById('internal-path-details'),

            // Mock Curve Configuration Form
            curveForm: {
                balA: document.getElementById('curve-balance-a'),
                balB: document.getElementById('curve-balance-b'),
                A: document.getElementById('curve-a'),
                fee: document.getElementById('curve-fee'),
                btn: document.getElementById('btn-update-curve')
            },
            // Mock Uniswap V2 Configuration Form
            univ2Form: {
                resA: document.getElementById('univ2-reserve-a'),
                resB: document.getElementById('univ2-reserve-b'),
                fee: document.getElementById('univ2-fee'),
                btn: document.getElementById('btn-update-univ2')
            },
            // Mock Uniswap V3 Configuration Form
            univ3Form: {
                fee: document.getElementById('univ3-fee'),
                pillarsContainer: document.getElementById('univ3-pillars-container'),
                addPillarBtn: document.getElementById('btn-add-pillar'),
                btn: document.getElementById('btn-update-univ3'),
                headerAmt0: document.getElementById('univ3-header-amt0'),
                headerAmt1: document.getElementById('univ3-header-amt1')
            },
            
            // Current State Display Elements
            curveState: {
                balA: document.getElementById('curve-curr-bal-a'),
                balB: document.getElementById('curve-curr-bal-b'),
                A: document.getElementById('curve-curr-a'),
                fee: document.getElementById('curve-curr-fee')
            },
            univ2State: {
                resA: document.getElementById('univ2-curr-res-a'),
                resB: document.getElementById('univ2-curr-res-b'),
                fee: document.getElementById('univ2-curr-fee')
            },
            univ3State: {
                fee: document.getElementById('univ3-curr-fee'),
                chartContainer: document.getElementById('univ3-chart-container')
            }
        };
    }

    /**
     * Sets up the navigation tabs (Mock Curve, UniV2, UniV3, Internal).
     * Handles switching between panels and toggling visibility of shared components.
     * @param {Function} onTabChange - Callback function triggered when a tab is clicked.
     */
    setupNavigation(onTabChange) {
        this.els.navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items and panels
                this.els.navItems.forEach(n => n.classList.remove('active'));
                this.els.panels.forEach(p => p.classList.remove('active'));
                
                // Activate clicked item and corresponding panel
                item.classList.add('active');
                const target = item.getAttribute('data-target');
                const panel = document.getElementById(target);
                if (panel) panel.classList.add('active');
                
                // Toggle external panel visibility based on selected tab
                // Internal arbitrage has a different UI layout
                if (target === 'internal') {
                    this.els.externalPanel.style.display = 'none';
                    this.els.externalResultsPanel.style.display = 'none';
                } else {
                    this.els.externalPanel.style.display = 'flex';
                    this.els.externalResultsPanel.style.display = 'block';
                }

                // Notify service of tab change
                if (onTabChange) onTabChange(target);
            });
        });
    }

    /**
     * Updates the External Arbitrage Results panel.
     * @param {string} stapleOut - Output amount from Staple protocol.
     * @param {string} externalOut - Output amount from External DEX.
     * @param {string} profit - Calculated profit.
     * @param {string} profitRatio - Profit ratio in basis points.
     * @param {boolean} isProfitable - Whether the trade is profitable.
     * @param {string} statusMsg - Status message to display.
     */
    updateExternalResults(stapleOut, externalOut, profit, profitRatio, isProfitable, statusMsg) {
        this.els.stapleOut.textContent = stapleOut;
        this.els.externalOut.textContent = externalOut;
        this.els.profit.textContent = profit;
        this.els.profitRatio.textContent = profitRatio;
        this.els.arbStatus.textContent = statusMsg;

        // Color coding for profit/loss
        if (isProfitable) {
            this.els.profit.style.color = "green";
            this.els.profitRatio.style.color = "green";
            this.els.executeBtn.disabled = false; // Enable execution only if profitable
        } else {
            this.els.profit.style.color = "red";
            this.els.profitRatio.style.color = "red";
            this.els.executeBtn.disabled = true;
        }
    }

    /**
     * Sets the loading state of the UI during calculations.
     * @param {boolean} isLoading - True to show loading state.
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.els.stapleOut.textContent = "Calculating...";
            this.els.externalOut.textContent = "Calculating...";
            this.els.profit.textContent = "--";
            this.els.executeBtn.disabled = true;
        }
    }

    /**
     * Updates the Current State display for Mock Curve.
     * Also pre-fills the update form with current values.
     */
    updateCurveState(balA, balB, A, fee) {
        this.els.curveState.balA.textContent = balA;
        this.els.curveState.balB.textContent = balB;
        this.els.curveState.A.textContent = A;
        this.els.curveState.fee.textContent = fee;
        
        // Pre-fill form inputs
        this.els.curveForm.balA.value = balA !== "Not Initialized" ? balA : "";
        this.els.curveForm.balB.value = balB !== "Not Initialized" ? balB : "";
        this.els.curveForm.A.value = A !== "--" ? A : "";
        this.els.curveForm.fee.value = fee !== "--" ? fee.replace('%', '') : "";
    }

    /**
     * Updates the Current State display for Mock Uniswap V2.
     * Also pre-fills the update form with current values.
     */
    updateUniV2State(resA, resB, fee) {
        this.els.univ2State.resA.textContent = resA;
        this.els.univ2State.resB.textContent = resB;
        this.els.univ2State.fee.textContent = fee;

        // Pre-fill form inputs
        this.els.univ2Form.resA.value = resA !== "Not Initialized" ? resA : "";
        this.els.univ2Form.resB.value = resB !== "Not Initialized" ? resB : "";
        this.els.univ2Form.fee.value = fee !== "--" ? fee.replace('%', '') : "";
    }

    /**
     * Updates the Current State display for Mock Uniswap V3.
     * Note: Chart rendering is handled separately by `renderUniV3Chart`.
     */
    updateUniV3State(fee, chartHtml) {
        this.els.univ3State.fee.textContent = fee;
        this.els.univ3State.chartContainer.innerHTML = chartHtml || '';
        this.els.univ3Form.fee.value = fee !== "--" ? fee.replace('%', '') : "";
    }
    
    /**
     * Gets the state of the "Update External DEX State" checkbox.
     * @returns {boolean} True if checked.
     */
    getGlobalUpdateState() {
        return this.els.updateStateCheckbox ? this.els.updateStateCheckbox.checked : false;
    }

    /**
     * Adds a new row for liquidity pillar input in the Uniswap V3 form.
     * @param {string} price - Initial price value.
     * @param {string} amtA - Initial Amount A value.
     * @param {string} amtB - Initial Amount B value.
     */
    addUniV3PillarRow(price = '', amtA = '', amtB = '') {
        const container = this.els.univ3Form.pillarsContainer;
        const row = document.createElement('div');
        row.className = 'pillar-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr 1fr 30px';
        row.style.gap = '5px';
        row.style.marginBottom = '5px';

        // Price Input
        const inputPrice = document.createElement('input');
        inputPrice.type = 'text';
        inputPrice.placeholder = 'Price';
        inputPrice.value = price;
        inputPrice.className = 'pillar-price';

        // Amount A Input
        const inputAmtA = document.createElement('input');
        inputAmtA.type = 'text';
        inputAmtA.placeholder = 'Amt A';
        inputAmtA.value = amtA;
        inputAmtA.className = 'pillar-amt-a';

        // Amount B Input
        const inputAmtB = document.createElement('input');
        inputAmtB.type = 'text';
        inputAmtB.placeholder = 'Amt B';
        inputAmtB.value = amtB;
        inputAmtB.className = 'pillar-amt-b';

        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.className = 'btn-danger';
        delBtn.style.padding = '0';
        delBtn.style.height = '100%';
        delBtn.onclick = () => row.remove();

        row.appendChild(inputPrice);
        row.appendChild(inputAmtA);
        row.appendChild(inputAmtB);
        row.appendChild(delBtn);

        container.appendChild(row);
    }

    /**
     * Renders a bar chart visualizing the Uniswap V3 liquidity distribution.
     * @param {Array} amount0s - Array of Amount 0 values.
     * @param {Array} amount1s - Array of Amount 1 values.
     * @param {Array} prices - Array of Price values.
     * @param {HTMLElement} container - Container element to render into.
     * @param {string} symbol0 - Symbol for Token 0.
     * @param {string} symbol1 - Symbol for Token 1.
     */
    renderUniV3Chart(amount0s, amount1s, prices, container, symbol0, symbol1) {
        container.innerHTML = '';
        if (!prices || prices.length === 0) {
            container.textContent = "No Data";
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            return;
        }

        // Calculate max amount for scaling
        const maxAmt = Math.max(
            ...amount0s.map(v => parseFloat(v)), 
            ...amount1s.map(v => parseFloat(v))
        ) || 1;

        const chart = document.createElement('div');
        chart.style.display = 'flex';
        chart.style.alignItems = 'flex-end';
        chart.style.height = '100%';
        chart.style.width = '100%';
        chart.style.overflowX = 'auto';
        chart.style.padding = '10px 10px 20px 10px';
        chart.style.gap = '4px';

        prices.forEach((price, i) => {
            const a0 = parseFloat(amount0s[i]);
            const a1 = parseFloat(amount1s[i]);
            
            const barContainer = document.createElement('div');
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.alignItems = 'center';
            barContainer.style.flex = '0 0 40px';
            barContainer.style.height = '100%';
            barContainer.style.position = 'relative';
            barContainer.title = `Price: ${price}\n${symbol0}: ${a0}\n${symbol1}: ${a1}`;

            const barHeight0 = (a0 / maxAmt) * 80; 
            const barHeight1 = (a1 / maxAmt) * 80;

            // Render Bar for Token 1 (Red)
            if (a1 > 0) {
                const bar1 = document.createElement('div');
                bar1.style.width = '100%';
                bar1.style.height = `${barHeight1}%`;
                bar1.style.backgroundColor = '#ef4444';
                bar1.style.marginBottom = '1px';
                barContainer.appendChild(bar1);
            }

            // Render Bar for Token 0 (Blue)
            if (a0 > 0) {
                const bar0 = document.createElement('div');
                bar0.style.width = '100%';
                bar0.style.height = `${barHeight0}%`;
                bar0.style.backgroundColor = '#3b82f6';
                barContainer.appendChild(bar0);
            }
            
            // X-Axis Label (Price)
            const label = document.createElement('div');
            label.textContent = parseFloat(price).toFixed(2);
            label.style.fontSize = '10px';
            label.style.position = 'absolute';
            label.style.bottom = '-20px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%) rotate(-45deg)';
            label.style.whiteSpace = 'nowrap';
            barContainer.appendChild(label);

            chart.appendChild(barContainer);
        });

        container.appendChild(chart);
        
        // Add Legend
        const legend = document.createElement('div');
        legend.style.position = 'absolute';
        legend.style.top = '5px';
        legend.style.right = '5px';
        legend.style.fontSize = '10px';
        legend.style.backgroundColor = 'rgba(255,255,255,0.8)';
        legend.style.padding = '2px 5px';
        legend.style.borderRadius = '4px';
        legend.innerHTML = `
            <span style="color:#3b82f6">■</span> ${symbol0}
            <span style="color:#ef4444; margin-left:5px;">■</span> ${symbol1}
        `;
        container.appendChild(legend);
    }

    /**
     * Updates the internal arbitrage path details panel.
     * @param {string|null} msg - Simple message string.
     * @param {Object} data - Structured data { vtps, processes, tokenSymbols, startAsset }.
     */
    updateInternalPathDetails(msg, data) {
        if (!this.els.internalPathDetails) return;
        
        // Clear previous content if it's a new calculation or error message
        if (msg) {
            this.els.internalPathDetails.textContent = msg;
            if (!data) return; // If only message, stop here
        } else {
            this.els.internalPathDetails.innerHTML = '';
        }
        
        if (data && data.vtps && data.processes) {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            container.style.marginTop = '10px';
            
            let currAsset = data.startAsset;
            
            data.vtps.forEach((vtp, i) => {
                const proc = data.processes[i];
                const stepDiv = document.createElement('div');
                stepDiv.className = 'vtp-detail'; 
                stepDiv.style.background = '#f9fafb';
                stepDiv.style.border = '1px solid #e5e7eb';
                stepDiv.style.borderRadius = '8px';
                stepDiv.style.padding = '10px';
                stepDiv.style.fontSize = '12px';
                stepDiv.style.color = '#333';
                
                // Determine symbols
                const a0 = vtp.token0.params.asset;
                const a1 = vtp.token1.params.asset;
                const nextAsset = (a0.toLowerCase() === currAsset.toLowerCase()) ? a1 : a0;
                
                const getSym = (addr) => {
                    const t = data.tokenSymbols.find(x => x.address.toLowerCase() === addr.toLowerCase());
                    return t ? t.symbol : addr.substring(0, 6);
                };

                const symIn = getSym(currAsset);
                const symOut = getSym(nextAsset);
                
                // Header
                const header = document.createElement('div');
                header.style.fontWeight = 'bold';
                header.style.marginBottom = '8px';
                header.style.borderBottom = '1px solid #eee';
                header.style.paddingBottom = '4px';
                header.textContent = `Step ${i+1}: ${symIn} ➜ ${symOut} (VTP: ${vtp.params.id})`;
                stepDiv.appendChild(header);
                
                if (proc && !proc.error) {
                    // Valuation details
                    const decimalsIn = Utils.getTokenDecimals(currAsset, data.tokenSymbols);
                    const decimalsOut = Utils.getTokenDecimals(nextAsset, data.tokenSymbols);
                    
                    const amountIn = ethers.utils.formatUnits(proc.amountIn, decimalsIn);
                    const realOut = ethers.utils.formatUnits(proc.realOut, decimalsOut);
                    const feeIn = ethers.utils.formatUnits(proc.feeIn, decimalsIn);
                    const feeOut = ethers.utils.formatUnits(proc.feeOut, decimalsOut);
                    
                    // Calculate effective price
                    const pIn = parseFloat(amountIn);
                    const pOut = parseFloat(realOut);
                    const price = pIn > 0 ? pOut / pIn : 0;
                    
                    const grid = document.createElement('div');
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = '1fr 1fr';
                    grid.style.gap = '4px';
                    
                    const row = (label, val) => `<div style="color:#666;">${label}:</div><div style="text-align:right;font-family:monospace;">${val}</div>`;
                    
                    grid.innerHTML = `
                        ${row('Input', parseFloat(amountIn).toFixed(6))}
                        ${row('Output', parseFloat(realOut).toFixed(6))}
                        ${row('Fee In', parseFloat(feeIn).toFixed(6))}
                        ${row('Fee Out', parseFloat(feeOut).toFixed(6))}
                        ${row('Price', price.toFixed(6))}
                    `;
                    stepDiv.appendChild(grid);
                } else {
                    const err = document.createElement('div');
                    err.style.color = 'var(--danger, red)';
                    err.textContent = proc ? proc.error : 'No data';
                    stepDiv.appendChild(err);
                }
                
                container.appendChild(stepDiv);
                currAsset = nextAsset;
            });
            
            this.els.internalPathDetails.appendChild(container);
        }
    }

    /**
     * Updates the internal arbitrage results panel.
     * @param {Object} result - The calculation result.
     */
    updateInternalResults(result) {
        if (!result) {
            this.els.internalResults.style.display = 'none';
            return;
        }

        this.els.internalResults.style.display = 'block';
        
        if (result.found) {
            // Format path: A -> B -> C -> A
            const pathStr = result.path.map(t => t.symbol).join(' -> ');
            this.els.internalBestPath.textContent = pathStr;
            this.els.internalAmountOut.textContent = parseFloat(result.amountOut).toFixed(6);
            
            const profit = parseFloat(result.profit);
            this.els.internalProfit.textContent = profit.toFixed(6);
            
            // Highlight profit: green if positive, red if negative
            if (profit > 0) {
                this.els.internalProfit.style.color = 'var(--success, green)';
                if (this.els.internalExecuteBtn) this.els.internalExecuteBtn.disabled = false;
            } else {
                this.els.internalProfit.style.color = 'var(--danger, red)';
                if (this.els.internalExecuteBtn) this.els.internalExecuteBtn.disabled = true;
            }
        } else {
            this.els.internalBestPath.textContent = "No cyclic path found";
            this.els.internalAmountOut.textContent = "--";
            this.els.internalProfit.textContent = "--";
            this.els.internalProfit.style.color = 'inherit';
            if (this.els.internalExecuteBtn) this.els.internalExecuteBtn.disabled = true;
        }
    }
}
