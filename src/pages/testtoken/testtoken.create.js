// Dependencies: src/pages/environment/environment.js, ethers.js
(function () {
  // Constants: Zero address / Zero bytes32, used as placeholder and check
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

  // DOM getter wrapper: centralized management for easier maintenance
  function getElementExisting(){return document.getElementById('input-existing-token')}
  function getElementDecimals(){return document.getElementById('input-decimals')}
  function getElementSymbol(){return document.getElementById('input-symbol')}
  function getElementOracleType(){return document.getElementById('input-oracle-type')}
  function getElementChainlink(){return document.getElementById('input-chainlink-feed')}
  function getElementInitPrice(){return document.getElementById('input-initial-price')}
  function getElementStreamID(){return document.getElementById('input-stream-id')}

  // Value getter wrapper: trim whitespace
  function getValueExisting(){return (getElementExisting().value).trim()}
  function getValueDecimals(){return (getElementDecimals().value).trim()}
  function getValueSymbol(){return (getElementSymbol().value).trim()}
  function getValueOracleType(){return (getElementOracleType().value).trim()}
  function getValueChainlink(){return (getElementChainlink().value).trim()}
  function getValueInitPrice(){return (getElementInitPrice().value).trim()}
  function getValueStreamID(){return (getElementStreamID().value).trim()}

  // Initialize input area: set defaults + disable mutable fields related to Oracle type
  function initCreateInputs() {
    getElementExisting().value = '';
    getElementDecimals().value = '18';
    getElementSymbol().value = '';
    getElementOracleType().value = 'NOT_DECIDED';
    getElementChainlink().value = ZERO_ADDR;
    getElementInitPrice().value = '1';
    getElementStreamID().value = ZERO_BYTES32;

    getElementChainlink().disabled = true;
    getElementInitPrice().disabled = true;
    getElementStreamID().disabled = true;
  }

  // Use existing asset: input not empty and not zero address
  function useExistingAsset() {
    const existing = getValueExisting();
    return (existing && existing !== '' && existing !== ZERO_ADDR);
  }

  // Existing asset input change: control disabled state of decimals/symbol/other oracle related fields
  function onExistingAssetInput() {
    const decimalsInp = getElementDecimals();
    const symbolInp = getElementSymbol();
    const chainlinkInp = getElementChainlink();
    const priceInp = getElementInitPrice();
    const streamInp = getElementStreamID();
    const oracleTypeVal = getValueOracleType();

    // If existing token filled: decimals fixed to 18, symbol cleared and locked
    if (useExistingAsset()) {
      decimalsInp.disabled = true; decimalsInp.value = '18';
      symbolInp.disabled = true; symbolInp.value = '';
      // Allow input Data Feed address under Chainlink Data Feed
      if (oracleTypeVal === 'CHAINLINK_DATA_FEED') {
        chainlinkInp.disabled = false; chainlinkInp.value = '';
        priceInp.disabled = true; priceInp.value = '1';
        streamInp.disabled = true; streamInp.value = ZERO_BYTES32;
      }
    } else {
      // Not using existing token: customizable decimals / symbol
      decimalsInp.disabled = false;
      symbolInp.disabled = false;
      if (oracleTypeVal === 'CHAINLINK_DATA_FEED') {
        // New deployment + Chainlink Data Feed: Data Feed address not needed (determined by subsequent logic), initial price input allowed
        chainlinkInp.disabled = true; chainlinkInp.value = ZERO_ADDR;
        priceInp.disabled = false; priceInp.value = '1';
        streamInp.disabled = true; streamInp.value = ZERO_BYTES32;
      }
    }
  }

  function onDecimalsInput() {} // Reserved: can add input filtering
  // symbol input: once symbol filled, prohibit user from using 'existing token' mixed logic
  function onSymbolInput() {
    const existingInp = getElementExisting();
    const symbol = getValueSymbol();
    if (symbol && symbol.length > 0) {
      existingInp.disabled = true; existingInp.value = ZERO_ADDR;
    } else {
      existingInp.disabled = false; existingInp.value = '';
    }
  }

  // Oracle type switch: adjust dependency field availability and defaults based on type
  function onOracleTypeChange() {
    const chainlinkInp = getElementChainlink();
    const priceInp = getElementInitPrice();
    const streamInp = getElementStreamID();
    const oralceType = getValueOracleType();

    if (oralceType === 'NOT_DECIDED') {
      // NOT DECIDED: all locked to default placeholder
      chainlinkInp.disabled = true; chainlinkInp.value = ZERO_ADDR;
      priceInp.disabled = true; priceInp.value = '1';
      streamInp.disabled = true; streamInp.value = ZERO_BYTES32;
    } else if (oralceType === 'STAPLE') {
      // STAPLE: requires initial price
      chainlinkInp.disabled = true; chainlinkInp.value = ZERO_ADDR;
      priceInp.disabled = false; priceInp.value = '1';
      streamInp.disabled = true; streamInp.value = ZERO_BYTES32;
    } else if (oralceType === 'CHAINLINK_DATA_FEED') {
      // Chainlink Data Feed: existing asset => can fill Data Feed; new deployment => use initial price
      streamInp.disabled = true; streamInp.value = ZERO_BYTES32;
      if (useExistingAsset()) {
        chainlinkInp.disabled = false; chainlinkInp.value = ZERO_ADDR;
        priceInp.disabled = true; priceInp.value = '1';
      } else {
        chainlinkInp.disabled = true; chainlinkInp.value = ZERO_ADDR;
        priceInp.disabled = false; priceInp.value = '1';
      }
    } else if (oralceType === 'CHAINLINK_STREAM') {
      // Chainlink Stream: requires bytes32 StreamID
      chainlinkInp.disabled = true; chainlinkInp.value = ZERO_ADDR;
      priceInp.disabled = true; priceInp.value = '1';
      streamInp.disabled = false; streamInp.value = '';
    } else {
      // Unknown type: disable all
      chainlinkInp.disabled = true; chainlinkInp.value = ZERO_ADDR;
      priceInp.disabled = true; priceInp.value = '1';
      streamInp.disabled = true; streamInp.value = ZERO_BYTES32;
    }
  }

  function onChainlinkInput() {} // Reserved: can add instant address format validation
  function onInitPriceInput() {} // Reserved: can add number range filtering
  function onStreamIDInput() {} // Reserved: can add bytes32 validation

  // Expose real-time interaction functions to HTML events (if inline call needed later)
  window.stapleTestTokenRealtime = {
    onExistingAssetInput,onDecimalsInput,onSymbolInput,
    onOracleTypeChange,onChainlinkInput,onInitPriceInput,onStreamIDInput,
  };

  // Bind all input events and deploy button
  function wireCreateSection() {
    const deployBtn = document.getElementById('btn-deploy-token');
    
    const env = window.environment;
    const userAddr = env?.getAllParams().user;
    const isNoUser = !userAddr || (window.ethers && userAddr === window.ethers.constants.AddressZero) || userAddr === "0x0000000000000000000000000000000000000000";

    if (deployBtn) {
      if (isNoUser) {
          deployBtn.disabled = true;
          deployBtn.textContent = 'Connect Wallet';
          deployBtn.style.background = '#cbd5e1';
          deployBtn.style.cursor = 'not-allowed';
      } else {
          deployBtn.addEventListener('click', onDeployClick);
      }
    } else {
      console.warn('[testtoken.create] Deploy button not found');
    }

    const existingInp = getElementExisting(); if (existingInp) existingInp.addEventListener('input', onExistingAssetInput);
    const decimalsInp = getElementDecimals(); if (decimalsInp) decimalsInp.addEventListener('input', onDecimalsInput);
    const symbolInp = getElementSymbol(); if (symbolInp) symbolInp.addEventListener('input', onSymbolInput);
    const oracleSel = getElementOracleType(); if (oracleSel) oracleSel.addEventListener('change', onOracleTypeChange);
    const chainlinkInp = getElementChainlink(); if (chainlinkInp) chainlinkInp.addEventListener('input', onChainlinkInput);
    const priceInp = getElementInitPrice(); if (priceInp) priceInp.addEventListener('input', onInitPriceInput);
    const streamInp = getElementStreamID(); if (streamInp) streamInp.addEventListener('input', onStreamIDInput);
  }

  // Deploy button click: collect params -> validate -> assemble -> send tx -> wait confirmation -> reset and refresh
  async function onDeployClick() {
    const env = window.environment;
    const userAddr = env?.getAllParams().user;
    if (!userAddr || (window.ethers && userAddr === window.ethers.constants.AddressZero) || userAddr === "0x0000000000000000000000000000000000000000") {
        alert('Please connect wallet first');
        return;
    }

    // Check for signer (browser wallet in production)
    const signer = await window.stapleCommon.resolveSigner(userAddr);
    if (!signer) {
      alert('Please connect a browser wallet for Production mode');
      return;
    }

    const hint = document.getElementById('deploy-hint');

    // Read & parse basic input
    let existingAsset = getValueExisting();
    let decimals = Number(getValueDecimals());
    let symbol = getValueSymbol();
    let oracleTypeStr = getValueOracleType();
    let chainlinkDataFeed = getValueChainlink();
    let initPrice = getValueInitPrice();
    let streamIDOrPullID = getValueStreamID();

    // Convert Oracle type string to enum value
    // enum TestTokenOracleType { NONE, STAPLE, CHAINLINK_DATA_FEED, CHAINLINK_STREAM, REDSTONE }
    const oracleTypeMap = {
      'NOT_DECIDED': 0,  // NONE
      'STAPLE': 1,
      'CHAINLINK_DATA_FEED': 2,
      'CHAINLINK_STREAM': 3,
      'REDSTONE': 4
    };
    
    const oracleType = oracleTypeMap[oracleTypeStr];
    if (oracleType === undefined) {
      throw new Error('Unsupported Oracle type: ' + oracleTypeStr);
    }

    // Input format validation (address)
    if (!ethers.utils.isAddress(existingAsset)) throw new Error('Existing Token address format incorrect');
    if (!ethers.utils.isAddress(chainlinkDataFeed)) throw new Error ('Chainlink Data Feed address format incorrect');

    // Price constructed by oracle type: different types use different decimals
    let initPriceFeed = ethers.utils.parseUnits(initPrice, 18);
    if (oracleTypeStr === 'NOT_DECIDED') {
      throw new Error('Unsupported Oracle type');
    } else if (oracleTypeStr === 'STAPLE') {
      initPriceFeed = ethers.utils.parseUnits(initPrice, 18);
    } else if (oracleTypeStr === 'CHAINLINK_DATA_FEED') {
      if (useExistingAsset()){
        // Use existing asset + Data Feed: price provided by on-chain Data Feed, not overwritten
      } else {
        // New deployment asset + Data Feed: initial price needed at deployment (use token decimals)
        initPriceFeed = ethers.utils.parseUnits(initPrice, decimals);
      }
    } else if (oracleTypeStr === 'CHAINLINK_STREAM') {
      // Chainlink Stream: price driven by stream
    } else {
      throw new Error('Unsupported Oracle type');
    }

    // Assemble final deploy params - oracleType is now number
    const deployTokenData = {
      existingAsset, decimals, symbol, oracleType,
      chainlinkDataFeed, initPriceFeed, streamIDOrPullID,
    };

    // Environment dependency check (Factory / RPC / ABI)
    const factoryAddr = window.environment?.getAllParams().testERC20Factory || '';
    if (!ethers.utils.isAddress(factoryAddr)) return alert('Please set valid testERC20Factory address');
    const rpc = window.environment?.getAllParams().rpc || '';
    if (!rpc) return alert('Missing rpc');
    if (typeof stapleTestERC20FactoryAbi === 'undefined') return alert('Missing stapleTestERC20FactoryAbi');

    const deployBtn = document.getElementById('btn-deploy-token');
    const originalBtnText = deployBtn ? deployBtn.textContent : 'Deploy';
    
    try {
      // Disable button and show pending state
      if (deployBtn) {
        deployBtn.disabled = true;
        deployBtn.textContent = 'Deploying...';
      }
      if (hint) hint.textContent = 'Sending transaction...';
      
      const adminSigner = await window.stapleCommon.resolveSigner('', {
        contractAddress: factoryAddr,
        requireAdmin: true
      });
      if (!adminSigner) {
        throw new Error('No admin signer available for Test Token Factory');
      }

      const factory = await window.contracts.getTestERC20Factory(adminSigner);
      if (deployBtn) deployBtn.textContent = 'Sending Tx...';
      const tx = await factory.deployStapleTestERC20(deployTokenData);

      if (deployBtn) deployBtn.textContent = 'Confirming...';
      if (hint) hint.textContent = `Submitted successfully: ${tx.hash} Waiting for confirmation...`;

      // Wait for on-chain confirmation
      const receipt = await tx.wait();
      if (receipt?.status !== 1) throw new Error('Transaction failed');

      if (hint) hint.textContent = 'Deploy successful';

      // Reset form and trigger table refresh
      initCreateInputs();
      const refreshBtn = document.getElementById('btn-refresh');
      if (refreshBtn) refreshBtn.click();
    } catch (e) {
      alert(`Deploy failed: ${e?.data?.message || e?.message || e}`);
    } finally {
      // Restore button state
      if (deployBtn) {
        deployBtn.disabled = false;
        deployBtn.textContent = originalBtnText;
      }
      setTimeout(() => { if (hint) hint.textContent = ''; }, 3000);
    }
  }

  // Page load: Bind events + Initialize inputs
  document.addEventListener('DOMContentLoaded', () => {
    wireCreateSection();
    initCreateInputs();
  });
})();
