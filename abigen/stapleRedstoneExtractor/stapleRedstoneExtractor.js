const stapleRedstoneExtractorAbi = [
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "feedId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "redstonePayload",
        "type": "bytes"
      }
    ],
    "name": "extractPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "feedIds",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes",
        "name": "redstonePayload",
        "type": "bytes"
      }
    ],
    "name": "extractPrices",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "signerAddress",
        "type": "address"
      }
    ],
    "name": "getAuthorisedSignerIndex",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDataServiceId",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUniqueSignersThreshold",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

