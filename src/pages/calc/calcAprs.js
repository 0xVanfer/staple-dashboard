/**
 * APR Calculator Logic
 * Calculates the best possible APR combination for a set of Virtual Token Pools (VTPs).
 *
 * Algorithm:
 * 1. Input: Max Allocate Rate (MAR%), Credit Cost, and Max APR for each VTP.
 * 2. Input: Total available credits.
 * 3. Generate all non-empty combinations (power set) of VTPs.
 * 4. Filter combinations where the sum of credits <= total available credits.
 * 5. Calculate APR for each valid combination:
 *    - Single element: APR = VTP Max APR
 *    - Multi-element: APR = Sum(VTP Max APR * VTP MAR)
 * 6. Find the combination with the highest APR.
 * 7. Output: Best APR and the allocation details for each VTP in the best combination.
 */
// Dependencies: src/lib/common.js, src/lib/contractCalls.js
(function () {
  const MAX_VTPS = 10;

  /**
   * Helper to define a global function if it doesn't exist.
   * @param {string} name - Function name on window object.
   * @param {Function} impl - Implementation.
   */
  function fallback(name, impl) {
    if (typeof window[name] !== 'function') window[name] = impl;
  }

  // --- Helper Functions ---

  /**
   * Reads a positive number from an input element.
   * @param {string} id - Element ID.
   * @returns {number} The value or 0.
   */
  fallback('ReadPositiveNumber', (id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = Number(el.value || el.textContent || 0);
    return isFinite(v) && v > 0 ? v : 0;
  });

  /**
   * Sets the text content of an element to a percentage string.
   * @param {string} id - Element ID.
   * @param {number} val - The value (0-1).
   * @param {number} decimals - Number of decimal places.
   */
  fallback('SetPercentage', (id, val, decimals) => {
    const el = document.getElementById(id);
    if (!el) return;
    const num = Number(val) || 0;
    el.textContent = (num * 100).toFixed(decimals ?? 2) + '%';
  });

  /**
   * Displays a status message.
   * @param {string} msg - The message to display.
   */
  fallback('SetError', (msg) => {
    const box = document.getElementById('apr-status');
    if (box) box.textContent = msg;
  });

  /**
   * Generates all non-empty combinations (power set) of an array.
   * @param {Array} arr - Input array.
   * @returns {Array<Array>} Array of combinations.
   */
  fallback('GetAllCombinations', (arr) => {
    const res = [];
    const n = arr.length;
    // Iterate from 1 to 2^n - 1 (binary representation of combinations)
    for (let mask = 1; mask < (1 << n); mask++) {
      const comb = [];
      for (let i = 0; i < n; i++) {
        // Check if the i-th bit is set
        if (mask & (1 << i)) {
          comb.push(arr[i]);
        }
      }
      if (comb.length) res.push(comb);
    }
    return res;
  });

  /**
   * Main calculation function.
   * Reads inputs, computes combinations, finds the best APR, and updates the UI.
   */
  function calcBestApr() {
    const decimals = ReadPositiveNumber('decimals');
    const totalcredits = ReadPositiveNumber('totalcredits');

    // Determine number of VTP rows
    let vtpLength = 0;
    for (let i = 0; i < 100; i++) {
      if (!document.getElementById('mar' + i)) {
        vtpLength = i;
        break;
      }
    }

    // Collect VTP data
    const vtps = [];
    for (let i = 0; i < vtpLength; i++) {
      const mar = ReadPositiveNumber('mar' + i) / 100;
      const credit = ReadPositiveNumber('credit' + i);
      const apr = ReadPositiveNumber('aprmax' + i) / 100;
      const info = new Map();
      info.set('id', i);
      info.set('mar', mar);
      info.set('credit', credit);
      info.set('apr', apr);
      vtps.push(info);
    }
    SetError('VTPs loaded: ' + vtps.length);

    // Generate combinations
    const combs = GetAllCombinations(vtps);
    SetError('Combinations generated: ' + combs.length);

    // Filter by credit limit
    const filtered = combs.filter(c => c.reduce((s, v) => s + v.get('credit'), 0) <= totalcredits);
    SetError(`Valid combinations: ${filtered.length} / ${combs.length}`);

    // Find best APR
    let maxApr = 0;
    let bestComb = [];

    // Reset all outputs first
    for (let i = 0; i < vtpLength; i++) {
      SetPercentage('allorate' + i, 0, 2);
      SetPercentage('aprprov' + i, 0, decimals);
    }

    for (const comb of filtered) {
      let combApr = 0;
      if (comb.length === 1) {
        // Single VTP: APR is the max APR (100% allocation implied)
        combApr = comb[0].get('apr');
      } else {
        // Multiple VTPs: Sum of (APR * MAR)
        for (const v of comb) {
          combApr += v.get('apr') * v.get('mar');
        }
      }

      if (combApr > maxApr) {
        maxApr = combApr;
        bestComb = comb;
      }
    }

    // Update UI with best result
    if (bestComb.length > 0) {
      for (const v of bestComb) {
        const id = v.get('id');
        // If single VTP, allocation is 100%, otherwise it's MAR
        const allocRate = bestComb.length === 1 ? 1 : v.get('mar');
        const aprContribution = v.get('apr') * allocRate;
        
        SetPercentage('allorate' + id, allocRate, 2);
        SetPercentage('aprprov' + id, aprContribution, decimals);
      }
    }

    SetPercentage('bestapr', maxApr, decimals);
  }

  /**
   * Adds a new VTP input row to the table.
   * @param {number} idx - The index for the new row.
   */
  function addVtpRow(idx) {
    const tbody = document.getElementById('vtp-dynamic-rows');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${idx}</td>
      <td><input id="mar${idx}" type="number" min="0" max="100" step="0.01" value="92" /></td>
      <td>
        <select id="credit${idx}">
          <option value="26">26</option>
          <option value="31">31</option>
          <option value="37">37</option>
        </select>
      </td>
      <td><input id="aprmax${idx}" type="number" min="0" step="0.01" placeholder="% apr" /></td>
      <td class="mono small result" id="allorate${idx}">-</td>
      <td class="mono small result" id="aprprov${idx}">-</td>
    `;
    tbody.appendChild(tr);
  }

  /**
   * Initializes the dynamic row functionality.
   */
  function initDynamic() {
    const addBtn = document.getElementById('btn-add-vtp');
    if (addBtn && !addBtn.__bound) {
      addBtn.__bound = true;
      addBtn.addEventListener('click', () => {
        const tbody = document.getElementById('vtp-dynamic-rows');
        const count = tbody.querySelectorAll('tr').length;
        if (count >= MAX_VTPS) return;
        addVtpRow(count);
      });
    }
    // Initial 3 rows
    for (let i = 0; i < 3; i++) addVtpRow(i);
  }

  /**
   * Binds the calculation button event.
   */
  function bindActions() {
    const btn = document.getElementById('btn-calc-apr');
    if (btn && !btn.__bound) {
      btn.__bound = true;
      btn.addEventListener('click', () => {
        try {
          calcBestApr();
          SetError('Success');
        } catch (e) {
          console.error(e);
          SetError('Error: ' + (e.message || e));
        }
      });
    }
  }

  // --- Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    initDynamic();
    bindActions();
  });

  window.aprCalc = { refresh: calcBestApr };
})();


