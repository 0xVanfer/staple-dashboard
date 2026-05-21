const stapleIncentivesControllerAbi = [
  {
    "anonymous": false,
    "inputs": [
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
        "internalType": "uint16",
        "name": "poolID",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "ClaimIncentives",
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
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "incentiveToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "startTime",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "endTime",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "emissionPerSecond",
        "type": "uint256"
      }
    ],
    "name": "UpdateIncentives",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "newDuration",
        "type": "uint32"
      }
    ],
    "name": "UpdateShortestIncentiveDuration",
    "type": "event"
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
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "claim",
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
        "internalType": "address",
        "name": "forUser",
        "type": "address"
      }
    ],
    "name": "claimFor",
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
        "components": [
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
            "internalType": "address",
            "name": "incentiveToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "emissionPerSecond",
            "type": "uint256"
          }
        ],
        "internalType": "struct IncentiveDataTypes.CreateIncentiveInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "createIncentive",
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
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      }
    ],
    "name": "deactivateIncentive",
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
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "estimateIncentivesForUser",
    "outputs": [
      {
        "internalType": "uint32[]",
        "name": "incentiveIDs",
        "type": "uint32[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
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
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      }
    ],
    "name": "getDistributionInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "provider",
            "type": "address"
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
            "internalType": "address",
            "name": "incentiveToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "emissionPerSecond",
            "type": "uint256"
          }
        ],
        "internalType": "struct IncentiveDataTypes.Distribution",
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
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      }
    ],
    "name": "getGlobalIncentiveInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "lastUpdateTick",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "lastClaimEmission",
            "type": "uint256"
          }
        ],
        "internalType": "struct IncentiveDataTypes.Global",
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
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      }
    ],
    "name": "getUserIncentiveInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "lastClaimTick",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "lastClaimEmission",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "unclaimed",
            "type": "uint256"
          }
        ],
        "internalType": "struct IncentiveDataTypes.User",
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
    "name": "getVtpTokenActiveIncentiveIDs",
    "outputs": [
      {
        "internalType": "uint32[]",
        "name": "",
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
      },
      {
        "internalType": "uint32",
        "name": "vtpID",
        "type": "uint32"
      }
    ],
    "name": "getVtpTokenIncentiveIDs",
    "outputs": [
      {
        "internalType": "uint32[]",
        "name": "",
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
        "name": "controller",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address payable",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "recoverToken",
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
        "internalType": "uint32",
        "name": "incentiveID",
        "type": "uint32"
      }
    ],
    "name": "refresh",
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
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "refreshFor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "shortestIncentiveDuration",
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
        "internalType": "uint32",
        "name": "newDuration",
        "type": "uint32"
      }
    ],
    "name": "updateShortestIncentiveDuration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

