// Auto-generated from contracts/libraries/constants/Errors.sol
// Error signature to error information mapping
// Dependencies: None

const ERROR_MAP = {
  "0x2d5fb10f": {
    name: "CallerNotController",
    declaration: "CallerNotController()",
    description: "The caller is not the controller."
  },
  "0x557b0d34": {
    name: "CallerNotPriceProvider",
    declaration: "CallerNotPriceProvider()",
    description: "The caller is not the price provider."
  },
  "0x1b3aa000": {
    name: "FunctionShouldNotBeCalled",
    declaration: "FunctionShouldNotBeCalled()",
    description: "The function should never be called."
  },
  "0xe00cabea": {
    name: "LengthsNotMatch",
    declaration: "LengthsNotMatch()",
    description: "The lengths of two arrays do not match."
  },
  "0x6d963f88": {
    name: "NativeTransferFailed",
    declaration: "NativeTransferFailed()",
    description: "Native token transfer failed."
  },
  "0xd92e233d": {
    name: "ZeroAddress",
    declaration: "ZeroAddress()",
    description: "The address is 0x0."
  },
  "0x1f2a2005": {
    name: "ZeroAmount",
    declaration: "ZeroAmount()",
    description: "The amount is 0."
  },
  "0x4dfba023": {
    name: "ZeroPrice",
    declaration: "ZeroPrice()",
    description: "The price is 0."
  },
  "0x1bb7232c": {
    name: "InvalidLogParam",
    declaration: "InvalidLogParam()",
    description: "Trying to calculate log of a number less than 1."
  },
  "0x04619904": {
    name: "InvalidRootParam",
    declaration: "InvalidRootParam()",
    description: "Trying to calculate the nth root with n being 0."
  },
  "0x1f4bcb2b": {
    name: "PriceNotUpdated",
    declaration: "PriceNotUpdated()",
    description: "The price of the asset is not updated in the current block."
  },
  "0x171932da": {
    name: "VerifierNotCorrect",
    declaration: "VerifierNotCorrect(address inputVerifier, address asset, address baseToken)",
    description: "The asset should not be verified by this verifier."
  },
  "0x6fcc7e78": {
    name: "AssetToVerifyNotRegistered",
    declaration: "AssetToVerifyNotRegistered(address verifier, address asset, address baseToken)",
    description: "Oracle verifier did not register the asset to verify."
  },
  "0x01800c1d": {
    name: "PairAlreadyRecorded",
    declaration: "PairAlreadyRecorded(address verifier, address asset, address baseToken)",
    description: "The oracle verifier already recorded the asset to verify. If tokenA / tokenB is recorded, tokenB / tokenA is also considered recorded."
  },
  "0xb3efa15f": {
    name: "VerifierStillInUse",
    declaration: "VerifierStillInUse(address verifier, address asset, address baseToken)",
    description: "The verifier is still in use for the asset."
  },
  "0xe8eec331": {
    name: "InvalidOracleDecimals",
    declaration: "InvalidOracleDecimals(address oracle, uint8 decimals)",
    description: "Decimals of Chainlink data feed is larger than 18."
  },
  "0x3b2c8ee9": {
    name: "InvalidFeedID",
    declaration: "InvalidFeedID(bytes32 feedID, bytes32 expectedFeedID)",
    description: "Chainlink stream feedID is not supported."
  },
  "0xaf259ccc": {
    name: "InvalidReportVersion",
    declaration: "InvalidReportVersion(uint8 version)",
    description: "Chainlink stream report version is not supported."
  },
  "0x56e136e8": {
    name: "CreatePoolZero",
    declaration: "CreatePoolZero()",
    description: "Created a pool with 0x0 address."
  },
  "0x950d20d3": {
    name: "FlowRateLimited",
    declaration: "FlowRateLimited()",
    description: "The rate limit is reached, cannot call the function."
  },
  "0x957f6e05": {
    name: "InvalidPoolDecimals",
    declaration: "InvalidPoolDecimals()",
    description: "Creating a pool with token decimals greater than 18."
  },
  "0x43c09dae": {
    name: "InvalidRiskLevel",
    declaration: "InvalidRiskLevel()",
    description: "The risk level has no related credit."
  },
  "0x6ae22762": {
    name: "PoolNotExist",
    declaration: "PoolNotExist()",
    description: "The pool was not found in the controller. Got an empty poolParams or poolID too large."
  },
  "0xb7d84e2a": {
    name: "RecoverTokenShouldNotBeAsset",
    declaration: "RecoverTokenShouldNotBeAsset()",
    description: "When recovering tokens, the token to recover should not be the asset of the LP."
  },
  "0x1a20145d": {
    name: "VtpsRiskNotUpdated",
    declaration: "VtpsRiskNotUpdated()",
    description: "The pool related vtps' risk levels are not updated, cannot unpause the pool."
  },
  "0x2773fec8": {
    name: "InvalidAlrLowerBound",
    declaration: "InvalidAlrLowerBound()",
    description: "The alr lower bound is invalid. Must be in [0, 1e4), representing [0%, 100%)."
  },
  "0x46a7c7ed": {
    name: "InvalidMaxAllocateRate",
    declaration: "InvalidMaxAllocateRate()",
    description: "The max allocate rate is invalid. Must be in (0, 1e4), representing (0%, 100%)."
  },
  "0x8d66805b": {
    name: "InvalidNewCredit",
    declaration: "InvalidNewCredit()",
    description: "The new credit is invalid. Must be in (0, totalLimit]. Credits must be monitonically increasing."
  },
  "0x82eeb3b2": {
    name: "InvalidProtocolFeeRate",
    declaration: "InvalidProtocolFeeRate()",
    description: "The protocol fee rate is invalid. Must be in [0, 1e4), representing [0%, 100%)."
  },
  "0x93bd9e1f": {
    name: "InvalidSwapFeeDiscount",
    declaration: "InvalidSwapFeeDiscount()",
    description: "The swap fee discount is invalid. Must be in [0, 1e18], representing [0%, 100%]."
  },
  "0x5c1fb6fa": {
    name: "InvalidSwapFeeRate",
    declaration: "InvalidSwapFeeRate()",
    description: "The swap fee rate is invalid. Must be in [0, 1e6), representing [0%, 100%)."
  },
  "0x2596985d": {
    name: "InvalidVtpP",
    declaration: "InvalidVtpP()",
    description: "The vtp parameter p is invalid. p must be in [1, 10000], representing [0.01%, 100%]."
  },
  "0x782eba8c": {
    name: "VtpInvalidLiability",
    declaration: "VtpInvalidLiability()",
    description: "The vtp liability is invalid."
  },
  "0xe4c7f3df": {
    name: "VtpNotExist",
    declaration: "VtpNotExist()",
    description: "The vtp does not exist."
  },
  "0x17b4a310": {
    name: "VtpTokenNotExist",
    declaration: "VtpTokenNotExist()",
    description: "The token does not exist in the vtp."
  },
  "0x62d237c8": {
    name: "VtpTokenPaused",
    declaration: "VtpTokenPaused()",
    description: "The vtptoken is paused."
  },
  "0xb15cbd79": {
    name: "VtpTokenSameAsset",
    declaration: "VtpTokenSameAsset()",
    description: "Creating a vtp with two same tokens."
  },
  "0x40d101e0": {
    name: "InvalidDepositMsgValue",
    declaration: "InvalidDepositMsgValue()",
    description: "msg.value should be zero when depositing to a pool with `_useNative` set to false. msg.value should be non-zero when depositing to a pool with `_useNative` set to true."
  },
  "0x8ba899fc": {
    name: "PoolNotForWrappedNativeToken",
    declaration: "PoolNotForWrappedNativeToken()",
    description: "Deposit(withdraw) wrapped native token to(from) a pool that does not support it."
  },
  "0x7123ff5c": {
    name: "AllocateFeeRateLargerThanMaxFeeRate",
    declaration: "AllocateFeeRateLargerThanMaxFeeRate(uint256 actual, uint256 expected)",
    description: "Allocate fee is larger than allocate amount * maxFeeRate."
  },
  "0x281f3593": {
    name: "AllocatedNotExistInAdjustInput",
    declaration: "AllocatedNotExistInAdjustInput()",
    description: "The allocated vtp must be within the input vtps when calling {Router-adjustPosition}."
  },
  "0x2e2d45de": {
    name: "DeallocateFeeRateLargerThanMaxFeeRate",
    declaration: "DeallocateFeeRateLargerThanMaxFeeRate(uint256 actual, uint256 expected)",
    description: "Deallocate fee is larger than deallocate amount * maxFeeRate."
  },
  "0xd6839bd1": {
    name: "InvalidRalrAfterDeallocate",
    declaration: "InvalidRalrAfterDeallocate()",
    description: "The remaining alr is too low or too high after deallocation."
  },
  "0xa6eb4a62": {
    name: "InvalidUserShare",
    declaration: "InvalidUserShare()",
    description: "Calculated user share to add for allocation is 0."
  },
  "0x8280f015": {
    name: "MaxAllocateIsZero",
    declaration: "MaxAllocateIsZero()",
    description: "The max allocate amount is zero. Which means user might have exceeded the pool credits,"
  },
  "0x300d2bab": {
    name: "LiabilityTooLow",
    declaration: "LiabilityTooLow()",
    description: "Liability is too low after (de)allocation. The min amount is hardcoded in {VtpTokenLogic-_minLiability}."
  },
  "0x1c17fd73": {
    name: "AlrTooLowAfterSwap",
    declaration: "AlrTooLowAfterSwap()",
    description: "The token alr is too low after the swap."
  },
  "0x7a58c192": {
    name: "InvalidSwapDeadline",
    declaration: "InvalidSwapDeadline()",
    description: "The swap deadline has passed."
  },
  "0x5b218f68": {
    name: "InvalidSwapDelta",
    declaration: "InvalidSwapDelta()",
    description: "The swap delta is negative when calculating pav. In most cases, it means that swap amount exceeds the pool's liquidity. Or there might be some precision issue when reading the prices."
  },
  "0x8233303e": {
    name: "InvalidSwapMsgValue",
    declaration: "InvalidSwapMsgValue()",
    description: "The swap msg.value is invalid."
  },
  "0x33782793": {
    name: "InvalidSwapPath",
    declaration: "InvalidSwapPath()",
    description: "The swap path is invalid. The path length must be larger than 0, and the path must match the swap tokens."
  },
  "0x86f3c675": {
    name: "InvalidSwapReceivedAmount",
    declaration: "InvalidSwapReceivedAmount()",
    description: "The swap out amount must be larger than minOutAmount."
  },
  "0x85d38ced": {
    name: "VtpMustBeActivated",
    declaration: "VtpMustBeActivated()",
    description: "The vtpToken must be activated before creating incentives."
  },
  "0x886fe07f": {
    name: "EmissionDurationTooShort",
    declaration: "EmissionDurationTooShort()",
    description: "The emission duration is too short."
  },
  "0x6c7c6f22": {
    name: "EmissionMustBePositive",
    declaration: "EmissionMustBePositive()",
    description: "The emissionPerSecond must be positive."
  },
  "0xd87602b9": {
    name: "InvalidIncentivesParams",
    declaration: "InvalidIncentivesParams()",
    description: "The param of creating/updating incentive is invalid."
  },
  "0xdf797366": {
    name: "TooManyActiveIDs",
    declaration: "TooManyActiveIDs()",
    description: "Too many incentives are active for this vtpToken."
  },
  "0x554a711c": {
    name: "IncentiveNotFound",
    declaration: "IncentiveNotFound()",
    description: "The incentive ID is not found."
  },
  // ERC20 Errors
  "0xe450d38c": {
    name: "ERC20InsufficientBalance",
    declaration: "ERC20InsufficientBalance(address,uint256,uint256)",
    description: "ERC20 insufficient balance error."
  },
  "0x96c6fd1e": {
    name: "ERC20InvalidSender",
    declaration: "ERC20InvalidSender(address)",
    description: "ERC20 invalid sender error."
  },
  "0xec442f05": {
    name: "ERC20InvalidReceiver",
    declaration: "ERC20InvalidReceiver(address)",
    description: "ERC20 invalid receiver error."
  },
  "0xfb8f41b2": {
    name: "ERC20InsufficientAllowance",
    declaration: "ERC20InsufficientAllowance(address,uint256,uint256)",
    description: "ERC20 insufficient allowance error."
  },
  "0xe602df05": {
    name: "ERC20InvalidApprover",
    declaration: "ERC20InvalidApprover(address)",
    description: "ERC20 invalid approver error."
  },
  "0x94280d62": {
    name: "ERC20InvalidSpender",
    declaration: "ERC20InvalidSpender(address)",
    description: "ERC20 invalid spender error."
  },
  // SafeERC20 Errors
  "0x5274afe7": {
    name: "SafeERC20FailedOperation",
    declaration: "SafeERC20FailedOperation(address)",
    description: "SafeERC20 operation failed."
  },
  "0xe570110f": {
    name: "SafeERC20FailedDecreaseAllowance",
    declaration: "SafeERC20FailedDecreaseAllowance(address,uint256,uint256)",
    description: "SafeERC20 failed to decrease allowance."
  },
  // ERC4626 Errors
  "0x79012fb2": {
    name: "ERC4626ExceededMaxDeposit",
    declaration: "ERC4626ExceededMaxDeposit(address,uint256,uint256)",
    description: "ERC4626 exceeded maximum deposit amount."
  },
  "0x284ff667": {
    name: "ERC4626ExceededMaxMint",
    declaration: "ERC4626ExceededMaxMint(address,uint256,uint256)",
    description: "ERC4626 exceeded maximum mint amount."
  },
  "0xfe9cceec": {
    name: "ERC4626ExceededMaxWithdraw",
    declaration: "ERC4626ExceededMaxWithdraw(address,uint256,uint256)",
    description: "ERC4626 exceeded maximum withdraw amount."
  },
  "0xb94abeec": {
    name: "ERC4626ExceededMaxRedeem",
    declaration: "ERC4626ExceededMaxRedeem(address,uint256,uint256)",
    description: "ERC4626 exceeded maximum redeem amount."
  },
  // AccessControl Errors
  "0xe2517d3f": {
    name: "AccessControlUnauthorizedAccount",
    declaration: "AccessControlUnauthorizedAccount(address,bytes32)",
    description: "Account is not authorized for the required role."
  },
  "0x6697b232": {
    name: "AccessControlBadConfirmation",
    declaration: "AccessControlBadConfirmation()",
    description: "Access control bad confirmation."
  },
  // Pausable Errors
  "0xd93c0665": {
    name: "EnforcedPause",
    declaration: "EnforcedPause()",
    description: "The contract is paused."
  },
  "0x8dfc202b": {
    name: "ExpectedPause",
    declaration: "ExpectedPause()",
    description: "Expected the contract to be paused."
  },
  // ReentrancyGuard Errors
  "0x3ee5aeb5": {
    name: "ReentrancyGuardReentrantCall",
    declaration: "ReentrancyGuardReentrantCall()",
    description: "Reentrant call detected."
  },
  // TransparentUpgradeableProxy Errors
  "0xd2b576ec": {
    name: "ProxyDeniedAdminAccess",
    declaration: "ProxyDeniedAdminAccess()",
    description: "Admin access to proxy denied."
  },
  // Strings Errors
  "0xe22e27eb": {
    name: "StringsInsufficientHexLength",
    declaration: "StringsInsufficientHexLength(uint256,uint256)",
    description: "Insufficient hex string length."
  },
  "0x94e2737e": {
    name: "StringsInvalidChar",
    declaration: "StringsInvalidChar()",
    description: "Invalid character in string."
  },
  "0x1d15ae44": {
    name: "StringsInvalidAddressFormat",
    declaration: "StringsInvalidAddressFormat()",
    description: "Invalid address format in string."
  }
};

// Export for use in browser
if (typeof window !== "undefined") {
  window.ERROR_MAP = ERROR_MAP;
}
