const stapleControllerAbi = [
  {
    "inputs": [],
    "name": "AccessControlBadConfirmation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "neededRole",
        "type": "bytes32"
      }
    ],
    "name": "AccessControlUnauthorizedAccount",
    "type": "error"
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unchargedFee",
        "type": "uint256"
      }
    ],
    "name": "Allocate",
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
        "indexed": false,
        "internalType": "uint32[]",
        "name": "vtpIDs",
        "type": "uint32[]"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ClaimProtocolFee",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "poolImpl",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "poolAddr",
        "type": "address"
      }
    ],
    "name": "CreatePool",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "poolIDA",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "poolIDB",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "n",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "p",
        "type": "uint16"
      }
    ],
    "name": "CreateVtp",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "claimed",
        "type": "uint256"
      }
    ],
    "name": "Deallocate",
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
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
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
      }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "guardian",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      }
    ],
    "name": "PausePool",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Paused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "from",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "to",
        "type": "uint16"
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
        "indexed": false,
        "internalType": "address",
        "name": "admin",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      }
    ],
    "name": "UnpausePool",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Unpaused",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "newBound",
        "type": "uint16"
      }
    ],
    "name": "UpdateAlrLowerBound",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "newRate",
        "type": "uint16"
      }
    ],
    "name": "UpdateMaxAllocateRate",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "newStatus",
        "type": "bool"
      }
    ],
    "name": "UpdatePauseStatus",
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
        "indexed": false,
        "internalType": "uint8",
        "name": "newRiskLevel",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint32[]",
        "name": "vtps",
        "type": "uint32[]"
      }
    ],
    "name": "UpdatePoolRiskLevel",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "creditLimit",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32[]",
        "name": "credits",
        "type": "uint32[]"
      }
    ],
    "name": "UpdateRiskInfo",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint24",
        "name": "newIn",
        "type": "uint24"
      },
      {
        "indexed": false,
        "internalType": "uint24",
        "name": "newOut",
        "type": "uint24"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "newProtocolFeeRate",
        "type": "uint16"
      }
    ],
    "name": "UpdateSwapFee",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newDiscount",
        "type": "uint256"
      }
    ],
    "name": "UpdateSwapFeeDiscount",
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
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
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
      }
    ],
    "name": "Withdraw",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "VERSION",
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
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
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
          }
        ],
        "internalType": "struct DataTypes.AllocateInput",
        "name": "input",
        "type": "tuple"
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
        "name": "vtpsToClaim",
        "type": "uint32[]"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "claimProtocolFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "riskLevel",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "poolImpl",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "createPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "n",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "p",
            "type": "uint16"
          },
          {
            "components": [
              {
                "internalType": "uint16",
                "name": "poolID",
                "type": "uint16"
              },
              {
                "internalType": "uint24",
                "name": "swapFeeIn",
                "type": "uint24"
              },
              {
                "internalType": "uint24",
                "name": "swapFeeOut",
                "type": "uint24"
              },
              {
                "internalType": "uint16",
                "name": "protocolFeeRate",
                "type": "uint16"
              },
              {
                "internalType": "uint16",
                "name": "maxAllocateRate",
                "type": "uint16"
              },
              {
                "internalType": "uint16",
                "name": "alrLowerBound",
                "type": "uint16"
              }
            ],
            "internalType": "struct DataTypes.CreateVtpTokenInput",
            "name": "tokenAInput",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint16",
                "name": "poolID",
                "type": "uint16"
              },
              {
                "internalType": "uint24",
                "name": "swapFeeIn",
                "type": "uint24"
              },
              {
                "internalType": "uint24",
                "name": "swapFeeOut",
                "type": "uint24"
              },
              {
                "internalType": "uint16",
                "name": "protocolFeeRate",
                "type": "uint16"
              },
              {
                "internalType": "uint16",
                "name": "maxAllocateRate",
                "type": "uint16"
              },
              {
                "internalType": "uint16",
                "name": "alrLowerBound",
                "type": "uint16"
              }
            ],
            "internalType": "struct DataTypes.CreateVtpTokenInput",
            "name": "tokenBInput",
            "type": "tuple"
          }
        ],
        "internalType": "struct DataTypes.CreateVtpInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "createVtp",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
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
          }
        ],
        "internalType": "struct DataTypes.AllocateInput",
        "name": "input",
        "type": "tuple"
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
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
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
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
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
          }
        ],
        "internalType": "struct DataTypes.AllocateInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "estimateAllocateFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
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
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
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
          }
        ],
        "internalType": "struct DataTypes.AllocateInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "estimateDeallocateFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "fee",
        "type": "uint256"
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
            "internalType": "uint32",
            "name": "vtpID",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "poolIDIn",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "amountIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "feeDiscount",
            "type": "uint256"
          }
        ],
        "internalType": "struct DataTypes.SwapSingleInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "estimateSwap",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "amountIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "feeIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "realIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pav",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "swapGet",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "feeOut",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "estiOut",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "punishment",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isPunishment",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "realOut",
            "type": "uint256"
          }
        ],
        "internalType": "struct DataTypes.SwapSingleProcess",
        "name": "process",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "getAssetRelatedPools",
    "outputs": [
      {
        "internalType": "uint16[]",
        "name": "",
        "type": "uint16[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCreditsInfo",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "totalLimit",
        "type": "uint32"
      },
      {
        "internalType": "uint32[]",
        "name": "creditList",
        "type": "uint32[]"
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
      }
    ],
    "name": "getPoolParams",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "id",
            "type": "uint16"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "riskLevel",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "asset",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "lpAddr",
            "type": "address"
          }
        ],
        "internalType": "struct DataTypes.PoolParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getRoleMember",
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
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleMemberCount",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "getVtp",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
              },
              {
                "internalType": "uint8",
                "name": "riskLevel",
                "type": "uint8"
              },
              {
                "internalType": "uint32",
                "name": "n",
                "type": "uint32"
              },
              {
                "internalType": "uint16",
                "name": "p",
                "type": "uint16"
              }
            ],
            "internalType": "struct DataTypes.VtpParams",
            "name": "params",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "po",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "pa",
                "type": "uint256"
              }
            ],
            "internalType": "struct DataTypes.VtpStatus",
            "name": "status",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "asset",
                    "type": "address"
                  },
                  {
                    "internalType": "uint8",
                    "name": "decimals",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint8",
                    "name": "riskLevel",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint16",
                    "name": "id",
                    "type": "uint16"
                  },
                  {
                    "internalType": "address",
                    "name": "lpAddr",
                    "type": "address"
                  },
                  {
                    "internalType": "uint24",
                    "name": "swapFeeIn",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint24",
                    "name": "swapFeeOut",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint16",
                    "name": "protocolFeeRate",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "maxAllocateRate",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "alrLowerBound",
                    "type": "uint16"
                  }
                ],
                "internalType": "struct DataTypes.VtpTokenParams",
                "name": "params",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "liability",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "assets",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "alr",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "feeTotal",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "feePeriod",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "feeProtocol",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "totalShares",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "paused",
                    "type": "bool"
                  }
                ],
                "internalType": "struct DataTypes.VtpTokenStatus",
                "name": "status",
                "type": "tuple"
              }
            ],
            "internalType": "struct DataTypes.VtpToken",
            "name": "token0",
            "type": "tuple"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "asset",
                    "type": "address"
                  },
                  {
                    "internalType": "uint8",
                    "name": "decimals",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint8",
                    "name": "riskLevel",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint16",
                    "name": "id",
                    "type": "uint16"
                  },
                  {
                    "internalType": "address",
                    "name": "lpAddr",
                    "type": "address"
                  },
                  {
                    "internalType": "uint24",
                    "name": "swapFeeIn",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint24",
                    "name": "swapFeeOut",
                    "type": "uint24"
                  },
                  {
                    "internalType": "uint16",
                    "name": "protocolFeeRate",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "maxAllocateRate",
                    "type": "uint16"
                  },
                  {
                    "internalType": "uint16",
                    "name": "alrLowerBound",
                    "type": "uint16"
                  }
                ],
                "internalType": "struct DataTypes.VtpTokenParams",
                "name": "params",
                "type": "tuple"
              },
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "liability",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "assets",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "alr",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "feeTotal",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "feePeriod",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "feeProtocol",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "totalShares",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bool",
                    "name": "paused",
                    "type": "bool"
                  }
                ],
                "internalType": "struct DataTypes.VtpTokenStatus",
                "name": "status",
                "type": "tuple"
              }
            ],
            "internalType": "struct DataTypes.VtpToken",
            "name": "token1",
            "type": "tuple"
          }
        ],
        "internalType": "struct DataTypes.Vtp",
        "name": "vtp",
        "type": "tuple"
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
      }
    ],
    "name": "getVtpToken",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "asset",
                "type": "address"
              },
              {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
              },
              {
                "internalType": "uint8",
                "name": "riskLevel",
                "type": "uint8"
              },
              {
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
              },
              {
                "internalType": "address",
                "name": "lpAddr",
                "type": "address"
              },
              {
                "internalType": "uint24",
                "name": "swapFeeIn",
                "type": "uint24"
              },
              {
                "internalType": "uint24",
                "name": "swapFeeOut",
                "type": "uint24"
              },
              {
                "internalType": "uint16",
                "name": "protocolFeeRate",
                "type": "uint16"
              },
              {
                "internalType": "uint16",
                "name": "maxAllocateRate",
                "type": "uint16"
              },
              {
                "internalType": "uint16",
                "name": "alrLowerBound",
                "type": "uint16"
              }
            ],
            "internalType": "struct DataTypes.VtpTokenParams",
            "name": "params",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "liability",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "assets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "alr",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "feeTotal",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "feePeriod",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "feeProtocol",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalShares",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "paused",
                "type": "bool"
              }
            ],
            "internalType": "struct DataTypes.VtpTokenStatus",
            "name": "status",
            "type": "tuple"
          }
        ],
        "internalType": "struct DataTypes.VtpToken",
        "name": "vtpToken",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "incentivesController",
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
        "internalType": "address",
        "name": "priceProvider",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "incentivesController",
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
    "name": "pause",
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
      }
    ],
    "name": "pausePool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolCount",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
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
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "callerConfirmation",
        "type": "address"
      }
    ],
    "name": "renounceRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
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
            "internalType": "uint32",
            "name": "vtpID",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "poolIDIn",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "amountIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "feeDiscount",
            "type": "uint256"
          }
        ],
        "internalType": "struct DataTypes.SwapSingleInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "swap",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "out",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
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
      }
    ],
    "name": "unpausePool",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "internalType": "uint16",
        "name": "newBound",
        "type": "uint16"
      }
    ],
    "name": "updateAlrLowerBound",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "internalType": "uint16",
        "name": "newRate",
        "type": "uint16"
      }
    ],
    "name": "updateMaxAllocateRate",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "newStatus",
        "type": "bool"
      }
    ],
    "name": "updatePauseStatus",
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
        "internalType": "uint8",
        "name": "newTokenRiskLevel",
        "type": "uint8"
      },
      {
        "internalType": "uint32[]",
        "name": "vtpsToUpdate",
        "type": "uint32[]"
      }
    ],
    "name": "updatePoolRiskLevel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "creditTotalLimit",
        "type": "uint32"
      },
      {
        "internalType": "uint32[]",
        "name": "credits",
        "type": "uint32[]"
      }
    ],
    "name": "updateRiskInfo",
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
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "internalType": "uint24",
        "name": "newIn",
        "type": "uint24"
      },
      {
        "internalType": "uint24",
        "name": "newOut",
        "type": "uint24"
      },
      {
        "internalType": "uint16",
        "name": "newProtocolFeeRate",
        "type": "uint16"
      }
    ],
    "name": "updateSwapFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "newDiscount",
        "type": "uint256"
      }
    ],
    "name": "updateSwapFeeDiscount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      }
    ],
    "name": "userAllocatedVtps",
    "outputs": [
      {
        "internalType": "uint32[]",
        "name": "vtpIDs",
        "type": "uint32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "userAllocation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "allocation",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      }
    ],
    "name": "userLockedAssets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "locked",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "userMaxAllocation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "maxAllocation",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "userMaxDeallocation",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "maxDeallocation",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "userRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "rewards",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "userSwapFeeDiscount",
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
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "userUnchargedFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "uncharged",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vtpCount",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
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
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
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

