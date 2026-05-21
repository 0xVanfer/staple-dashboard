#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_STAPLE_DIR="$(cd "$ROOT_DIR/../staple" 2>/dev/null && pwd || true)"
STAPLE_DIR="${STAPLE_REPO_ROOT:-$DEFAULT_STAPLE_DIR}"
CAST_BIN="${CAST_BIN:-$HOME/.foundry/bin/cast}"
JQ_BIN="${JQ_BIN:-$(command -v jq || true)}"

if [ ! -x "$CAST_BIN" ]; then
  echo "cast not found: $CAST_BIN"
  exit 1
fi

if [ -z "$JQ_BIN" ]; then
  echo "jq not found"
  exit 1
fi

MODE="${1:-}"
if [ -z "$MODE" ]; then
  echo "Usage: $0 <mainnet-fork|sepolia>"
  exit 1
fi

log() {
  printf '  ✓ %s\n' "$1"
}

require_env() {
  local value="$1"
  local name="$2"
  if [ -z "$value" ]; then
    echo "Missing required environment variable: $name"
    exit 1
  fi
}

call() {
  local addr="$1"
  local sig="$2"
  shift 2
  "$CAST_BIN" call "$addr" "$sig" "$@" --rpc-url "$RPC_URL"
}

nonzero() {
  local value="$1"
  if [ -z "$value" ] || [ "$value" = "0x0000000000000000000000000000000000000000" ]; then
    return 1
  fi
  return 0
}

if [ "$MODE" = "mainnet-fork" ]; then
  RPC_URL="${RPC_URL:-${DASHBOARD_MAINNET_RPC:-}}"
  TEST_SETUP_JSON="${TEST_SETUP_JSON:-$STAPLE_DIR/deployments/260424-address-provider-test-01/test-setup/test-setup.json}"
  require_env "$RPC_URL" 'RPC_URL or DASHBOARD_MAINNET_RPC'
  require_env "$STAPLE_DIR" 'STAPLE_REPO_ROOT'
  ADDRESS_PROVIDER="${ADDRESS_PROVIDER:-$($JQ_BIN -r '.addressProvider' "$TEST_SETUP_JSON" | xargs)}"
  JR_FACTORY="${JR_FACTORY:-0x90E44EB7AB62f980a50AE5E405374b0FdAF55C9f}"

  echo "Validate dashboard ABI reads on mainnet-fork local chain"
  echo "  RPC_URL          $RPC_URL"
  echo "  ADDRESS_PROVIDER $ADDRESS_PROVIDER"
  echo "  JR_FACTORY       $JR_FACTORY"

  controller="$(call "$ADDRESS_PROVIDER" 'controller()(address)')"
  router="$(call "$ADDRESS_PROVIDER" 'router()(address)')"
  price_provider="$(call "$ADDRESS_PROVIDER" 'priceProvider()(address)')"
  ui_pool="$(call "$ADDRESS_PROVIDER" 'uiPoolDataProvider()(address)')"
  test_factory="$(call "$ADDRESS_PROVIDER" 'stapleTestERC20Factory()(address)')"
  test_weth="$(call "$ADDRESS_PROVIDER" 'testWeth()(address)')"

  nonzero "$controller" && log "AddressProvider.controller -> $controller"
  nonzero "$router" && log "AddressProvider.router -> $router"
  nonzero "$price_provider" && log "AddressProvider.priceProvider -> $price_provider"
  nonzero "$ui_pool" && log "AddressProvider.uiPoolDataProvider -> $ui_pool"
  nonzero "$test_factory" && log "AddressProvider.stapleTestERC20Factory -> $test_factory"
  nonzero "$test_weth" && log "AddressProvider.testWeth -> $test_weth"

  ui_controller="$(call "$ui_pool" 'controller()(address)')"
  ui_incentives="$(call "$ui_pool" 'incentivesController()(address)')"
  nonzero "$ui_controller" && log "UIPoolDataProvider.controller -> $ui_controller"
  nonzero "$ui_incentives" && log "UIPoolDataProvider.incentivesController -> $ui_incentives"

  supported_tokens="$(call "$test_factory" 'supportedTokens()(address[])')"
  log "StapleTestERC20Factory.supportedTokens -> $supported_tokens"

  jr_tokens="$(call "$JR_FACTORY" 'getSupportedJrTokens()(address[])')"
  log "JrTokenOracleFactory.getSupportedJrTokens -> $jr_tokens"

  first_jr="$(printf '%s' "$jr_tokens" | grep -Eo '0x[0-9a-fA-F]{40}' | head -n1 || true)"
  if nonzero "$first_jr"; then
    oracle="$(call "$JR_FACTORY" 'getOracle(address)(address)' "$first_jr")"
    nonzero "$oracle" && log "JrTokenOracleFactory.getOracle(firstJR) -> $oracle"
    log "JrTokenOracle.getConfig -> $(call "$oracle" 'getConfig()((address,address,address,address,address,address,uint24,uint24,address,(uint64,uint24,address,uint24,uint24)))')"
    log "JrTokenOracle.getJrTokenConfig -> $(call "$oracle" 'getJrTokenConfig(address)((uint8,int24,uint8,bool,uint256,(uint64,uint24,address,uint24,uint24)))' "$first_jr")"
    log "JrTokenOracle.getSlippage -> $(call "$oracle" 'getSlippage()(uint24)')"
    log "JrTokenOracle.getBorrowRate -> $(call "$oracle" 'getBorrowRate(address)(uint24)' "$first_jr")"
    log "JrTokenOracle.getSpotPrice -> $(call "$oracle" 'getSpotPrice(address)(uint256)' "$first_jr")"
    if call "$oracle" 'getExitPrice(address,uint8)(uint256)' "$first_jr" 2 >/dev/null 2>&1; then
      log "JrTokenOracle.getExitPrice(type=2) -> $(call "$oracle" 'getExitPrice(address,uint8)(uint256)' "$first_jr" 2)"
    else
      log "JrTokenOracle.getExitPrice(type=1) -> $(call "$oracle" 'getExitPrice(address,uint8)(uint256)' "$first_jr" 1)"
    fi
  else
    echo "  ! Could not derive first JR token from factory response"
  fi

  echo "Done."
  exit 0
fi

if [ "$MODE" = "sepolia" ]; then
  RPC_URL="${RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
  CORE_JSON="${CORE_JSON:-$STAPLE_DIR/deployments/260424-sepolia-01/core/core.json}"

  controller="${CONTROLLER:-$($JQ_BIN -r '.controller' "$CORE_JSON" | xargs)}"
  router="${ROUTER:-$($JQ_BIN -r '.router' "$CORE_JSON" | xargs)}"
  price_provider="${PRICE_PROVIDER:-$($JQ_BIN -r '.priceProvider' "$CORE_JSON" | xargs)}"
  ui_pool="${UI_POOL_DATA_PROVIDER:-$($JQ_BIN -r '.uiPoolDataProvider' "$CORE_JSON" | xargs)}"
  oracle_staple="${ORACLE_STAPLE:-$($JQ_BIN -r '.oracleVerifierStaple' "$CORE_JSON" | xargs)}"
  oracle_cldf="${ORACLE_CLDF:-$($JQ_BIN -r '.oracleVerifierChainlinkDataFeed' "$CORE_JSON" | xargs)}"
  oracle_stream="${ORACLE_STREAM:-$($JQ_BIN -r '.oracleVerifierChainlinkStreamV3V8' "$CORE_JSON" | xargs)}"
  oracle_redstone="${ORACLE_REDSTONE:-$($JQ_BIN -r '.oracleVerifierRedstone' "$CORE_JSON" | xargs)}"

  echo "Validate dashboard ABI reads on Sepolia"
  echo "  RPC_URL      $RPC_URL"
  echo "  CONTROLLER   $controller"
  echo "  ROUTER       $router"
  echo "  PRICEPROV    $price_provider"
  echo "  UIPOOL       $ui_pool"

  log "Controller.priceProvider -> $(call "$controller" 'priceProvider()(address)')"
  log "Controller.incentivesController -> $(call "$controller" 'incentivesController()(address)')"
  log "Router.controller -> $(call "$router" 'controller()(address)')"
  log "Router.priceProvider -> $(call "$router" 'priceProvider()(address)')"
  log "UIPoolDataProvider.controller -> $(call "$ui_pool" 'controller()(address)')"
  log "UIPoolDataProvider.incentivesController -> $(call "$ui_pool" 'incentivesController()(address)')"
  log "OracleVerifierStaple.oracleType -> $(call "$oracle_staple" 'oracleType()(string)')"
  log "OracleVerifierChainlinkDataFeed.oracleType -> $(call "$oracle_cldf" 'oracleType()(string)')"
  log "OracleVerifierChainlinkStreamV3V8.oracleType -> $(call "$oracle_stream" 'oracleType()(string)')"
  log "OracleVerifierRedstone.oracleType -> $(call "$oracle_redstone" 'oracleType()(string)')"

  echo "Done."
  exit 0
fi

echo "Unknown mode: $MODE"
exit 1
