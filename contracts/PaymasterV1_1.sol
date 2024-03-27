// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/* solhint-disable reason-string */
/* solhint-disable no-inline-assembly */

import "../lib/account-abstraction/contracts/core/BasePaymaster.sol";
import "../lib/account-abstraction/contracts/interfaces/UserOperation.sol";
import "../lib/account-abstraction/contracts/core/Helpers.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./utils/IOracle.sol";
import "./utils/SafeTransferLib.sol";

/**
 * A sample paymaster that uses external service to decide whether to pay for the UserOp.
 * The paymaster trusts an external signer to sign the transaction.
 * The calling user must pass the UserOp to that external signer first, which performs
 * whatever off-chain verification before signing the UserOp.
 * Note that this signature is NOT a replacement for the account-specific signature:
 * - the paymaster checks a signature to agree to PAY for GAS.
 * - the account checks a signature to prove identity and account ownership.
 */
contract PaymasterV1_1 is BasePaymaster {

    using ECDSA for bytes32;
    using UserOperationLib for UserOperation;

    address public immutable verifyingSigner;

    uint256 private constant TYPE_OFFSET = 20;
    uint256 private constant VALID_TIMESTAMP_OFFSET = 21;

    uint256 private constant SIGNATURE_OFFSET = 85;

    uint256 public constant priceDenominator = 1e6;
    uint256 public constant REFUND_POSTOP_COST = 40000; // Estimated gas cost for refunding tokens after the transaction is completed

    // The token, tokenOracle, and nativeAssetOracle are declared as immutable,
    // meaning their values cannot change after contract creation.
    IERC20 public immutable token; // The ERC20 token used for transaction fee payments
    uint256 public immutable tokenDecimals;
    IOracle public immutable tokenOracle; // The Oracle contract used to fetch the latest token prices
    IOracle public immutable nativeAssetOracle; // The Oracle contract used to fetch the latest ETH prices

    uint192 public previousPrice; // The cached token price from the Oracle
    uint32 public priceMarkup; // The price markup percentage applied to the token price (1e6 = 100%)
    uint32 public priceUpdateThreshold; // The price update threshold percentage that triggers a price update (1e6 = 100%)

    event ConfigUpdated(uint32 priceMarkup, uint32 updateThreshold);

    event UserOperationSponsored(address indexed user, uint256 actualTokenNeeded, uint256 actualGasCost);

    constructor(
        IEntryPoint _entryPoint, 
        address _verifyingSigner,
        IERC20Metadata _token,
        IOracle _tokenOracle,
        IOracle _nativeAssetOracle,
        address _owner
    ) BasePaymaster(_entryPoint) {
        verifyingSigner = _verifyingSigner;
        token = _token;
        tokenOracle = _tokenOracle; // oracle for token -> usd
        nativeAssetOracle = _nativeAssetOracle; // oracle for native asset(eth/matic/avax..) -> usd
        priceMarkup = 110e4; // 110%  1e6 = 100%
        priceUpdateThreshold = 25e3; // 2.5%  1e6 = 100%
        transferOwnership(_owner);
        tokenDecimals = 10 ** _token.decimals();
        require(_tokenOracle.decimals() == 8, "PP-ERC20 : token oracle decimals must be 8");
        require(_nativeAssetOracle.decimals() == 8, "PP-ERC20 : native asset oracle decimals must be 8");
    }

    mapping(address => uint256) public senderNonce;

    function pack(UserOperation calldata userOp) internal pure returns (bytes memory ret) {
        // lighter signature scheme. must match UserOp.ts#packUserOp
        bytes calldata pnd = userOp.paymasterAndData;
        // copy directly the userOp from calldata up to (but not including) the paymasterAndData.
        // this encoding depends on the ABI encoding of calldata, but is much lighter to copy
        // than referencing each field separately.
        assembly {
            let ofs := userOp
            let len := sub(sub(pnd.offset, ofs), 32)
            ret := mload(0x40)
            mstore(0x40, add(ret, add(len, 32)))
            mstore(ret, len)
            calldatacopy(add(ret, 32), ofs, len)
        }
    }

    /**
     * return the hash we're going to sign off-chain (and validate on-chain)
     * this method is called by the off-chain service, to sign the request.
     * it is called on-chain from the validatePaymasterUserOp, to validate the signature.
     * note that this signature covers all fields of the UserOperation, except the "paymasterAndData",
     * which will carry the signature itself.
     */
    function getHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter)
    public view returns (bytes32) {
        //can't use userOp.hash(), since it contains also the paymasterAndData itself.

        return keccak256(abi.encode(
            pack(userOp),
            block.chainid,
            address(this),
            senderNonce[userOp.getSender()],
            validUntil,
            validAfter
        ));
    }

    /**
     * verify our external signer signed this request.
     * the "paymasterAndData" is expected to be the paymaster and a signature over the entire request params
     * paymasterAndData[:20] : address(this)
     * paymasterAndData[20:84] : abi.encode(validUntil, validAfter)
     * paymasterAndData[84:] : signature
     */
    function _verifyingPaymasterUserOp(UserOperation calldata userOp, uint256 requiredPreFund)
    internal returns (bytes memory context, uint256 validationData) {
        (requiredPreFund);

        (uint48 validUntil, uint48 validAfter, bytes calldata signature) = parsePaymasterAndData(userOp.paymasterAndData);
        //ECDSA library supports both 64 and 65-byte long signatures.
        // we only "require" it here so that the revert reason on invalid signature will be of "VerifyingPaymaster", and not "ECDSA"
        require(signature.length == 64 || signature.length == 65, "VerifyingPaymaster: invalid signature length in paymasterAndData");
        bytes32 hash = ECDSA.toEthSignedMessageHash(getHash(userOp, validUntil, validAfter));
        senderNonce[userOp.getSender()]++;

        //don't revert on signature failure: return SIG_VALIDATION_FAILED
        if (verifyingSigner != ECDSA.recover(hash, signature)) {
            return ("0x00",_packValidationData(true,validUntil,validAfter));
        }

        //no need for other on-chain validation: entire UserOp should have been checked
        // by the external service prior to signing it.
        return ("0x00",_packValidationData(false,validUntil,validAfter));
    }

    function parsePaymasterAndData(bytes calldata paymasterAndData) public pure returns(uint48 validUntil, uint48 validAfter, bytes calldata signature) {
        (validUntil, validAfter) = abi.decode(paymasterAndData[VALID_TIMESTAMP_OFFSET:SIGNATURE_OFFSET],(uint48, uint48));
        signature = paymasterAndData[SIGNATURE_OFFSET:];
    }
    

    /// @notice ERC20 Paymaster function

    /// @notice Updates the price markup and price update threshold configurations.
    /// @param _priceMarkup The new price markup percentage (1e6 = 100%).
    /// @param _updateThreshold The new price update threshold percentage (1e6 = 100%).
    function updateConfig(uint32 _priceMarkup, uint32 _updateThreshold) external onlyOwner {
        require(_priceMarkup <= 120e4, "PP-ERC20 : price markup too high");
        require(_priceMarkup >= 1e6, "PP-ERC20 : price markeup too low");
        require(_updateThreshold <= 1e6, "PP-ERC20 : update threshold too high");
        priceMarkup = _priceMarkup;
        priceUpdateThreshold = _updateThreshold;
        emit ConfigUpdated(_priceMarkup, _updateThreshold);
    }

    /// @notice Allows the contract owner to withdraw a specified amount of tokens from the contract.
    /// @param to The address to transfer the tokens to.
    /// @param amount The amount of tokens to transfer.
    function withdrawToken(address to, uint256 amount) external onlyOwner {
        SafeTransferLib.safeTransfer(address(token), to, amount);
    }

    /// @notice Updates the token price by fetching the latest price from the Oracle.
    function updatePrice() external {
        // This function updates the cached ERC20/ETH price ratio
        uint192 tokenPrice = fetchPrice(tokenOracle);
        uint192 nativeAssetPrice = fetchPrice(nativeAssetOracle);
        previousPrice = nativeAssetPrice * uint192(tokenDecimals) / tokenPrice;
    }

    /// @notice Validates a paymaster user operation and calculates the required token amount for the transaction.
    /// @param userOp The user operation data.
    /// @param requiredPreFund The amount of tokens required for pre-funding.
    /// @return context The context containing the token amount and user sender address (if applicable).
    /// @return validationResult A uint256 value indicating the result of the validation (always 0 in this implementation).
    function _ERC20PaymasterUserOp(UserOperation calldata userOp, uint256 requiredPreFund)
        internal
        returns (bytes memory context, uint256 validationResult)
    {
        (uint48 validUntil, uint48 validAfter, bytes calldata signature) = parsePaymasterAndData(userOp.paymasterAndData);
        //ECDSA library supports both 64 and 65-byte long signatures.
        // we only "require" it here so that the revert reason on invalid signature will be of "VerifyingPaymaster", and not "ECDSA"
        require(signature.length == 64 || signature.length == 65, "VerifyingPaymaster: invalid signature length in paymasterAndData");
        bytes32 hash = ECDSA.toEthSignedMessageHash(getHash(userOp, validUntil, validAfter));
        senderNonce[userOp.getSender()]++;

        //don't revert on signature failure: return SIG_VALIDATION_FAILED
        if (verifyingSigner != ECDSA.recover(hash, signature)) {
            validationResult = _packValidationData(true, validUntil, validAfter);
        }
        //no need for other on-chain validation: entire UserOp should have been checked
        // by the external service prior to signing it.
        else{
            validationResult = _packValidationData(false, validUntil, validAfter);
        }

        unchecked {
            uint256 cachedPrice = previousPrice;
            require(cachedPrice != 0, "PP-ERC20 : price not set");
            // NOTE: we assumed that nativeAsset's decimals is 18, if there is any nativeAsset with different decimals, need to change the 1e18 to the correct decimals
            uint256 tokenAmount = (requiredPreFund + (REFUND_POSTOP_COST) * userOp.maxFeePerGas) * priceMarkup
                * cachedPrice / (1e18 * priceDenominator);
            SafeTransferLib.safeTransferFrom(address(token), userOp.sender, address(this), tokenAmount);
            uint8 typeId = 1;
            context = abi.encodePacked(typeId, tokenAmount, userOp.sender);
        }
    }

    /// @notice Performs post-operation tasks, such as updating the token price and refunding excess tokens.
    /// @dev This function is called after a user operation has been executed or reverted.
    /// @param mode The post-operation mode (either successful or reverted).
    /// @param context The context containing the token amount and user sender address.
    /// @param actualGasCost The actual gas cost of the transaction.
    function _ERC20PostOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal {
        if (mode == PostOpMode.postOpReverted) {
            return; // Do nothing here to not revert the whole bundle and harm reputation
        }
        unchecked {
            uint192 tokenPrice = fetchPrice(tokenOracle);
            uint192 nativeAsset = fetchPrice(nativeAssetOracle);
            uint256 cachedPrice = previousPrice;
            uint192 price = nativeAsset * uint192(tokenDecimals) / tokenPrice;
            uint256 cachedUpdateThreshold = priceUpdateThreshold;
            if (
                uint256(price) * priceDenominator / cachedPrice > priceDenominator + cachedUpdateThreshold
                    || uint256(price) * priceDenominator / cachedPrice < priceDenominator - cachedUpdateThreshold
            ) {
                previousPrice = uint192(int192(price));
                cachedPrice = uint192(int192(price));
            }
            // Refund tokens based on actual gas cost
            // NOTE: we assumed that nativeAsset's decimals is 18, if there is any nativeAsset with different decimals, need to change the 1e18 to the correct decimals
            uint256 actualTokenNeeded = (actualGasCost + REFUND_POSTOP_COST * tx.gasprice) * priceMarkup * cachedPrice
                / (1e18 * priceDenominator); // We use tx.gasprice here since we don't know the actual gas price used by the user
            if (uint256(bytes32(context[1:33])) > actualTokenNeeded) {
                // If the initially provided token amount is greater than the actual amount needed, refund the difference
                SafeTransferLib.safeTransfer(
                    address(token),
                    address(bytes20(context[33:53])),
                    uint256(bytes32(context[1:33])) - actualTokenNeeded
                );
            } // If the token amount is not greater than the actual amount needed, no refund occurs

            emit UserOperationSponsored(address(bytes20(context[33:53])), actualTokenNeeded, actualGasCost);
        }
    }

    /// @notice Fetches the latest price from the given Oracle.
    /// @dev This function is used to get the latest price from the tokenOracle or nativeAssetOracle.
    /// @param _oracle The Oracle contract to fetch the price from.
    /// @return price The latest price fetched from the Oracle.
    function fetchPrice(IOracle _oracle) internal view returns (uint192 price) {
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = _oracle.latestRoundData();
        require(answer > 0, "PP-ERC20 : Chainlink price <= 0");
        // 2 days old price is considered stale since the price is updated every 24 hours
        require(updatedAt >= block.timestamp - 60 * 60 * 24 * 2, "PP-ERC20 : Incomplete round");
        require(answeredInRound >= roundId, "PP-ERC20 : Stale price");
        price = uint192(int192(answer));
    }

    /// @notice Switch the validatePaymasterUserOp mode by typeId
    /// @dev This function is used to switch the correct pay type and exec validation of user op
    /// @param userOp The user operation data.
    /// @param requiredPreFund The amount of tokens required for pre-funding.
    /// @return context The context containing the token amount and user sender address (if applicable).
    /// @return validationResult A uint256 value indicating the result of the validation (always 0 in this implementation).
    function _validatePaymasterUserOp(UserOperation calldata userOp, bytes32 /*userOpHash*/, uint256 requiredPreFund)
    internal override returns (bytes memory context, uint256 validationData) {
        uint8 typeId = uint8(bytes1(userOp.paymasterAndData[TYPE_OFFSET: VALID_TIMESTAMP_OFFSET]));
        require(typeId < 2, "PaymasterV1: invalid mode.");
        if (typeId == 0) {
            return  _verifyingPaymasterUserOp(userOp, requiredPreFund);
        }
        else if (typeId == 1) {
            return  _ERC20PaymasterUserOp(userOp, requiredPreFund);
        }
    }
    
    /// @notice Switch the correct post op logic by typeId
    /// @dev This function is called after a user operation has been executed or reverted.
    /// @param mode The post-operation mode (either successful or reverted).
    /// @param context The context containing the token amount and user sender address.
    /// @param actualGasCost The actual gas cost of the transaction.
    function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override 
    {
        uint8 typeId= uint8(bytes1(context[:1]));
        require(typeId < 2, "PaymasterV1: invalid mode.");
        if (typeId == 0) {
            return  super._postOp(mode, context, actualGasCost);
        }
        else if (typeId == 1) {
            return  _ERC20PostOp(mode, context, actualGasCost);
        }
    }
}
