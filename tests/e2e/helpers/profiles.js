const fs = require('fs');
const path = require('path');

const dashboardRoot = path.resolve(__dirname, '..', '..', '..');
const stapleRoot = path.resolve(process.env.STAPLE_REPO_ROOT || path.join(dashboardRoot, '..', 'staple'));
const MAINNET_RPC = String(process.env.DASHBOARD_MAINNET_RPC || '').trim();
const SEPOLIA_RPC = String(process.env.DASHBOARD_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com').trim();
const DEFAULT_JR_PRICING_FACTORY = String(process.env.DASHBOARD_JR_PRICING_FACTORY || '0x1000000000000000000000000000000000000001').trim();

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function mainnetForkArtifactInfo() {
  const deployVersion = process.env.DASHBOARD_STAPLE_DEPLOY_VERSION || '260427-sepolia-1';
  const testSetupPath = path.join(stapleRoot, 'deployments', deployVersion, 'test-setup', 'test-setup.json');
  return { deployVersion, testSetupPath };
}

function sepoliaArtifactInfo() {
  const deployVersion = process.env.DASHBOARD_SEPOLIA_DEPLOY_VERSION || '260428-sepolia-01';
  const productionSupportPath = path.join(stapleRoot, 'deployments', deployVersion, 'production-support', 'production-support.json');
  const testSupportPath = path.join(stapleRoot, 'deployments', deployVersion, 'test-support', 'test-support.json');
  return { deployVersion, productionSupportPath, testSupportPath };
}

function hasMainnetForkArtifacts() {
  const { testSetupPath } = mainnetForkArtifactInfo();
  return fs.existsSync(testSetupPath);
}

function hasSepoliaArtifacts() {
  const { productionSupportPath, testSupportPath } = sepoliaArtifactInfo();
  return fs.existsSync(productionSupportPath) && fs.existsSync(testSupportPath);
}

function mainnetForkArtifacts() {
  const { deployVersion, testSetupPath } = mainnetForkArtifactInfo();
  if (!fs.existsSync(testSetupPath)) {
    throw new Error(`Missing mainnet-fork test setup JSON: ${testSetupPath}`);
  }
  return { deployVersion, testSetupPath, testSetup: readJson(testSetupPath) };
}

function sepoliaArtifacts() {
  const { deployVersion, productionSupportPath, testSupportPath } = sepoliaArtifactInfo();
  if (!fs.existsSync(productionSupportPath)) {
    throw new Error(`Missing sepolia production-support JSON: ${productionSupportPath}`);
  }
  if (!fs.existsSync(testSupportPath)) {
    throw new Error(`Missing sepolia test-support JSON: ${testSupportPath}`);
  }
  return {
    deployVersion,
    productionSupportPath,
    testSupportPath,
    productionSupport: readJson(productionSupportPath),
    testSupport: readJson(testSupportPath)
  };
}

function buildRpcList() {
  const list = [];
  if (MAINNET_RPC) {
    list.push({ id: 'mainnet-fork', name: 'Mainnet Fork', url: MAINNET_RPC });
  }
  list.push({ id: 'sepolia', name: 'Sepolia PublicNode', url: SEPOLIA_RPC });
  return list;
}

function buildEnvironmentConfig(profileKey) {
  if (profileKey === 'mainnet-fork') {
    const { deployVersion, testSetup } = mainnetForkArtifacts();
    return {
      name: 'Mainnet Fork',
      sections: {
        bondify: { mode: 'fixed', addresses: {} },
        staple: {
          mode: 'address-provider',
          addresses: {},
          versions: [
            {
              id: 'mainnet-fork-version',
              label: deployVersion,
              version: deployVersion,
              addressProvider: testSetup.addressProvider,
              jrPricingFactory: DEFAULT_JR_PRICING_FACTORY
            }
          ],
          selectedVersionId: 'mainnet-fork-version'
        }
      }
    };
  }

  if (hasSepoliaArtifacts()) {
    const { deployVersion, testSupport } = sepoliaArtifacts();
    return {
      name: 'Sepolia',
      sections: {
        bondify: { mode: 'fixed', addresses: {} },
        staple: {
          mode: 'address-provider',
          addresses: {},
          versions: [
            {
              id: 'sepolia-version',
              label: deployVersion,
              version: deployVersion,
              addressProvider: testSupport.addressProvider,
              jrPricingFactory: DEFAULT_JR_PRICING_FACTORY
            }
          ],
          selectedVersionId: 'sepolia-version'
        }
      }
    };
  }

  return {
    name: 'Sepolia',
    sections: {
      bondify: { mode: 'fixed', addresses: {} },
      staple: {
        mode: 'address-provider',
        addresses: {},
        versions: [],
        selectedVersionId: ''
      }
    }
  };
}

function buildLocalStoragePayload(selectedIndex, options = {}) {
  const rpcList = buildRpcList();
  const safeIndex = Math.min(Math.max(Number(selectedIndex) || 0, 0), Math.max(rpcList.length - 1, 0));
  const profileKey = rpcList[safeIndex]?.id || 'sepolia';
  const selectedRpcIndex = rpcList[safeIndex] ? safeIndex : 0;
  const config = buildEnvironmentConfig(profileKey);
  const userAddress = options.userAddress || '';
  const userList = userAddress
    ? [{ address: userAddress, nickname: 'Playwright User' }]
    : [];
  const selectedUser = userAddress || '';

  return {
    staple_env_rpc_v6: JSON.stringify({ list: rpcList, selectedIndex: selectedRpcIndex }),
    staple_env_config_v7: JSON.stringify(config),
    staple_env_discovery_v6: JSON.stringify({}),
    staple_env_access_v2: JSON.stringify({}),
    staple_env_user_v2: JSON.stringify({ userList, selectedUser })
  };
}

async function seedProfile(page, selectedIndex, options = {}) {
  const storage = buildLocalStoragePayload(selectedIndex, options);
  await page.addInitScript((payload) => {
    for (const [key, value] of Object.entries(payload)) {
      window.localStorage.setItem(key, value);
    }
  }, storage);
}

module.exports = {
  dashboardRoot,
  MAINNET_RPC,
  SEPOLIA_RPC,
  hasMainnetForkArtifacts,
  hasSepoliaArtifacts,
  mainnetForkArtifacts,
  sepoliaArtifacts,
  buildRpcList,
  seedProfile
};
