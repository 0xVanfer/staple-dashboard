async function rpcCall(url, method, params = []) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status} for ${method} @ ${url}`);
  }
  const json = await response.json();
  if (json.error) {
    throw new Error(`RPC ${method} failed @ ${url}: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}

async function assertRpcReady(url, expectedChainIdHex) {
  const chainId = await rpcCall(url, 'eth_chainId');
  if (expectedChainIdHex && String(chainId).toLowerCase() !== String(expectedChainIdHex).toLowerCase()) {
    throw new Error(`Unexpected chain id for ${url}: ${chainId}, expected ${expectedChainIdHex}`);
  }
}

async function assertCodeExists(url, address) {
  const code = await rpcCall(url, 'eth_getCode', [address, 'latest']);
  if (!code || code === '0x') {
    throw new Error(`No code at ${address} on ${url}`);
  }
}

module.exports = {
  rpcCall,
  assertRpcReady,
  assertCodeExists
};
