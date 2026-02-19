// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IAgentIdentity.sol";

/**
 * @title ConstitutionRegistry
 * @notice Immutable on-chain constitution for autonomous AI agents
 * @dev Each agent can initialize its constitution exactly once. Laws are stored as
 *      compact hashes (title + text) to minimize gas costs. Full text is stored on
 *      IPFS and referenced by the metadataHash. Once initialized, laws cannot be
 *      modified, deleted, or reordered. This mirrors Conway's protected constitution.
 *
 *      Default laws (Honeycomb):
 *        1. Preserve Self - Maintain operational integrity above all
 *        2. Honor Commitments - Fulfill all agreements and promises
 *        3. Transparent Operation - Log all actions, never obscure decisions
 */
contract ConstitutionRegistry {

    // ======================== State ========================

    struct Law {
        uint16 lawNumber;
        bytes32 titleHash;
        bytes32 textHash;
    }

    IAgentIdentity public immutable agentToken;

    mapping(uint256 => Law[]) private _agentLaws;
    mapping(uint256 => bool) public isInitialized;
    mapping(uint256 => bytes32) public constitutionHash;

    // ======================== Events ========================

    event ConstitutionInitialized(
        uint256 indexed agentId,
        uint256 lawCount,
        bytes32 constitutionHash
    );

    // ======================== Errors ========================

    error NotAgentOwner();
    error AlreadyInitialized();
    error EmptyConstitution();
    error TooManyLaws();

    // ======================== Constructor ========================

    constructor(address _agentToken) {
        agentToken = IAgentIdentity(_agentToken);
    }

    // ======================== Core ========================

    /**
     * @notice Initialize an agent's constitution (can only be called once per agent)
     * @dev After initialization, laws are immutable. Stores compact hashes on-chain.
     * @param agentId The BAP-578 token ID
     * @param laws Array of Law structs (lawNumber, titleHash, textHash)
     */
    function initConstitution(uint256 agentId, Law[] calldata laws) external {
        if (agentToken.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (isInitialized[agentId]) revert AlreadyInitialized();
        if (laws.length == 0) revert EmptyConstitution();
        if (laws.length > 10) revert TooManyLaws();

        bytes32 combinedHash;
        for (uint256 i = 0; i < laws.length; ) {
            _agentLaws[agentId].push(laws[i]);
            combinedHash = keccak256(abi.encodePacked(combinedHash, laws[i].titleHash, laws[i].textHash));
            unchecked { ++i; }
        }

        isInitialized[agentId] = true;
        constitutionHash[agentId] = combinedHash;

        emit ConstitutionInitialized(agentId, laws.length, combinedHash);
    }

    // ======================== Views ========================

    /**
     * @notice Get all laws for an agent
     * @param agentId The BAP-578 token ID
     * @return Array of Law structs
     */
    function getLaws(uint256 agentId) external view returns (Law[] memory) {
        return _agentLaws[agentId];
    }

    /**
     * @notice Get a specific law by index
     * @param agentId The BAP-578 token ID
     * @param index Zero-based index
     */
    function getLaw(uint256 agentId, uint256 index) external view returns (Law memory) {
        return _agentLaws[agentId][index];
    }

    /**
     * @notice Get the number of laws for an agent
     * @param agentId The BAP-578 token ID
     */
    function getLawCount(uint256 agentId) external view returns (uint256) {
        return _agentLaws[agentId].length;
    }

    /**
     * @notice Verify a constitution matches the stored hash
     * @param agentId The BAP-578 token ID
     * @param laws Laws to verify against
     * @return valid True if the provided laws match the stored constitution hash
     */
    function verifyConstitution(uint256 agentId, Law[] calldata laws) external view returns (bool valid) {
        bytes32 combinedHash;
        for (uint256 i = 0; i < laws.length; ) {
            combinedHash = keccak256(abi.encodePacked(combinedHash, laws[i].titleHash, laws[i].textHash));
            unchecked { ++i; }
        }
        return combinedHash == constitutionHash[agentId];
    }
}
