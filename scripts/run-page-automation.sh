#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_STAPLE_DIR="$(cd "$ROOT_DIR/../staple" 2>/dev/null && pwd || true)"
STAPLE_DIR="${STAPLE_REPO_ROOT:-$DEFAULT_STAPLE_DIR}"
FORGE_BIN="${FORGE_BIN:-$HOME/.foundry/bin/forge}"
ANVIL_BIN="${ANVIL_BIN:-$HOME/.foundry/bin/anvil}"
NPM_BIN="${NPM_BIN:-$(command -v npm || true)}"
CURL_BIN="${CURL_BIN:-$(command -v curl || true)}"

MODE="${1:-all}"
MAINNET_BASE_RPC="${DASHBOARD_MAINNET_BASE_RPC:-}"
MAINNET_DASHBOARD_PORT="${DASHBOARD_MAINNET_PORT:-}"
MAINNET_DASHBOARD_RPC="${DASHBOARD_MAINNET_RPC:-}"
SEPOLIA_RPC="${DASHBOARD_SEPOLIA_RPC:-https://ethereum-sepolia-rpc.publicnode.com}"
DEPLOY_VERSION="${DASHBOARD_STAPLE_DEPLOY_VERSION:-playwright-mainnet-fork-01}"
LOG_DIR="$ROOT_DIR/.e2e-logs"
ANVIL_LOG=""
ANVIL_PID=""

mkdir -p "$LOG_DIR"

log() {
  printf '  ✓ %s\n' "$1"
}

info() {
  printf '  → %s\n' "$1"
}

err() {
  printf '  ✗ %s\n' "$1" >&2
}

cleanup() {
  if [ -n "$ANVIL_PID" ] && kill -0 "$ANVIL_PID" 2>/dev/null; then
    kill "$ANVIL_PID" 2>/dev/null || true
    wait "$ANVIL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

require_bin() {
  local path="$1"
  local name="$2"
  if [ -z "$path" ] || [ ! -x "$path" ]; then
    err "$name not found: $path"
    exit 1
  fi
}

require_cmd() {
  local path="$1"
  local name="$2"
  if [ -z "$path" ]; then
    err "$name not found"
    exit 1
  fi
}

require_env() {
  local value="$1"
  local name="$2"
  if [ -z "$value" ]; then
    err "Missing required environment variable: $name"
    exit 1
  fi
}

pick_free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
}

rpc_call() {
  local url="$1"
  local method="$2"
  local params="${3:-[]}"
  "$CURL_BIN" -sS -H 'content-type: application/json' --data "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}" "$url"
}

wait_rpc() {
  local url="$1"
  local expected_chain="${2:-}"
  local attempts="${3:-30}"
  local i result chain
  for i in $(seq 1 "$attempts"); do
    if result="$(rpc_call "$url" eth_chainId 2>/dev/null || true)"; then
      chain="$(printf '%s' "$result" | jq -r '.result // empty' 2>/dev/null || true)"
      if [ -n "$chain" ]; then
        if [ -z "$expected_chain" ] || [ "${chain,,}" = "${expected_chain,,}" ]; then
          return 0
        fi
      fi
    fi
    sleep 2
  done
  return 1
}

ensure_node_modules() {
  if [ ! -d "$ROOT_DIR/node_modules/@playwright" ]; then
    info 'Installing Playwright test dependency ...'
    (cd "$ROOT_DIR" && "$NPM_BIN" install --no-fund --no-audit)
    log 'Playwright dependency installed'
  fi
}

run_mainnet_fork_tests() {
  require_env "$STAPLE_DIR" 'STAPLE_REPO_ROOT'
  require_env "$MAINNET_BASE_RPC" 'DASHBOARD_MAINNET_BASE_RPC'

  if [ -z "$MAINNET_DASHBOARD_PORT" ]; then
    MAINNET_DASHBOARD_PORT="$(pick_free_port)"
  fi
  if [ -z "$MAINNET_DASHBOARD_RPC" ]; then
    MAINNET_DASHBOARD_RPC="http://127.0.0.1:${MAINNET_DASHBOARD_PORT}"
  fi
  ANVIL_LOG="$LOG_DIR/mainnet-fork-${MAINNET_DASHBOARD_PORT}.log"

  info "Checking mainnet-fork base RPC on $MAINNET_BASE_RPC ..."
  if ! wait_rpc "$MAINNET_BASE_RPC" 0x1 10; then
    err "Mainnet-fork base RPC is not ready: $MAINNET_BASE_RPC"
    exit 1
  fi
  log 'Mainnet-fork base RPC is ready'

  info "Starting temporary Staple fork RPC on ${MAINNET_DASHBOARD_PORT} ..."
  "$ANVIL_BIN" --fork-url "$MAINNET_BASE_RPC" --port "$MAINNET_DASHBOARD_PORT" --chain-id 1 > "$ANVIL_LOG" 2>&1 &
  ANVIL_PID=$!

  if ! wait_rpc "$MAINNET_DASHBOARD_RPC" 0x1 20; then
    err "Temporary Staple fork RPC failed to start on ${MAINNET_DASHBOARD_PORT}"
    err "See log: $ANVIL_LOG"
    exit 1
  fi
  log 'Temporary Staple fork RPC is ready'

  info "Deploying Staple core + test setup to the temporary ${MAINNET_DASHBOARD_PORT} fork ..."
  (
    cd "$STAPLE_DIR"
    CURRENT_RPC="$MAINNET_DASHBOARD_RPC" \
    IS_PROD=false \
    IS_LOCAL=false \
    DEPLOY_VERSION="$DEPLOY_VERSION" \
    CHAIN_ID=1 \
    CHAIN_WNATIVE=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 \
    CHAIN_CHAINLINK_ETH_FEED=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 \
    CHAIN_CHAINLINK_STREAM_VERIFIER=0x0000000000000000000000000000000000000000 \
    bash ./run_deploy_env.sh
  )
  log "Staple deployment finished (version: $DEPLOY_VERSION)"

  info 'Running Playwright mainnet-fork spec ...'
  (
    cd "$ROOT_DIR"
    DASHBOARD_MAINNET_RPC="$MAINNET_DASHBOARD_RPC" \
    DASHBOARD_STAPLE_DEPLOY_VERSION="$DEPLOY_VERSION" \
    "$NPM_BIN" run test:e2e:mainnet-fork
  )
  log 'Mainnet-fork page automation passed'
}

run_sepolia_tests() {
  info "Checking sepolia RPC on $SEPOLIA_RPC ..."
  if ! wait_rpc "$SEPOLIA_RPC" 0xaa36a7 10; then
    err "Sepolia RPC is not ready: $SEPOLIA_RPC"
    exit 1
  fi
  log 'Sepolia RPC is ready'

  info 'Running Playwright sepolia spec ...'
  (
    cd "$ROOT_DIR"
    DASHBOARD_SEPOLIA_RPC="$SEPOLIA_RPC" \
    "$NPM_BIN" run test:e2e:sepolia
  )
  log 'Sepolia page automation passed'
}

require_bin "$FORGE_BIN" 'forge'
require_bin "$ANVIL_BIN" 'anvil'
require_cmd "$NPM_BIN" 'npm'
require_cmd "$CURL_BIN" 'curl'
require_cmd "$(command -v jq || true)" 'jq'

ensure_node_modules

case "$MODE" in
  mainnet-fork)
    run_mainnet_fork_tests
    ;;
  sepolia)
    run_sepolia_tests
    ;;
  all)
    run_mainnet_fork_tests
    run_sepolia_tests
    ;;
  *)
    err "Unknown mode: $MODE"
    echo 'Usage: scripts/run-page-automation.sh <mainnet-fork|sepolia|all>' >&2
    exit 1
    ;;
esac
