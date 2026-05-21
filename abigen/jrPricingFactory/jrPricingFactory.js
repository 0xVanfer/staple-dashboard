var jrPricingFactoryAbi = [
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "OPERATOR_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "batchSetOracleFlashLoanFeeRate",
    "inputs": [
      {
        "name": "_oracles",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "_feeRate",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createOracle",
    "inputs": [
      {
        "name": "_config",
        "type": "tuple",
        "internalType": "struct IJrTokenOracle.OracleConfig",
        "components": [
          {
            "name": "spotOracle",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "collateralToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lendingToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "principalConverterSplit",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "aavePrincipalConverter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "morphoPrincipalConverter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "flashLoanFeeRate",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "slippage",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "slippageProvider",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nonFlashLoanParams",
            "type": "tuple",
            "internalType": "struct IJrTokenOracle.NonFlashLoanExitParams",
            "components": [
              {
                "name": "waitTime",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "borrowRate",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "borrowRateStrategy",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "riskFreeRate",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "waitingPeriodRisk",
                "type": "uint24",
                "internalType": "uint24"
              }
            ]
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "oracleAddress_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getExitPrices",
    "inputs": [
      {
        "name": "_jrTokens",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [
      {
        "name": "prices_",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOracle",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "oracle_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPairOracle",
    "inputs": [
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "oracle_",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleMember",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleMemberCount",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleMembers",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSupportedCount",
    "inputs": [],
    "outputs": [
      {
        "name": "count_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSupportedJrTokens",
    "inputs": [],
    "outputs": [
      {
        "name": "jrTokens_",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "implementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "_owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_implementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isSupported",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "supported_",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerJrToken",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_exitTypes",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "_marketAdjustment",
        "type": "int24",
        "internalType": "int24"
      },
      {
        "name": "_params",
        "type": "tuple",
        "internalType": "struct IJrTokenOracle.NonFlashLoanExitParams",
        "components": [
          {
            "name": "waitTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "borrowRate",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "borrowRateStrategy",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "riskFreeRate",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "waitingPeriodRisk",
            "type": "uint24",
            "internalType": "uint24"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeJrToken",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setImplementation",
    "inputs": [
      {
        "name": "_impl",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOracleDefaultNonFlashLoanParams",
    "inputs": [
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_params",
        "type": "tuple",
        "internalType": "struct IJrTokenOracle.NonFlashLoanExitParams",
        "components": [
          {
            "name": "waitTime",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "borrowRate",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "borrowRateStrategy",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "riskFreeRate",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "waitingPeriodRisk",
            "type": "uint24",
            "internalType": "uint24"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOracleSlippage",
    "inputs": [
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_slippage",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOracleSlippageProvider",
    "inputs": [
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_provider",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setOracleSpotOracle",
    "inputs": [
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_oracle",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "updateOracleConfig",
    "inputs": [
      {
        "name": "_collateralToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_lendingToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_config",
        "type": "tuple",
        "internalType": "struct IJrTokenOracle.OracleConfig",
        "components": [
          {
            "name": "spotOracle",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "collateralToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lendingToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "principalConverterSplit",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "aavePrincipalConverter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "morphoPrincipalConverter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "flashLoanFeeRate",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "slippage",
            "type": "uint24",
            "internalType": "uint24"
          },
          {
            "name": "slippageProvider",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nonFlashLoanParams",
            "type": "tuple",
            "internalType": "struct IJrTokenOracle.NonFlashLoanExitParams",
            "components": [
              {
                "name": "waitTime",
                "type": "uint64",
                "internalType": "uint64"
              },
              {
                "name": "borrowRate",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "borrowRateStrategy",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "riskFreeRate",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "waitingPeriodRisk",
                "type": "uint24",
                "internalType": "uint24"
              }
            ]
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ImplementationUpdated",
    "inputs": [
      {
        "name": "oldImpl_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newImpl_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "version",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "JrTokenRegistered",
    "inputs": [
      {
        "name": "jrToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "oracle_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "JrTokenRemoved",
    "inputs": [
      {
        "name": "jrToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OracleCreated",
    "inputs": [
      {
        "name": "collateralToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "lendingToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "oracle_",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "FailedDeployment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ImplementationNotSet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": [
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidInitialization",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitializing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OracleExists",
    "inputs": [
      {
        "name": "jrToken",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OracleNotExists",
    "inputs": [
      {
        "name": "jrToken",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
];
