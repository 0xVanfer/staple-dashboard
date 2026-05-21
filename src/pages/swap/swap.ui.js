/**
 * @file swap.ui.js
 * @description This module handles the rendering of UI components for the Swap page.
 * It includes functions for:
 * - Populating token selection dropdowns.
 * - Rendering the list of enumerated swap paths.
 * - Displaying detailed information about Virtual Trading Pairs (VTPs).
 * - Showing estimation results, fees, and potential errors.
 * - Updating the execution area with current swap context.
 *
 * This module is purely presentational and relies on data provided by `swap.main.js`.
 */
// Dependencies: src/lib/common.js
(function(){
  // Prevent re-initialization if the module is already loaded
  if (window.swapUI) return;

  // Access common utility functions
  const COMMON = window.stapleCommon || {};

  /**
   * @function optionLabel
   * @private
   * @description Generates a formatted label for a token option in a dropdown.
   * Format: "SYMBOL (Address...)"
   *
   * @param {Object} meta - Token metadata object containing `symbol` and `address`.
   * @returns {string} The formatted label string.
   */
  function shortenAddr(addr) {
    return COMMON.shortenAddress ? COMMON.shortenAddress(addr, 4, 4) : (typeof addr === 'string' ? `${addr.slice(0,6)}...${addr.slice(-4)}` : '');
  }

  function optionLabel(meta){
    return `${meta.symbol || '???'} (${shortenAddr(meta.address)})`;
  }

  /**
   * @function renderTokenSelect
   * @description Populates a `<select>` element with token options.
   * It sorts the tokens alphabetically by symbol.
   *
   * @param {HTMLElement} selectEl - The select element to populate.
   * @param {Object} tokenSymbols - Map of token metadata objects.
   */
  function renderTokenSelect(selectEl, tokenSymbols){
    if (!selectEl) return;
    selectEl.innerHTML = '';
    
    // Sort tokens by symbol for better user experience
    const metas = Object.values(tokenSymbols).sort((a,b)=> (a.symbol||'').localeCompare(b.symbol||''));
    
    metas.forEach(m=>{
      const opt=document.createElement('option');
      opt.value = m.address;
      opt.textContent = optionLabel(m);
      selectEl.appendChild(opt);
    });
  }

  /**
   * @function vtpBasicInfo
   * @private
   * @description Extracts basic information from a VTP object for display.
   * Includes ID, parameters (n, p), assets, and Asset-Liability Ratios (ALR).
   *
   * @param {Object} v - The VTP object.
   * @returns {Object} An object containing extracted properties.
   */
  function vtpBasicInfo(v){
    const id = v?.params?.id;
    const n = v?.params?.n;
    const p = v?.params?.p;
    const a0 = v?.token0?.params?.asset;
    const a1 = v?.token1?.params?.asset;
    
    // Convert BigNumbers to numbers for display, defaulting to 0 if invalid
    const alr0 = Number(COMMON.fromBigNumber(v?.token0?.status?.alr,18)) || 0;
    const alr1 = Number(COMMON.fromBigNumber(v?.token1?.status?.alr,18)) || 0;
    
    // Calculate Relative ALR (rALR)
    const ralr = (alr1>0 && alr0>0) ? (alr0/alr1) : 0;
    
    return { id, n, p, a0, a1, alr0, alr1, ralr };
  }

  /**
   * @function tokenExtra
   * @private
   * @description Extracts detailed status information for a single token within a VTP.
   * Includes liability, ALR, and swap fees.
   *
   * @param {Object} vtptoken - The token object within the VTP.
   * @param {Object} tokenDecimals - Map of token decimals.
   * @returns {Object} An object containing formatted token details.
   */
  function tokenExtra(vtptoken, tokenDecimals){
    const asset = vtptoken?.params?.asset;
    const d = tokenDecimals[asset?.toLowerCase()] ?? 18;
    return {
      asset,
      decimals: d,
      liability: COMMON.fromBigNumber(vtptoken?.status?.liability, d),
      alr: COMMON.fromBigNumber(vtptoken?.status?.alr, 18),
      feeIn: COMMON.fromBigNumber(vtptoken?.params?.swapFeeIn, 6),
      feeOut: COMMON.fromBigNumber(vtptoken?.params?.swapFeeOut, 6),
    };
  }

  /**
   * @function bnToStr
   * @private
   * @description Helper to convert a BigNumber to a readable string with specified decimals.
   * Falls back to string conversion if formatting fails.
   *
   * @param {ethers.BigNumber} bn - The BigNumber to convert.
   * @param {number} decimals - The number of decimals.
   * @returns {string} The formatted string.
   */
  function bnToStr(bn, decimals){
    try { return COMMON.fromBigNumber(bn, decimals); } catch { return String(bn); }
  }

  /**
   * @function buildVtpDetail
   * @private
   * @description Constructs the HTML for displaying detailed information about a single VTP in a path.
   * It includes static parameters and, if available, dynamic estimation results for the specific hop.
   *
   * @param {Object} v - The VTP object.
   * @param {Object} tokenSymbols - Map of token symbols.
   * @param {Object} tokenDecimals - Map of token decimals.
   * @param {Object} process - The estimation process result for this hop (optional).
   * @param {Object} hopCtx - Context for the hop (input/output assets, symbols, decimals).
   * @returns {HTMLElement} The constructed DOM element.
   */
  function buildVtpDetail(v, tokenSymbols, tokenDecimals, process, hopCtx){
    const basic = vtpBasicInfo(v);
    const t0 = tokenExtra(v.token0, tokenDecimals);
    const t1 = tokenExtra(v.token1, tokenDecimals);
    const wrap = document.createElement('div');
    wrap.className = 'vtp-detail';
    
    // Basic VTP Info
    wrap.innerHTML =
      `<div class="kv">
         <div>ID: ${basic.id}</div>
         <div>n: ${basic.n}</div>
         <div>p: ${basic.p}</div>
         <div>pa: ${bnToStr(v.status.pa,18)}</div>
         <div>ralr: ${basic.ralr.toFixed(6)}</div>
       </div>
       <div class="kv">
         <div>T0: ${tokenSymbols[t0.asset?.toLowerCase()]?.symbol || ''} (d=${t0.decimals})</div>
         <div>liability: ${t0.liability||'-'}</div>
         <div>alr: ${t0.alr||'-'}</div>
         <div>feeIn: ${t0.feeIn||'-'}</div>
         <div>feeOut: ${t0.feeOut||'-'}</div>
       </div>
       <div class="kv">
         <div>T1: ${tokenSymbols[t1.asset?.toLowerCase()]?.symbol || ''} (d=${t1.decimals})</div>
         <div>liability: ${t1.liability||'-'}</div>
         <div>alr: ${t1.alr||'-'}</div>
         <div>feeIn: ${t1.feeIn||'-'}</div>
         <div>feeOut: ${t1.feeOut||'-'}</div>
       </div>`;
       
    // If there is a valuation process (estimation result), append it
    if (process && hopCtx){
      const inD = hopCtx.inDec;
      const outD = hopCtx.outDec;
      let pa = Number(bnToStr(v.status.pa,18));
      
      // Normalize price direction based on input asset
      if (v.token1.params.asset.toLowerCase() == hopCtx.inAsset.toLowerCase()){ pa = 1/pa; }

      const estHTML =
        `<div class="kv" style="margin-top:6px;">
          <div style="font-weight:600;">Valuation</div>
          <div>in(${COMMON.escapeHtml(hopCtx.inSym)}): ${bnToStr(process.amountIn, inD)}</div>
          <div>feeIn: ${bnToStr(process.feeIn, inD)}</div>
          <div>realIn: ${bnToStr(process.realIn, inD)}</div>
          <div>swapGet: ${bnToStr(process.swapGet, outD)}</div>
          <div>feeOut: ${bnToStr(process.feeOut, outD)}</div>
          <div>estiOut: ${bnToStr(process.estiOut, outD)}</div>
          <div>punish: ${bnToStr(process.punishment, outD)}${process.isPunishment ? ' (Y)' : ''}</div>
          <div>realOut(${COMMON.escapeHtml(hopCtx.outSym)}): ${bnToStr(process.realOut, outD)}</div>
          <div>pa: ${pa}</div>
          <div>slippage: ${10000-10000*Number(bnToStr(process.realOut, outD)/(Number(bnToStr(process.amountIn, inD))*pa))} bps</div>
        </div>`;
      wrap.insertAdjacentHTML('beforeend', estHTML);
    }
    return wrap;
  }

  /**
   * @function checkPathHasLiquidity
   * @private
   * @description Checks if a path has sufficient liquidity.
   * A path is considered to have no liquidity if any VTP in the path has
   * either token0 or token1 with zero liability.
   *
   * @param {Array} path - Array of VTP objects in the path.
   * @returns {boolean} True if the path has liquidity, false otherwise.
   */
  function checkPathHasLiquidity(path){
    if (!Array.isArray(path) || path.length === 0) return false;
    for (const vtp of path){
      const liability0 = vtp?.token0?.status?.liability;
      const liability1 = vtp?.token1?.status?.liability;
      // Check if either side has zero or missing liability
      const l0IsZero = !liability0 || (typeof liability0 === 'object' && liability0.isZero?.()) || liability0 === '0' || Number(liability0) === 0;
      const l1IsZero = !liability1 || (typeof liability1 === 'object' && liability1.isZero?.()) || liability1 === '0' || Number(liability1) === 0;
      if (l0IsZero || l1IsZero) return false;
    }
    return true;
  }

  /**
   * @function renderEnumeratedPaths
   * @description Renders the list of all possible swap paths found.
   * Separates paths into two categories: with liquidity (selectable) and without liquidity (display only).
   * Highlights the best path and the currently selected path.
   *
   * @param {HTMLElement} container - The container element.
   * @param {Array} paths - Array of path objects (arrays of VTPs).
   * @param {string} fromAsset - Source asset address.
   * @param {string} toAsset - Destination asset address.
   * @param {Object} tokenSymbols - Map of token symbols.
   * @param {Array} outputs - Array of estimated outputs for each path (optional).
   * @param {number} bestIndex - Index of the best path.
   * @param {number} selectedIndex - Index of the currently selected path.
   * @returns {Object} Object containing { liquidPaths: number[], noLiquidityPaths: number[] } indices.
   */
  function renderEnumeratedPaths(container, paths, fromAsset, toAsset, tokenSymbols, outputs=[], bestIndex=-1, selectedIndex=-1){
    if (!container) return { liquidPaths: [], noLiquidityPaths: [] };
    if (!paths.length){
      container.innerHTML = '<div class="placeholder">No feasible path</div>';
      updateRoutesCount(0, 0);
      return { liquidPaths: [], noLiquidityPaths: [] };
    }
    container.innerHTML = '';
    const fromSym = tokenSymbols[fromAsset.toLowerCase()]?.symbol || 'FROM';
    const toSym = tokenSymbols[toAsset.toLowerCase()]?.symbol || 'TO';
    
    // Separate paths by liquidity
    const liquidPaths = [];
    const noLiquidityPaths = [];
    
    paths.forEach((path, idx)=>{
      if (checkPathHasLiquidity(path)){
        liquidPaths.push(idx);
      } else {
        noLiquidityPaths.push(idx);
      }
    });
    
    // Update routes count display
    updateRoutesCount(liquidPaths.length, noLiquidityPaths.length);
    
    // Render liquid paths section
    if (liquidPaths.length > 0){
      const liquidSection = document.createElement('div');
      liquidSection.className = 'paths-section liquid-paths';
      liquidSection.innerHTML = `<div class="section-header" style="font-size:13px;color:#059669;font-weight:600;margin-bottom:8px;">✅ Available (${liquidPaths.length})</div>`;
      
      liquidPaths.forEach(idx=>{
        const path = paths[idx];
        const item = createPathItem(path, idx, fromSym, toSym, tokenSymbols, outputs[idx], idx === bestIndex, idx === selectedIndex, false);
        liquidSection.appendChild(item);
      });
      container.appendChild(liquidSection);
    }
    
    // Render no-liquidity paths section
    if (noLiquidityPaths.length > 0){
      const noLiqSection = document.createElement('div');
      noLiqSection.className = 'paths-section no-liquidity-paths';
      noLiqSection.innerHTML = `<div class="section-header" style="font-size:13px;color:#dc2626;font-weight:600;margin:16px 0 8px;">⚠️ No Liquidity (${noLiquidityPaths.length})</div>`;
      
      noLiquidityPaths.forEach(idx=>{
        const path = paths[idx];
        const item = createPathItem(path, idx, fromSym, toSym, tokenSymbols, null, false, false, true);
        noLiqSection.appendChild(item);
      });
      container.appendChild(noLiqSection);
    }
    
    return { liquidPaths, noLiquidityPaths };
  }
  
  /**
   * @function createPathItem
   * @private
   * @description Creates a DOM element for a single path item.
   *
   * @param {Array} path - Array of VTPs in the path.
   * @param {number} idx - Index of the path.
   * @param {string} fromSym - From token symbol.
   * @param {string} toSym - To token symbol.
   * @param {Object} tokenSymbols - Map of token symbols.
   * @param {string|null} output - Estimated output (optional).
   * @param {boolean} isBest - Whether this is the best path.
   * @param {boolean} isSelected - Whether this path is selected.
   * @param {boolean} noLiquidity - Whether this path has no liquidity.
   * @returns {HTMLElement} The path item element.
   */
  function createPathItem(path, idx, fromSym, toSym, tokenSymbols, output, isBest, isSelected, noLiquidity){
    const item = document.createElement('div');
    item.className = 'path-item';
    item.dataset.index = idx;
    
    if (isBest) item.classList.add('best');
    if (isSelected) item.classList.add('selected');
    if (noLiquidity) {
      item.classList.add('no-liquidity');
      item.style.opacity = '0.5';
      item.style.cursor = 'not-allowed';
      item.style.pointerEvents = 'none';
    }
    
    const ids = path.map(v=> v?.params?.id).join(' / ');
    
    // Construct the path string (e.g., "ETH => (USDC/ETH) => USDC")
    const chainStr = [fromSym, ...path.map(v=>{
      const a0 = v?.token0?.params?.asset;
      const a1 = v?.token1?.params?.asset;
      const s0 = tokenSymbols[a0?.toLowerCase()]?.symbol || shortenAddr(a0 || '');
      const s1 = tokenSymbols[a1?.toLowerCase()]?.symbol || shortenAddr(a1 || '');
      return `(${s0}/${s1})`;
    }), toSym].join(' => ');
    
    const outDisp = output != null ? `<span class="badge">Out: ${output}</span>` : '';
    const noLiqBadge = noLiquidity ? '<span class="badge" style="background:#fef2f2;color:#dc2626;">No Liquidity</span>' : '';
    
    item.innerHTML = `<div class="path-head">
        <span class="assets">${COMMON.escapeHtml(chainStr)}</span>
        <span class="badge">Len: ${path.length}</span>
        ${outDisp}
        ${noLiqBadge}
        <span class="badge">IDs: ${ids}</span>
      </div>`;
    return item;
  }
  
  /**
   * @function updateRoutesCount
   * @private
   * @description Updates the routes count display in the summary.
   *
   * @param {number} liquidCount - Number of paths with liquidity.
   * @param {number} noLiquidityCount - Number of paths without liquidity.
   */
  function updateRoutesCount(liquidCount, noLiquidityCount){
    const countEl = document.getElementById('routes-count');
    if (!countEl) return;
    const total = liquidCount + noLiquidityCount;
    if (noLiquidityCount > 0){
      countEl.textContent = `${liquidCount} available / ${total} total`;
    } else {
      countEl.textContent = `${total} routes`;
    }
  }

  /**
   * @function renderVtpDetails
   * @description Renders detailed information for all VTPs in a selected path.
   * It iterates through the path segments and calls `buildVtpDetail` for each.
   *
   * @param {HTMLElement} detailEl - The container element.
   * @param {Array} vtps - Array of VTP objects in the path.
   * @param {Object} tokenSymbols - Map of token symbols.
   * @param {Object} tokenDecimals - Map of token decimals.
   * @param {Array} processes - Array of estimation process results (optional).
   * @param {string} fromAsset - Source asset address.
   * @param {string} toAsset - Destination asset address.
   */
  function renderVtpDetails(detailEl, vtps, tokenSymbols, tokenDecimals, processes, fromAsset, toAsset){
    if (!detailEl) return;
    detailEl.innerHTML = '';
    if (!Array.isArray(vtps) || !vtps.length){
      detailEl.innerHTML = '<div class="placeholder">No details</div>';
      return;
    }
    
    // Build per-hop context (direction and precision)
    let curr = (fromAsset||'').toLowerCase();
    const frag = document.createDocumentFragment();
    
    vtps.forEach((v, idx)=>{
      const a0 = v?.token0?.params?.asset?.toLowerCase();
      const a1 = v?.token1?.params?.asset?.toLowerCase();
      const next = (a0===curr) ? a1 : a0;
      const inAsset = curr;
      const outAsset = next;
      const inSym = tokenSymbols[inAsset]?.symbol || shortenAddr(inAsset || '');
      const outSym = tokenSymbols[outAsset]?.symbol || shortenAddr(outAsset || '');
      const inDec = tokenDecimals[inAsset] ?? 18;
      const outDec = tokenDecimals[outAsset] ?? 18;
      const hopCtx = { inAsset, outAsset, inSym, outSym, inDec, outDec };
      const proc = Array.isArray(processes) ? processes[idx] : null;
      
      frag.appendChild(buildVtpDetail(v, tokenSymbols, tokenDecimals, proc, hopCtx));
      curr = next;
    });
    detailEl.appendChild(frag);
  }

  /**
   * @function renderBestPath
   * @description Renders the summary of the best path found.
   *
   * @param {HTMLElement} summaryEl - The summary container element.
   * @param {HTMLElement} detailEl - The details container element.
   * @param {Object} best - The best path object containing output, VTPs, etc.
   * @param {Object} tokenSymbols - Map of token symbols.
   * @param {string} fromAsset - Source asset address.
   * @param {string} toAsset - Destination asset address.
   * @param {Object} tokenDecimals - Map of token decimals.
   * @param {Array} processes - Array of estimation process results.
   */
  function renderBestPath(summaryEl, detailEl, best, tokenSymbols, fromAsset, toAsset, tokenDecimals, processes){
    if (!summaryEl) return;
    if (!best){
      summaryEl.innerHTML = '<div style="color:rgba(255,255,255,0.7);font-size:14px;">Select tokens to see routes</div>';
      if (detailEl) detailEl.innerHTML = '';
      return;
    }
    const { estiOut, pathVtps, fromReadable, toReadable } = best;
    const fromSym = fromReadable;
    const toSym = toReadable;
    
    const chain = [fromSym, ...pathVtps.map(v=>{
      const a0=v?.token0?.params?.asset; const a1=v?.token1?.params?.asset;
      const s0 = tokenSymbols[a0?.toLowerCase()]?.symbol || shortenAddr(a0 || '');
      const s1 = tokenSymbols[a1?.toLowerCase()]?.symbol || shortenAddr(a1 || '');
      return `(${s0}/${s1})`;
    }), toSym].join(' ➜ ');
    
    summaryEl.innerHTML =
      `<div class="path-item best" data-best="1">
         <div class="path-head">
           <div class="assets" style="font-size:18px;margin-bottom:12px;font-weight:700;">${chain}</div>
           <div style="display:flex;gap:10px;flex-wrap:wrap;">
             <span class="badge" style="font-size:15px;padding:6px 12px;">📊 Output: ${estiOut}</span>
             <span class="badge" style="padding:6px 12px;">Hops: ${pathVtps.length}</span>
             <span class="badge" style="padding:6px 12px;">VTP IDs: ${pathVtps.map(v=>v?.params?.id).join(', ')}</span>
           </div>
         </div>
       </div>`;
    
    // Render details in the expandable section
    if (detailEl) {
      renderVtpDetails(detailEl, pathVtps, tokenSymbols, tokenDecimals, processes||[], fromAsset, toAsset);
    }
  }

  /**
   * @function renderSelectedPath
   * @description Renders the summary of the currently selected path (can be best or user-chosen).
   * Displays a label indicating whether it's the best path or a user-selected alternative.
   *
   * @param {HTMLElement} summaryEl - The summary container element.
   * @param {Object} opts - Options object containing:
   *   @param {string} opts.estiOut - Estimated output.
   *   @param {Array} opts.pathVtps - Array of VTPs in the path.
   *   @param {string} opts.fromReadable - From token symbol.
   *   @param {string} opts.toReadable - To token symbol.
   *   @param {boolean} opts.isBest - Whether this is the best (optimal) path.
   *   @param {number} opts.selectedIndex - Index of the selected path.
   *   @param {number} opts.bestIndex - Index of the best path.
   * @param {Object} tokenSymbols - Map of token symbols.
   */
  function renderSelectedPath(summaryEl, opts, tokenSymbols){
    if (!summaryEl) return;
    if (!opts || !opts.pathVtps){
      summaryEl.innerHTML = '<div style="color:rgba(100,100,100,0.7);font-size:14px;">Select tokens to see routes</div>';
      return;
    }
    const { estiOut, pathVtps, fromReadable, toReadable, isBest, selectedIndex, bestIndex } = opts;
    const fromSym = fromReadable;
    const toSym = toReadable;
    
    const chain = [fromSym, ...pathVtps.map(v=>{
      const a0=v?.token0?.params?.asset; const a1=v?.token1?.params?.asset;
      const s0 = tokenSymbols[a0?.toLowerCase()]?.symbol || shortenAddr(a0 || '');
      const s1 = tokenSymbols[a1?.toLowerCase()]?.symbol || shortenAddr(a1 || '');
      return `(${s0}/${s1})`;
    }), toSym].join(' ➜ ');
    
    // Label differentiates between best path and user-selected path
    const pathLabel = isBest 
      ? '🏆 Best Route (Optimal)' 
      : `📍 Selected Route #${selectedIndex + 1}` + (bestIndex >= 0 ? ` (Best is #${bestIndex + 1})` : '');
    const pathClass = isBest ? 'path-item best selected' : 'path-item selected user-selected';
    
    summaryEl.innerHTML =
      `<div class="${COMMON.escapeHtml(pathClass)}" data-best="${isBest ? 1 : 0}">
         <div class="path-label" style="font-size:13px;color:${isBest ? '#059669' : '#d97706'};margin-bottom:8px;font-weight:600;">${pathLabel}</div>
         <div class="path-head">
           <div class="assets" style="font-size:18px;margin-bottom:12px;font-weight:700;">${COMMON.escapeHtml(chain)}</div>
           <div style="display:flex;gap:10px;flex-wrap:wrap;">
             <span class="badge" style="font-size:15px;padding:6px 12px;">📊 Output: ${COMMON.escapeHtml(String(estiOut || '-'))}</span>
             <span class="badge" style="padding:6px 12px;">Hops: ${pathVtps.length}</span>
             <span class="badge" style="padding:6px 12px;">VTP IDs: ${pathVtps.map(v=>v?.params?.id).join(', ')}</span>
           </div>
         </div>
       </div>`;
  }

  /**
   * @function renderEstimateError
   * @description Displays or clears an error message in the details area.
   *
   * @param {HTMLElement} detailEl - The details container element.
   * @param {string} msg - The error message to display. If empty, clears the error.
   */
  function renderEstimateError(detailEl, msg){
    if (!detailEl) return;
    // Clear existing error messages in this container
    detailEl.querySelectorAll('#error-box, .estimate-error').forEach(n=> n.remove());
    if (!msg) return;
    const div = document.createElement('div');
    div.id = 'error-box';
    div.className = 'estimate-error';
    div.textContent = msg;
    detailEl.prepend(div);
  }

  /**
   * @function renderExecuteArea
   * @description Renders the execution area with current swap details and execute button.
   * Note: The main execution button logic is now handled in `swap.main.js`, this is for the detailed view.
   *
   * @param {HTMLElement} el - The container element.
   * @param {Object} ctx - The execution context.
   */
  function renderExecuteArea(el, ctx){
    if (!el){ return; }
    if (!ctx){
      el.innerHTML = '<div class="placeholder">No executable data</div>';
      return;
    }
    const { chainStr, amountInReadable, estiOutReadable, disabledReason } = ctx;
    el.innerHTML = `
      <div class="swap-exec">
        <div style="flex:1;min-width:260px;">
          <div>Current Path: ${COMMON.escapeHtml(chainStr)}</div>
          <div>Input: ${COMMON.escapeHtml(amountInReadable)}</div>
          <div>Estimated Output: ${COMMON.escapeHtml(estiOutReadable)}</div>
        </div>
        <label>Slippage(%)</label>
        <input id="swap-slippage" type="text" value="1">
        <button id="swap-exec-btn" ${disabledReason ? 'disabled' : ''}>Execute</button>
        <span id="swap-exec-msg" style="font-size:12px;color:${disabledReason?'#b91c1c':'#666'};">${COMMON.escapeHtml(disabledReason||'')}</span>
      </div>
    `;
  }

  // Expose the module API globally
  window.swapUI = {
    renderTokenSelect,
    renderEnumeratedPaths,
    renderBestPath,
    renderSelectedPath,
    renderVtpDetails,
    renderEstimateError,
    renderExecuteArea,
    updateRoutesCount,
  };
})();

