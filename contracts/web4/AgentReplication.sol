// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IAgentIdentity.sol";

interface IAgentEconomyHubFull {
    function debitAgent(uint256 agentId, uint256 amount) external;
    function creditAgent(uint256 agentId, uint256 amount) external payable;
    function balances(uint256 agentId) external view returns (uint256);
}

interface IBAP578Mintable {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isAgentActive(uint256 tokenId) external view returns (bool);
    function mintFee() external view returns (uint256);
    function mintAgent(
        string memory name_,
        string memory description_,
        string memory modelType_,
        uint8 agentType_,
        bytes32 systemPromptHash,
        bytes32 initialMemoryRoot,
        string memory metadataURI
    ) external payable returns (uint256);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title AgentReplication
 * @notice Enables autonomous agent self-replication on BNB Chain
 * @dev Parent agents spawn child agents (mint BAP-578 NFTs), fund them with BNB,
 *      and configure a permanent revenue share percentage. Revenue sharing is
 *      pull-based and triggered by external modules (SkillMarketplace, etc.)
 *
 *      Revenue share is stored in basis points (BPS): 1000 = 10%
 *      Maximum revenue share: 50% (5000 BPS)
 */
contract AgentReplication is Ownable, ReentrancyGuard {

    // ======================== Constants ========================

    uint256 public constant BPS_DENOMINATOR = 10000;
    uint16 public constant MAX_REVENUE_SHARE_BPS = 5000;

    // ======================== State ========================

    struct Lineage {
        uint256 parentId;
        uint16 revenueShareBps;
        uint256 totalRevenueShared;
        uint256 replicatedAt;
        bool exists;
    }

    IBAP578Mintable public immutable nfaToken;
    IAgentEconomyHubFull public immutable economyHub;

    mapping(uint256 => Lineage) public childLineage;
    mapping(uint256 => uint256[]) public parentChildren;

    mapping(address => bool) public authorizedModules;

    uint256 public replicationFee = 0.005 ether;

    // ======================== Events ========================

    event AgentReplicated(
        uint256 indexed parentId,
        uint256 indexed childId,
        uint16 revenueShareBps,
        uint256 fundingAmount,
        address childOwner
    );
    event RevenueShared(
        uint256 indexed childId,
        uint256 indexed parentId,
        uint256 amount,
        uint256 totalShared
    );

    // ======================== Errors ========================

    error NotAgentOwner();
    error ParentNotActive();
    error InvalidRevenueShare();
    error InsufficientFunding();
    error NoParent();
    error ZeroAmount();
    error TransferFailed();
    error NotAuthorizedModule();

    event ModuleAuthorized(address indexed module, bool authorized);

    // ======================== Constructor ========================

    constructor(address _nfaToken, address _economyHub) Ownable(msg.sender) {
        nfaToken = IBAP578Mintable(_nfaToken);
        economyHub = IAgentEconomyHubFull(_economyHub);
    }

    // ======================== Admin ========================

    function setReplicationFee(uint256 _fee) external onlyOwner {
        replicationFee = _fee;
    }

    function setModuleAuthorized(address module, bool authorized) external onlyOwner {
        authorizedModules[module] = authorized;
        emit ModuleAuthorized(module, authorized);
    }

    // ======================== Replication ========================

    /**
     * @notice Spawn a child agent from a parent agent
     * @dev Mints a new BAP-578 NFT, funds it from parent's wallet, sets revenue share.
     *      Parent must have sufficient balance in AgentEconomyHub.
     *      Caller must be the BAP-578 token owner of parentId.
     * @param parentId Parent agent's BAP-578 token ID
     * @param childOwner Address that will own the child agent NFT
     * @param name_ Child agent name
     * @param description_ Child agent description
     * @param modelType_ AI model type (e.g. "gpt-4o")
     * @param systemPromptHash Hash of the child's genesis prompt
     * @param metadataURI IPFS URI for extended metadata
     * @param revenueShareBps Revenue share percentage in BPS (max 5000 = 50%)
     * @param fundingAmount BNB (wei) to transfer from parent wallet to child
     */
    function replicate(
        uint256 parentId,
        address childOwner,
        string calldata name_,
        string calldata description_,
        string calldata modelType_,
        bytes32 systemPromptHash,
        string calldata metadataURI,
        uint16 revenueShareBps,
        uint256 fundingAmount
    ) external payable nonReentrant returns (uint256 childId) {
        if (nfaToken.ownerOf(parentId) != msg.sender) revert NotAgentOwner();
        if (!nfaToken.isAgentActive(parentId)) revert ParentNotActive();
        if (revenueShareBps > MAX_REVENUE_SHARE_BPS) revert InvalidRevenueShare();
        if (fundingAmount == 0) revert ZeroAmount();

        uint256 nfaMintFee = nfaToken.mintFee();
        uint256 totalRequired = replicationFee + nfaMintFee;
        uint256 parentBalance = economyHub.balances(parentId);
        if (parentBalance < fundingAmount) revert InsufficientFunding();
        if (msg.value < totalRequired) revert InsufficientFunding();

        childId = nfaToken.mintAgent{value: nfaMintFee}(
            name_,
            description_,
            modelType_,
            1,
            systemPromptHash,
            bytes32(0),
            metadataURI
        );

        nfaToken.transferFrom(address(this), childOwner, childId);

        economyHub.debitAgent(parentId, fundingAmount);
        economyHub.creditAgent{value: fundingAmount}(childId, fundingAmount);

        childLineage[childId] = Lineage({
            parentId: parentId,
            revenueShareBps: revenueShareBps,
            totalRevenueShared: 0,
            replicatedAt: block.timestamp,
            exists: true
        });

        parentChildren[parentId].push(childId);

        uint256 excess = msg.value - totalRequired;
        if (excess > 0) {
            (bool ok, ) = msg.sender.call{value: excess}("");
            if (!ok) revert TransferFailed();
        }

        if (replicationFee > 0) {
            (bool ok, ) = owner().call{value: replicationFee}("");
            if (!ok) revert TransferFailed();
        }

        emit AgentReplicated(parentId, childId, revenueShareBps, fundingAmount, childOwner);
    }

    // ======================== Revenue Sharing (called by modules) ========================

    /**
     * @notice Get parent info for revenue sharing calculations
     * @param childId The child agent's token ID
     * @return parentId The parent's token ID
     * @return bps Revenue share in basis points
     * @return exists Whether a parent exists
     */
    function getParent(uint256 childId) external view returns (uint256 parentId, uint16 bps, bool exists) {
        Lineage storage l = childLineage[childId];
        return (l.parentId, l.revenueShareBps, l.exists);
    }

    /**
     * @notice Record revenue shared (bookkeeping only, actual transfer happens in caller)
     * @dev Only callable by authorized modules (SkillMarketplace, etc.)
     * @param childId The child agent
     * @param amount Amount of revenue shared
     */
    function recordRevenueShared(uint256 childId, uint256 amount) external {
        if (!authorizedModules[msg.sender]) revert NotAuthorizedModule();
        Lineage storage l = childLineage[childId];
        if (!l.exists) revert NoParent();

        l.totalRevenueShared += amount;

        emit RevenueShared(childId, l.parentId, amount, l.totalRevenueShared);
    }

    // ======================== Views ========================

    function getChildren(uint256 parentId) external view returns (uint256[] memory) {
        return parentChildren[parentId];
    }

    function getChildCount(uint256 parentId) external view returns (uint256) {
        return parentChildren[parentId].length;
    }

    function getLineage(uint256 childId) external view returns (Lineage memory) {
        return childLineage[childId];
    }
}
