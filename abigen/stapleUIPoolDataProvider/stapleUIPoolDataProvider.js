const stapleUIPoolDataProviderAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "assetIn",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "assetOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "feeDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "maxHops",
        "type": "uint8"
      }
    ],
    "name": "calcBestPath",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "userReceive",
        "type": "uint256"
      },
      {
        "internalType": "uint32[]",
        "name": "bestPath",
        "type": "uint32[]"
      },
      {
        "internalType": "address[]",
        "name": "assets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "fees",
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
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint32[][]",
        "name": "allPaths",
        "type": "uint32[][]"
      },
      {
        "internalType": "uint256",
        "name": "feeDiscount",
        "type": "uint256"
      }
    ],
    "name": "calcBetterPath",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "userReceive",
        "type": "uint256"
      },
      {
        "internalType": "uint32[]",
        "name": "bestPath",
        "type": "uint32[]"
      },
      {
        "internalType": "address[]",
        "name": "assets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "fees",
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
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint32[]",
        "name": "path",
        "type": "uint32[]"
      },
      {
        "internalType": "uint256",
        "name": "feeDiscount",
        "type": "uint256"
      }
    ],
    "name": "calcRouterSwapResults",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "userReceive",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "assets",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "fees",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "controller",
    "outputs": [
      {
        "internalType": "contract IController",
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
        "name": "assetIn",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "assetOut",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "maxHops",
        "type": "uint8"
      }
    ],
    "name": "findAllPaths",
    "outputs": [
      {
        "internalType": "uint32[][]",
        "name": "paths",
        "type": "uint32[][]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllPools",
    "outputs": [
      {
        "components": [
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
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "assets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "liability",
                "type": "uint256"
              }
            ],
            "internalType": "struct UIDataTypes.PoolStatus",
            "name": "status",
            "type": "tuple"
          },
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
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "id",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "internalType": "uint8",
                        "name": "decimals",
                        "type": "uint8"
                      },
                      {
                        "internalType": "uint32",
                        "name": "startTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "endTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint256",
                        "name": "emissionPerSecond",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
                    "name": "incentives",
                    "type": "tuple[]"
                  }
                ],
                "internalType": "struct UIDataTypes.VtpTokenWithIncentives",
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
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "id",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "internalType": "uint8",
                        "name": "decimals",
                        "type": "uint8"
                      },
                      {
                        "internalType": "uint32",
                        "name": "startTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "endTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint256",
                        "name": "emissionPerSecond",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
                    "name": "incentives",
                    "type": "tuple[]"
                  }
                ],
                "internalType": "struct UIDataTypes.VtpTokenWithIncentives",
                "name": "token1",
                "type": "tuple"
              }
            ],
            "internalType": "struct UIDataTypes.VtpWithIncentives[]",
            "name": "relatedVtps",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct UIDataTypes.Pool[]",
        "name": "",
        "type": "tuple[]"
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
    "name": "getAllRelatedVtpTokenIncentives",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "id",
            "type": "uint32"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "uint32",
            "name": "startTime",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "endTime",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "emissionPerSecond",
            "type": "uint256"
          }
        ],
        "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[][]",
        "name": "",
        "type": "tuple[][]"
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
    "name": "getPool",
    "outputs": [
      {
        "components": [
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
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "assets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "liability",
                "type": "uint256"
              }
            ],
            "internalType": "struct UIDataTypes.PoolStatus",
            "name": "status",
            "type": "tuple"
          },
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
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "id",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "internalType": "uint8",
                        "name": "decimals",
                        "type": "uint8"
                      },
                      {
                        "internalType": "uint32",
                        "name": "startTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "endTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint256",
                        "name": "emissionPerSecond",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
                    "name": "incentives",
                    "type": "tuple[]"
                  }
                ],
                "internalType": "struct UIDataTypes.VtpTokenWithIncentives",
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
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "id",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "internalType": "uint8",
                        "name": "decimals",
                        "type": "uint8"
                      },
                      {
                        "internalType": "uint32",
                        "name": "startTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "endTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint256",
                        "name": "emissionPerSecond",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
                    "name": "incentives",
                    "type": "tuple[]"
                  }
                ],
                "internalType": "struct UIDataTypes.VtpTokenWithIncentives",
                "name": "token1",
                "type": "tuple"
              }
            ],
            "internalType": "struct UIDataTypes.VtpWithIncentives[]",
            "name": "relatedVtps",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct UIDataTypes.Pool",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16[]",
        "name": "poolIDs",
        "type": "uint16[]"
      }
    ],
    "name": "getPools",
    "outputs": [
      {
        "components": [
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
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "assets",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "liability",
                "type": "uint256"
              }
            ],
            "internalType": "struct UIDataTypes.PoolStatus",
            "name": "status",
            "type": "tuple"
          },
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
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "id",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "internalType": "uint8",
                        "name": "decimals",
                        "type": "uint8"
                      },
                      {
                        "internalType": "uint32",
                        "name": "startTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "endTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint256",
                        "name": "emissionPerSecond",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
                    "name": "incentives",
                    "type": "tuple[]"
                  }
                ],
                "internalType": "struct UIDataTypes.VtpTokenWithIncentives",
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
                  },
                  {
                    "components": [
                      {
                        "internalType": "uint32",
                        "name": "id",
                        "type": "uint32"
                      },
                      {
                        "internalType": "address",
                        "name": "token",
                        "type": "address"
                      },
                      {
                        "internalType": "uint8",
                        "name": "decimals",
                        "type": "uint8"
                      },
                      {
                        "internalType": "uint32",
                        "name": "startTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint32",
                        "name": "endTime",
                        "type": "uint32"
                      },
                      {
                        "internalType": "uint256",
                        "name": "emissionPerSecond",
                        "type": "uint256"
                      }
                    ],
                    "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
                    "name": "incentives",
                    "type": "tuple[]"
                  }
                ],
                "internalType": "struct UIDataTypes.VtpTokenWithIncentives",
                "name": "token1",
                "type": "tuple"
              }
            ],
            "internalType": "struct UIDataTypes.VtpWithIncentives[]",
            "name": "relatedVtps",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct UIDataTypes.Pool[]",
        "name": "",
        "type": "tuple[]"
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
    "name": "getVtpTokenIncentives",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "id",
            "type": "uint32"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "uint32",
            "name": "startTime",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "endTime",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "emissionPerSecond",
            "type": "uint256"
          }
        ],
        "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[]",
        "name": "",
        "type": "tuple[]"
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
        "internalType": "uint32[]",
        "name": "vtpIDs",
        "type": "uint32[]"
      }
    ],
    "name": "getVtpTokensIncentives",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "id",
            "type": "uint32"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "uint32",
            "name": "startTime",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "endTime",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "emissionPerSecond",
            "type": "uint256"
          }
        ],
        "internalType": "struct UIDataTypes.VtpTokenIncentivesInfo[][]",
        "name": "",
        "type": "tuple[][]"
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
        "internalType": "contract IIncentivesController",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "userAllPoolsInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "poolID",
            "type": "uint16"
          },
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
            "internalType": "uint32",
            "name": "totalCredits",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "creditUsed",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "assetWalletBalance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "liability",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedLp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "allRewards",
            "type": "uint256"
          },
          {
            "internalType": "uint32[]",
            "name": "allocatedVtps",
            "type": "uint32[]"
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
                "name": "allocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "allocatedRate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxDeallocate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxAllocate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "shares",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "rewards",
                "type": "uint256"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint8",
                    "name": "decimals",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint32",
                    "name": "startTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint32",
                    "name": "endTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "emissionPerSecond",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct UIDataTypes.UserIncentivesInfo[]",
                "name": "incentives",
                "type": "tuple[]"
              }
            ],
            "internalType": "struct UIDataTypes.UserVtpTokenInfo[]",
            "name": "userVtpTokens",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct UIDataTypes.UserPoolInfo[]",
        "name": "",
        "type": "tuple[]"
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
    "name": "userPoolInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "poolID",
            "type": "uint16"
          },
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
            "internalType": "uint32",
            "name": "totalCredits",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "creditUsed",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "assetWalletBalance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "liability",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedLp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "allRewards",
            "type": "uint256"
          },
          {
            "internalType": "uint32[]",
            "name": "allocatedVtps",
            "type": "uint32[]"
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
                "name": "allocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "allocatedRate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxDeallocate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxAllocate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "shares",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "rewards",
                "type": "uint256"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint8",
                    "name": "decimals",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint32",
                    "name": "startTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint32",
                    "name": "endTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "emissionPerSecond",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct UIDataTypes.UserIncentivesInfo[]",
                "name": "incentives",
                "type": "tuple[]"
              }
            ],
            "internalType": "struct UIDataTypes.UserVtpTokenInfo[]",
            "name": "userVtpTokens",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct UIDataTypes.UserPoolInfo",
        "name": "",
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
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint16[]",
        "name": "poolIDs",
        "type": "uint16[]"
      }
    ],
    "name": "userPoolsInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "poolID",
            "type": "uint16"
          },
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
            "internalType": "uint32",
            "name": "totalCredits",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "creditUsed",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "assetWalletBalance",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "liability",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedLp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "allRewards",
            "type": "uint256"
          },
          {
            "internalType": "uint32[]",
            "name": "allocatedVtps",
            "type": "uint32[]"
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
                "name": "allocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "allocatedRate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxDeallocate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "maxAllocate",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "shares",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "rewards",
                "type": "uint256"
              },
              {
                "components": [
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "uint8",
                    "name": "decimals",
                    "type": "uint8"
                  },
                  {
                    "internalType": "uint32",
                    "name": "startTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint32",
                    "name": "endTime",
                    "type": "uint32"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "emissionPerSecond",
                    "type": "uint256"
                  }
                ],
                "internalType": "struct UIDataTypes.UserIncentivesInfo[]",
                "name": "incentives",
                "type": "tuple[]"
              }
            ],
            "internalType": "struct UIDataTypes.UserVtpTokenInfo[]",
            "name": "userVtpTokens",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct UIDataTypes.UserPoolInfo[]",
        "name": "",
        "type": "tuple[]"
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
    "name": "userVtpTokenIncentives",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "uint32",
            "name": "startTime",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "endTime",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "emissionPerSecond",
            "type": "uint256"
          }
        ],
        "internalType": "struct UIDataTypes.UserIncentivesInfo[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

