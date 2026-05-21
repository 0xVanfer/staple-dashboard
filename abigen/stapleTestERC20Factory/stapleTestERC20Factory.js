const stapleTestERC20FactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balancesOf",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "tokens",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "balances",
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
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "batchMintFor",
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
            "name": "existingAsset",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "decimals",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "symbol",
            "type": "string"
          },
          {
            "internalType": "enum IStapleTestERC20Factory.TestTokenOracleType",
            "name": "oracleType",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "chainlinkDataFeed",
            "type": "address"
          },
          {
            "internalType": "int256",
            "name": "initPriceFeed",
            "type": "int256"
          },
          {
            "internalType": "bytes32",
            "name": "streamIDOrPullID",
            "type": "bytes32"
          }
        ],
        "internalType": "struct IStapleTestERC20Factory.StapleTestERC20DeployConfig",
        "name": "config",
        "type": "tuple"
      }
    ],
    "name": "deployStapleTestERC20",
    "outputs": [
      {
        "internalType": "address",
        "name": "testToken",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum IStapleTestERC20Factory.TestTokenOracleType",
        "name": "_type",
        "type": "uint8"
      }
    ],
    "name": "implementations",
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
    "inputs": [],
    "name": "lastDeployedTestToken",
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
    "inputs": [],
    "name": "mintAmount",
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
        "internalType": "enum IStapleTestERC20Factory.TestTokenOracleType",
        "name": "_type",
        "type": "uint8"
      }
    ],
    "name": "oracleRoles",
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
    "inputs": [],
    "name": "priceProviderAddress",
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
    "inputs": [],
    "name": "supportedTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "tokens",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum IStapleTestERC20Factory.TestTokenOracleType",
        "name": "_type",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "implementation",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "updateImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum IStapleTestERC20Factory.TestTokenOracleType",
        "name": "_type",
        "type": "uint8"
      }
    ],
    "name": "verifiers",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

