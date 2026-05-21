// Error lookup functionality

// Dependencies: src/pages/errors/errorMap.js
document.addEventListener('DOMContentLoaded', () => {
  
  // Check if ERROR_MAP is loaded
  if (typeof ERROR_MAP === 'undefined') {
    console.error('[errors] ERROR_MAP is not loaded!');
    showError('Failed to load error map data.');
    return;
  }

  
  // Update total count
  document.getElementById('total-errors-count').textContent = Object.keys(ERROR_MAP).length;

  // Populate all errors list
  populateAllErrors();

  // Set up event listeners
  const searchInput = document.getElementById('error-search-input');
  const btnSearch = document.getElementById('btn-search');
  const btnClear = document.getElementById('btn-clear');

  btnSearch.addEventListener('click', performSearch);
  btnClear.addEventListener('click', clearSearch);
  
  // Allow Enter key to trigger search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
});

/**
 * Extract first complete non-zero signature starting with 0x from input
 * If input length > 10, extract signature pattern
 */
function extractSignature(input) {
  input = input.trim();
  
  // If input is short, return as-is
  if (input.length <= 10) {
    return input;
  }
  
  // Look for 0x followed by hex characters (signature is typically 10 chars: 0x + 8 hex)
  const sigPattern = /0x[a-fA-F0-9]{8,}/g;
  const matches = input.match(sigPattern);
  
  if (matches && matches.length > 0) {
    // Find first non-zero signature
    for (const match of matches) {
      const hexPart = match.slice(2); // Remove 0x
      // Check if not all zeros
      if (hexPart !== '0'.repeat(hexPart.length)) {
        // Return first 10 characters (0x + 8 hex digits)
        return match.slice(0, 10);
      }
    }
  }
  
  // If no valid signature found, return original
  return input;
}

/**
 * Normalize signature: add 0x prefix if missing and convert to lowercase
 */
function normalizeSignature(sig) {
  sig = sig.trim();
  if (!sig.startsWith('0x')) {
    sig = '0x' + sig;
  }
  return sig.toLowerCase();
}

/**
 * Perform error signature search
 */
function performSearch() {
  const input = document.getElementById('error-search-input').value.trim();
  
  if (!input) {
    showMessage('Please enter an error signature to search.', 'warning');
    return;
  }

  
  // Extract signature if input is long
  const extracted = extractSignature(input);

  // Normalize the extracted signature
  const normalizedInput = normalizeSignature(extracted);
  
  // Search for exact match first
  if (ERROR_MAP[normalizedInput]) {
    displayResults([{ signature: normalizedInput, ...ERROR_MAP[normalizedInput] }], false);
    return;
  }

  // If no exact match, do fuzzy search (partial match)
  const partialMatches = [];
  const searchTerm = normalizedInput.replace('0x', '');
  
  for (const [signature, errorInfo] of Object.entries(ERROR_MAP)) {
    const sigWithoutPrefix = signature.replace('0x', '');
    
    // Check if signature contains the search term
    if (sigWithoutPrefix.includes(searchTerm)) {
      partialMatches.push({ signature, ...errorInfo });
    }
  }

  if (partialMatches.length > 0) {
    displayResults(partialMatches, true);
  } else {
    displayNoResults(normalizedInput);
  }
}

/**
 * Clear search and results
 */
function clearSearch() {
  document.getElementById('error-search-input').value = '';
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.className = 'results-empty';
  resultsContainer.innerHTML = `
    <p class="empty-message">
      Enter an error signature above and click Search to find error information.
    </p>
  `;
}

/**
 * Display search results
 */
function displayResults(results, isFuzzy) {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.className = 'results-found';
  
  let html = '';
  
  if (isFuzzy && results.length > 1) {
    html += `<div class="fuzzy-notice">Found ${results.length} matching signatures:</div>`;
  } else if (isFuzzy && results.length === 1) {
    html += `<div class="fuzzy-notice">Found 1 partial match:</div>`;
  }

  results.forEach((error, index) => {
    html += `
      <div class="error-result">
        <div class="error-result-header">
          <span class="error-signature">${error.signature}</span>
          ${results.length > 1 ? `<span class="result-number">#${index + 1}</span>` : ''}
        </div>
        <div class="error-result-body">
          <div class="error-field">
            <span class="field-label">Error Name:</span>
            <span class="field-value error-name">${error.name}</span>
          </div>
          <div class="error-field">
            <span class="field-label">Declaration:</span>
            <code class="field-value error-declaration">${escapeHtml(error.declaration)}</code>
          </div>
          <div class="error-field">
            <span class="field-label">Description:</span>
            <span class="field-value error-description">${escapeHtml(error.description)}</span>
          </div>
        </div>
      </div>
    `;
  });

  resultsContainer.innerHTML = html;
}

/**
 * Display no results message
 */
function displayNoResults(searchTerm) {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.className = 'results-not-found';
  resultsContainer.innerHTML = `
    <div class="no-results">
      <div class="no-results-icon">🔍</div>
      <div class="no-results-title">No matching errors found</div>
      <div class="no-results-message">
        No error signatures match "<strong>${escapeHtml(searchTerm)}</strong>".
        <br><br>
        Please check:
        <ul>
          <li>The signature is correct (should be an 8-character hex string)</li>
          <li>Try searching with or without the '0x' prefix</li>
          <li>View all available errors below</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Show general message
 */
function showMessage(message, type = 'info') {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.className = `results-${type}`;
  resultsContainer.innerHTML = `
    <div class="message message-${type}">
      ${escapeHtml(message)}
    </div>
  `;
}

/**
 * Show error message
 */
function showError(message) {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.className = 'results-error';
  resultsContainer.innerHTML = `
    <div class="error-message">
      ❌ ${escapeHtml(message)}
    </div>
  `;
}

/**
 * Populate the "All Errors" section
 */
function populateAllErrors() {
  const container = document.getElementById('all-errors-list');
  
  const sortedErrors = Object.entries(ERROR_MAP)
    .map(([signature, info]) => ({ signature, ...info }))
    .sort((a, b) => a.name.localeCompare(b.name));

  let html = '<div class="all-errors-grid">';
  
  sortedErrors.forEach(error => {
    html += `
      <div class="all-error-item">
        <div class="all-error-header">
          <span class="all-error-name">${error.name}</span>
          <span class="all-error-signature">${error.signature}</span>
        </div>
        <div class="all-error-declaration">
          <code>${escapeHtml(error.declaration)}</code>
        </div>
        <div class="all-error-description">
          ${escapeHtml(error.description)}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
