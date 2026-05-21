const stapleRouterAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "useNative",
        "type": "bool"
      }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint32[]",
        "name": "path",
        "type": "uint32[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "receiveNative",
        "type": "bool"
      }
    ],
    "name": "Withdraw",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "poolID",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "depositAmount",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint32",
                "name": "vtpID",
                "type": "uint32"
              },
              {
                "internalType": "uint256",
                "name": "targetAllocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxFeeRate",
                "type": "uint256"
              }
            ],
            "internalType": "struct DataTypes.AdjustPositionVtpTokenInput[]",
            "name": "vtpTokens",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct DataTypes.AdjustPositionInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "verifyData",
        "type": "bytes"
      }
    ],
    "name": "adjustPosition",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxFeeRate",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "verifyData",
        "type": "bytes"
      }
    ],
    "name": "allocate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32[]",
        "name": "vtpIDs",
        "type": "uint32[]"
      },
      {
        "internalType": "uint256[]",
        "name": "maxFeeRates",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "verifyData",
        "type": "bytes"
      }
    ],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "controller",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxFeeRate",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "verifyData",
        "type": "bytes"
      }
    ],
    "name": "deallocate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "useNative",
        "type": "bool"
      }
    ],
    "name": "deposit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "nativeAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "wrappedNativeAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "controller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "priceProvider",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "priceProvider",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "deadline",
            "type": "uint32"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint32[]",
            "name": "path",
            "type": "uint32[]"
          },
          {
            "internalType": "uint256",
            "name": "amountIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amountOutMin",
            "type": "uint256"
          }
        ],
        "internalType": "struct DataTypes.SwapInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "verifyData",
        "type": "bytes"
      }
    ],
    "name": "swap",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "receiveNative",
        "type": "bool"
      }
    ],
    "name": "withdraw",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

