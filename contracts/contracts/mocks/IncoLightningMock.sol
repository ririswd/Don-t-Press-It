// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ebool} from "@inco/lightning/src/Types.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {IIncoVerifier} from "@inco/lightning/src/interfaces/IIncoVerifier.sol";

/// @dev Test-only stand-in for the canonical Inco executor. It represents
/// encrypted handles as uint256 values so the game lifecycle can be tested
/// deterministically without impersonating the Inco TEE.
contract IncoLightningMock {
    function getFee() external pure returns (uint256) {
        return 1;
    }

    function newEbool(bytes calldata input, address) external payable returns (ebool) {
        require(msg.value == 1, "Fee not paid");
        return ebool.wrap(input.length > 0 && input[0] != bytes1(0) ? bytes32(uint256(1)) : bytes32(0));
    }

    function asEuint256(uint256 value) external pure returns (bytes32) {
        return bytes32(value);
    }

    function eAdd(bytes32 left, bytes32 right) external pure returns (bytes32) {
        return bytes32(uint256(left) + uint256(right));
    }

    function eMul(bytes32 left, bytes32 right) external pure returns (bytes32) {
        return bytes32(uint256(left) * uint256(right));
    }

    function eEq(bytes32 left, bytes32 right) external pure returns (ebool) {
        return ebool.wrap(uint256(left) == uint256(right) ? bytes32(uint256(1)) : bytes32(0));
    }

    function eIfThenElse(ebool condition, bytes32 ifTrue, bytes32 ifFalse) external pure returns (bytes32) {
        return ebool.unwrap(condition) == bytes32(uint256(1)) ? ifTrue : ifFalse;
    }

    function allow(bytes32, address) external pure {}

    function reveal(bytes32) external pure {}

    function incoVerifier() external view returns (IIncoVerifier) {
        return IIncoVerifier(address(this));
    }

    function isValidDecryptionAttestation(DecryptionAttestation memory, bytes[] memory) external pure returns (bool) {
        return true;
    }

    /// @dev `ETypes` selectors vary between Lightning release artifacts. This
    /// test-only executor treats an unrecognised encrypted operation as an
    /// identity operation, returning its first encrypted-handle argument.
    /// Production calls always reach Inco's canonical executor instead.
    fallback() external {
        assembly ("memory-safe") {
            mstore(0, calldataload(4))
            return(0, 32)
        }
    }
}
