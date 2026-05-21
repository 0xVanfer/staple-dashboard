var jrPricingOracleAbi = [
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
    "name": "getBorrowRate",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "borrowRate_",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getConfig",
    "inputs": [],
    "outputs": [
      {
        "name": "config_",
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
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getExitCostBreakdown",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_exitType",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "breakdown_",
        "type": "tuple",
        "internalType": "struct IJrTokenOracle.ExitCostBreakdown",
        "components": [
          {
            "name": "exitType",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "spotPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "slippageCostRatio",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "flashLoanCostRatio",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "borrowCostRatio",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "opportunityCostRatio",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "waitingRiskCostRatio",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "exitPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalLossRatio",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getExitPrice",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_exitType",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "exitPrice_",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getFlashLoanFeeRate",
    "inputs": [],
    "outputs": [
      {
        "name": "feeRate_",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getJrTokenConfig",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "config_",
        "type": "tuple",
        "internalType": "struct IJrTokenOracle.JrTokenConfig",
        "components": [
          {
            "name": "supportedExitTypes",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "marketAdjustment",
            "type": "int24",
            "internalType": "int24"
          },
          {
            "name": "bondifySourceType",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "hasCustomParams",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "bondifyConfigId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "customParams",
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
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getNonFlashLoanParams",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "params_",
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
    "name": "getSlippage",
    "inputs": [],
    "outputs": [
      {
        "name": "slippage_",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpotPrice",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "spotPrice_",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "initialize",
    "inputs": [
      {
        "name": "_owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_initConfig",
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
    "type": "function",
    "name": "isExitTypeSupported",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_exitType",
        "type": "uint8",
        "internalType": "uint8"
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
    "name": "isSupported",
    "inputs": [
      {
        "name": "",
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
    "name": "setDefaultNonFlashLoanParams",
    "inputs": [
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
    "name": "setFlashLoanFeeRate",
    "inputs": [
      {
        "name": "_rate",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setJrTokenMarketAdjustment",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_marketAdjustment",
        "type": "int24",
        "internalType": "int24"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setJrTokenNonFlashLoanParams",
    "inputs": [
      {
        "name": "_jrToken",
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
    "name": "setSlippage",
    "inputs": [
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
    "name": "setSlippageProvider",
    "inputs": [
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
    "name": "setSpotOracle",
    "inputs": [
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
    "name": "setSupportedExitTypes",
    "inputs": [
      {
        "name": "_jrToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_types",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportJrToken",
    "inputs": [
      {
        "name": "_jrToken",
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
    "name": "unsupportJrToken",
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
    "name": "updateConfig",
    "inputs": [
      {
        "name": "_newConfig",
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
    "name": "AavePrincipalConverterUpdated",
    "inputs": [
      {
        "name": "oldConverter_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newConverter_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CollateralTokenUpdated",
    "inputs": [
      {
        "name": "oldToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExitTypesUpdated",
    "inputs": [
      {
        "name": "jrToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "oldTypes_",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "newTypes_",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FlashLoanFeeRateUpdated",
    "inputs": [
      {
        "name": "oldRate_",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
      },
      {
        "name": "newRate_",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
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
    "name": "JrTokenMarketAdjustmentUpdated",
    "inputs": [
      {
        "name": "jrToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "oldAdjustment_",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "newAdjustment_",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "JrTokenParamsUpdated",
    "inputs": [
      {
        "name": "jrToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "params_",
        "type": "tuple",
        "indexed": false,
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
    "anonymous": false
  },
  {
    "type": "event",
    "name": "JrTokenSupported",
    "inputs": [
      {
        "name": "jrToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "exitTypes_",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "marketAdjustment_",
        "type": "int24",
        "indexed": false,
        "internalType": "int24"
      },
      {
        "name": "bondifySourceType_",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "bondifyConfigId_",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "JrTokenUnsupported",
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
    "name": "LendingTokenUpdated",
    "inputs": [
      {
        "name": "oldToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newToken_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MorphoPrincipalConverterUpdated",
    "inputs": [
      {
        "name": "oldConverter_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newConverter_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NonFlashLoanParamsUpdated",
    "inputs": [
      {
        "name": "params_",
        "type": "tuple",
        "indexed": false,
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
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PrincipalConverterSplitUpdated",
    "inputs": [
      {
        "name": "oldConverter_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newConverter_",
        "type": "address",
        "indexed": true,
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
    "type": "event",
    "name": "SlippageProviderUpdated",
    "inputs": [
      {
        "name": "oldProvider_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newProvider_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SlippageUpdated",
    "inputs": [
      {
        "name": "oldSlippage_",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
      },
      {
        "name": "newSlippage_",
        "type": "uint24",
        "indexed": false,
        "internalType": "uint24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpotOracleUpdated",
    "inputs": [
      {
        "name": "oldOracle_",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOracle_",
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
    "name": "ExitTypeNotSupported",
    "inputs": [
      {
        "name": "exitType",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidExitTypes",
    "inputs": [
      {
        "name": "exitTypes",
        "type": "uint8",
        "internalType": "uint8"
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
    "name": "InvalidOraclePrice",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketAdjustmentTooHigh",
    "inputs": [
      {
        "name": "marketAdjustment",
        "type": "int24",
        "internalType": "int24"
      }
    ]
  },
  {
    "type": "error",
    "name": "MarketAdjustmentTooLow",
    "inputs": [
      {
        "name": "marketAdjustment",
        "type": "int24",
        "internalType": "int24"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotInitializing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RateTooHigh",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "max",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnsupportedToken",
    "inputs": [
      {
        "name": "token",
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
