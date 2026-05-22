import { Buffer } from 'buffer';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import AppEth from '@ledgerhq/hw-app-eth';

globalThis.Buffer = globalThis.Buffer || Buffer;

const DEFAULT_PATH = "m/44'/60'/0'/0/0";
const LOCKED_ERROR_IDS = new Set(['TransportLocked']);

function getEthersLib() {
  const ethersLib = window.ethers;
  if (!ethersLib?.Signer || !ethersLib?.utils) {
    throw new Error('ethers runtime is not available for Ledger Direct.');
  }
  return ethersLib;
}

function ensureHex(value) {
  const text = String(value || '');
  if (!text) return '0x';
  return text.startsWith('0x') ? text : `0x${text}`;
}

function normalizeLedgerV(ethersLib, value) {
  if (typeof value === 'number') return value;
  const text = String(value || '');
  if (!text) return 0;
  return text.startsWith('0x')
    ? ethersLib.BigNumber.from(text).toNumber()
    : ethersLib.BigNumber.from(`0x${text}`).toNumber();
}

function buildUnsignedTransaction(ethersLib, tx) {
  const baseTx = {};
  const assign = (key, value) => {
    if (value !== undefined && value !== null) baseTx[key] = value;
  };

  assign('type', tx.type);
  assign('chainId', tx.chainId);
  assign('to', tx.to || undefined);
  assign('nonce', tx.nonce != null ? ethersLib.BigNumber.from(tx.nonce).toNumber() : undefined);
  assign('gasLimit', tx.gasLimit);
  assign('gasPrice', tx.gasPrice);
  assign('maxFeePerGas', tx.maxFeePerGas);
  assign('maxPriorityFeePerGas', tx.maxPriorityFeePerGas);
  assign('data', tx.data || undefined);
  assign('value', tx.value);
  assign('accessList', tx.accessList || undefined);

  return baseTx;
}

function normalizeLedgerError(error) {
  const message = String(error?.message || error || '');
  if (/HIDNotSupported|navigator\.hid is not supported/i.test(message)) {
    return new Error('Ledger direct connection requires WebHID in a secure context (Chrome/Edge over https:// or localhost).');
  }
  if (/denied|cancelled|canceled|not selected|no device selected|access denied/i.test(message)) {
    return new Error('Ledger device selection was cancelled. Please choose the connected Ledger in the browser prompt to continue.');
  }
  if (/locked/i.test(message)) {
    return new Error('Ledger transport is busy or locked by another app/window. Close the other Ledger session and retry.');
  }
  if (/0x6e00|0x6511|app does not seem to be open|cla_not_supported/i.test(message)) {
    return new Error('Ledger Ethereum app is not open. Unlock the device, open the Ethereum app, and retry.');
  }
  return error instanceof Error ? error : new Error(message || 'Ledger direct connection failed.');
}

let LedgerDirectSignerClass = null;

function getLedgerDirectSignerClass() {
  if (LedgerDirectSignerClass) return LedgerDirectSignerClass;
  const ethersLib = getEthersLib();

  LedgerDirectSignerClass = class LedgerDirectSigner extends ethersLib.Signer {
    constructor({ provider, path = DEFAULT_PATH, transport, eth, deviceLabel = '' } = {}) {
      super();
      this.path = path;
      this.provider = provider || null;
      this.transport = transport;
      this.eth = eth;
      this.deviceLabel = deviceLabel;
    }

    async _retry(callback, timeoutMs = 0) {
      let timeoutId = null;
      try {
        if (timeoutMs > 0) {
          await Promise.race([
            (async () => {
              for (let i = 0; i < 50; i += 1) {
                try {
                  return await callback(this.eth);
                } catch (error) {
                  if (!LOCKED_ERROR_IDS.has(String(error?.id || ''))) {
                    throw error;
                  }
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
              throw new Error('timeout');
            })(),
            new Promise((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
            })
          ]);
        }

        for (let i = 0; i < 50; i += 1) {
          try {
            return await callback(this.eth);
          } catch (error) {
            if (!LOCKED_ERROR_IDS.has(String(error?.id || ''))) {
              throw error;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('timeout');
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    async getAddress() {
      const account = await this._retry((eth) => eth.getAddress(this.path, false, false), 5000);
      return getEthersLib().utils.getAddress(account.address);
    }

    async signMessage(message) {
      const ethersRuntime = getEthersLib();
      const bytes = typeof message === 'string' ? ethersRuntime.utils.toUtf8Bytes(message) : message;
      const messageHex = ethersRuntime.utils.hexlify(bytes).slice(2);
      const sig = await this._retry((eth) => eth.signPersonalMessage(this.path, messageHex), 60000);
      return ethersRuntime.utils.joinSignature({
        r: ensureHex(sig.r),
        s: ensureHex(sig.s),
        v: typeof sig.v === 'number' ? sig.v : Number(sig.v)
      });
    }

    async signTransaction(transaction) {
      const ethersRuntime = getEthersLib();
      const resolvedTx = await ethersRuntime.utils.resolveProperties(transaction || {});
      const unsignedTx = buildUnsignedTransaction(ethersRuntime, resolvedTx);
      const serializedUnsigned = ethersRuntime.utils.serializeTransaction(unsignedTx).slice(2);
      const sig = await this._retry((eth) => eth.signTransaction(this.path, serializedUnsigned, null), 60000);
      return ethersRuntime.utils.serializeTransaction(unsignedTx, {
        v: normalizeLedgerV(ethersRuntime, sig.v),
        r: ensureHex(sig.r),
        s: ensureHex(sig.s)
      });
    }

    async sendTransaction(transaction) {
      if (!this.provider?.sendTransaction) {
        throw new Error('Ledger signer requires an RPC provider before it can send transactions.');
      }
      const populated = await this.populateTransaction(transaction || {});
      const signed = await this.signTransaction(populated);
      return this.provider.sendTransaction(signed);
    }

    async populateTransaction(transaction) {
      const ethersRuntime = getEthersLib();
      if (!this.provider) {
        throw new Error('Ledger signer requires an RPC provider before it can populate transactions.');
      }

      const tx = { ...(transaction || {}) };
      const from = await this.getAddress();
      if (tx.from == null) {
        tx.from = from;
      } else if (ethersRuntime.utils.getAddress(tx.from) !== from) {
        throw new Error('Ledger signer transaction from mismatch.');
      }

      if (tx.nonce == null && this.provider.getTransactionCount) {
        tx.nonce = await this.provider.getTransactionCount(from, 'pending');
      }

      if (tx.chainId == null && this.provider.getNetwork) {
        const network = await this.provider.getNetwork();
        tx.chainId = Number(network?.chainId || 0) || 0;
      }

      if (tx.gasLimit == null && this.provider.estimateGas) {
        try {
          tx.gasLimit = await this.provider.estimateGas({ ...tx, from });
        } catch (_) {}
      }

      const feeData = this.provider.getFeeData ? await this.provider.getFeeData() : null;
      const inferredType = tx.type != null
        ? Number(tx.type)
        : (feeData?.maxFeePerGas != null && feeData?.maxPriorityFeePerGas != null ? 2 : 0);

      tx.type = inferredType;
      if (inferredType === 2) {
        if (tx.maxFeePerGas == null && feeData?.maxFeePerGas != null) tx.maxFeePerGas = feeData.maxFeePerGas;
        if (tx.maxPriorityFeePerGas == null && feeData?.maxPriorityFeePerGas != null) tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        delete tx.gasPrice;
      } else if (tx.gasPrice == null && feeData?.gasPrice != null) {
        tx.gasPrice = feeData.gasPrice;
      }

      return tx;
    }

    connect(provider) {
      return new LedgerDirectSignerClass({
        provider,
        path: this.path,
        transport: this.transport,
        eth: this.eth,
        deviceLabel: this.deviceLabel
      });
    }
  };

  return LedgerDirectSignerClass;
}

async function isSupported() {
  try {
    return !!(await TransportWebHID.isSupported());
  } catch (_) {
    return false;
  }
}

async function listAuthorizedDevices() {
  try {
    const devices = await TransportWebHID.list();
    return (devices || []).map((device) => ({
      productName: String(device?.productName || 'Ledger device'),
      vendorId: Number(device?.vendorId || 0),
      productId: Number(device?.productId || 0),
      opened: !!device?.opened
    }));
  } catch (_) {
    return [];
  }
}

async function hasAuthorizedDevice() {
  const devices = await listAuthorizedDevices();
  return devices.length > 0;
}

async function openTransport({ silent = false } = {}) {
  const existing = await TransportWebHID.openConnected();
  if (existing) return existing;
  if (silent) return null;
  return TransportWebHID.request();
}

async function createSigner({ provider, path = DEFAULT_PATH, silent = false } = {}) {
  if (!provider) {
    throw new Error('Ledger direct signer requires an RPC provider.');
  }

  let transport = null;
  try {
    transport = await openTransport({ silent });
    if (!transport) {
      throw new Error('No authorized Ledger device is currently available for this site. Click Connect Wallet again to choose the device in the browser prompt.');
    }

    const eth = new AppEth(transport);
    await eth.getAppConfiguration();
    const account = await eth.getAddress(path, !silent, false, null);
    const SignerClass = getLedgerDirectSignerClass();
    const signer = new SignerClass({
      provider,
      path,
      transport,
      eth,
      deviceLabel: String(transport?.device?.productName || 'Ledger device')
    });

    return {
      signer,
      cleanup: async () => {
        try {
          await transport.close();
        } catch (_) {}
      },
      deviceLabel: String(transport?.device?.productName || 'Ledger device'),
      address: account?.address || ''
    };
  } catch (error) {
    try {
      await transport?.close?.();
    } catch (_) {}
    throw normalizeLedgerError(error);
  }
}

window.StapleLedgerDirect = {
  DEFAULT_PATH,
  isSupported,
  hasAuthorizedDevice,
  listAuthorizedDevices,
  createSigner
};
