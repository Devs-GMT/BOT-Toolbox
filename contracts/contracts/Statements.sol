// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Statements
/// @notice A public, append-only record of signed statements. The contract
///         recovers the signer itself, so nobody can record a signature on
///         behalf of an address that did not produce it.
/// @dev Two signing modes share one entry point, both are EIP-191 personal_sign:
///      - Public text: the wallet signs the readable text. `messageHash` must be
///        keccak256(text) and the signature is checked against the standard
///        "\x19Ethereum Signed Message:\n<byte length><text>" digest. Wallets show
///        the text exactly as the user reads it.
///      - Hash only (empty `text`): the wallet signs the 32 raw bytes of
///        `messageHash`, checked against toEthSignedMessageHash(bytes32). The text
///        stays private; only its hash is public.
///      No owner, no admin, no payments, no upgrade path.
contract Statements {
    struct Statement {
        address signer;
        bytes32 messageHash;
        bytes signature;
        string text;
        uint64 at;
    }

    /// @notice Maximum length of the public text, in bytes.
    uint256 public constant MAX_TEXT_LENGTH = 280;

    Statement[] public statements;
    mapping(bytes32 => uint256[]) private byHash;
    mapping(address => uint256[]) private bySigner;

    event Recorded(uint256 indexed id, address indexed signer, bytes32 indexed messageHash);

    error TextTooLong(uint256 length);
    error TextHashMismatch(bytes32 expected, bytes32 given);
    error StatementNotFound(uint256 id);

    /// @notice Record a signed statement.
    /// @param messageHash keccak256 of the text (public mode) or of the private message (hash-only mode).
    /// @param signature 65-byte EIP-191 signature (r, s, v).
    /// @param text Optional public text, up to 280 bytes. Leave empty for hash-only mode.
    /// @return id Index of the new statement.
    function record(bytes32 messageHash, bytes calldata signature, string calldata text)
        external
        returns (uint256 id)
    {
        bytes memory textBytes = bytes(text);
        if (textBytes.length > MAX_TEXT_LENGTH) revert TextTooLong(textBytes.length);

        bytes32 digest;
        if (textBytes.length > 0) {
            bytes32 textHash = keccak256(textBytes);
            if (textHash != messageHash) revert TextHashMismatch(textHash, messageHash);
            digest = MessageHashUtils.toEthSignedMessageHash(textBytes);
        } else {
            digest = MessageHashUtils.toEthSignedMessageHash(messageHash);
        }

        // Reverts on malformed signatures, high-s (malleable) signatures and address(0).
        address signer = ECDSA.recover(digest, signature);

        id = statements.length;
        statements.push(
            Statement({
                signer: signer,
                messageHash: messageHash,
                signature: signature,
                text: text,
                at: uint64(block.timestamp)
            })
        );
        byHash[messageHash].push(id);
        bySigner[signer].push(id);

        emit Recorded(id, signer, messageHash);
    }

    /// @notice Number of recorded statements.
    function total() external view returns (uint256) {
        return statements.length;
    }

    /// @notice Read one statement. Reverts if the id does not exist.
    function getStatement(uint256 id) external view returns (Statement memory) {
        if (id >= statements.length) revert StatementNotFound(id);
        return statements[id];
    }

    /// @notice Ids of every statement recorded for a message hash.
    function statementsFor(bytes32 messageHash) external view returns (uint256[] memory) {
        return byHash[messageHash];
    }

    /// @notice Ids of every statement signed by an address.
    function statementsBy(address signer) external view returns (uint256[] memory) {
        return bySigner[signer];
    }
}
