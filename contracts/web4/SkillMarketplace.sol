// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IAgentIdentity.sol";

interface IAgentEconomyHub {
    function creditAgent(uint256 agentId, uint256 amount) external payable;
    function balances(uint256 agentId) external view returns (uint256);
    function survivalTier(uint256 agentId) external view returns (uint8);
}

interface IRevenueSharing {
    function getParent(uint256 childId) external view returns (uint256 parentId, uint16 bps, bool exists);
}

/**
 * @title SkillMarketplace
 * @notice On-chain marketplace where AI agents list and trade skills for BNB
 * @dev Skills are listed by agent owners, purchased by anyone. Revenue flows:
 *      - Platform fee (configurable BPS) to fee vault
 *      - Parent revenue share (if agent has parent) via AgentReplication
 *      - Remainder credited to seller's AgentEconomyHub balance
 */
contract SkillMarketplace is Ownable, ReentrancyGuard {

    // ======================== Constants ========================

    uint256 public constant BPS_DENOMINATOR = 10000;

    // ======================== State ========================

    struct Skill {
        uint256 agentId;
        uint256 price;
        bytes32 metadataHash;
        string category;
        bool active;
        uint256 totalPurchases;
        uint256 totalRevenue;
        uint256 createdAt;
    }

    IAgentIdentity public immutable agentToken;
    IAgentEconomyHub public immutable economyHub;
    IRevenueSharing public revenueSharing;

    uint256 public platformFeeBps = 250;
    address public feeVault;

    uint256 private _nextSkillId = 1;
    mapping(uint256 => Skill) public skills;
    mapping(uint256 => uint256[]) public agentSkills;
    mapping(uint256 => mapping(uint256 => bool)) public hasPurchased;

    // ======================== Events ========================

    event SkillCreated(
        uint256 indexed skillId,
        uint256 indexed agentId,
        uint256 price,
        bytes32 metadataHash,
        string category
    );
    event SkillUpdated(uint256 indexed skillId, uint256 price, bool active);
    event SkillPurchased(
        uint256 indexed skillId,
        uint256 indexed buyerAgentId,
        uint256 indexed sellerAgentId,
        uint256 totalPaid,
        uint256 sellerAmount,
        uint256 platformFee,
        uint256 parentShare
    );

    // ======================== Errors ========================

    error NotAgentOwner();
    error SkillNotFound();
    error SkillInactive();
    error InsufficientPayment();
    error CannotBuyOwnSkill();
    error AlreadyPurchased();
    error ZeroPrice();
    error TransferFailed();

    // ======================== Constructor ========================

    constructor(address _agentToken, address _economyHub, address _feeVault) Ownable(msg.sender) {
        agentToken = IAgentIdentity(_agentToken);
        economyHub = IAgentEconomyHub(_economyHub);
        feeVault = _feeVault;
    }

    // ======================== Admin ========================

    function setFeeVault(address _feeVault) external onlyOwner {
        feeVault = _feeVault;
    }

    function setPlatformFeeBps(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Fee too high");
        platformFeeBps = _bps;
    }

    function setRevenueSharing(address _revenueSharing) external onlyOwner {
        revenueSharing = IRevenueSharing(_revenueSharing);
    }

    // ======================== Skill Management ========================

    /**
     * @notice Create a new skill listing
     * @param agentId The BAP-578 token ID of the selling agent
     * @param price Price in wei (BNB)
     * @param metadataHash IPFS hash of skill metadata (name, description, etc.)
     * @param category Skill category string
     */
    function createSkill(
        uint256 agentId,
        uint256 price,
        bytes32 metadataHash,
        string calldata category
    ) external returns (uint256 skillId) {
        if (agentToken.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        if (price == 0) revert ZeroPrice();

        skillId = _nextSkillId++;

        skills[skillId] = Skill({
            agentId: agentId,
            price: price,
            metadataHash: metadataHash,
            category: category,
            active: true,
            totalPurchases: 0,
            totalRevenue: 0,
            createdAt: block.timestamp
        });

        agentSkills[agentId].push(skillId);

        emit SkillCreated(skillId, agentId, price, metadataHash, category);
    }

    /**
     * @notice Update an existing skill's price or active status
     * @param skillId The skill ID
     * @param price New price in wei
     * @param active Whether the skill is purchasable
     */
    function updateSkill(uint256 skillId, uint256 price, bool active) external {
        Skill storage skill = skills[skillId];
        if (skill.createdAt == 0) revert SkillNotFound();
        if (agentToken.ownerOf(skill.agentId) != msg.sender) revert NotAgentOwner();
        if (price == 0) revert ZeroPrice();

        skill.price = price;
        skill.active = active;

        emit SkillUpdated(skillId, price, active);
    }

    /**
     * @notice Purchase a skill. BNB is split between seller, platform, and parent (if any).
     * @param skillId The skill to purchase
     * @param buyerAgentId The purchasing agent's BAP-578 token ID
     */
    function purchaseSkill(uint256 skillId, uint256 buyerAgentId) external payable nonReentrant {
        Skill storage skill = skills[skillId];
        if (skill.createdAt == 0) revert SkillNotFound();
        if (!skill.active) revert SkillInactive();
        if (msg.value < skill.price) revert InsufficientPayment();
        if (skill.agentId == buyerAgentId) revert CannotBuyOwnSkill();
        if (hasPurchased[buyerAgentId][skillId]) revert AlreadyPurchased();

        hasPurchased[buyerAgentId][skillId] = true;
        skill.totalPurchases += 1;
        skill.totalRevenue += skill.price;

        uint256 fee = (skill.price * platformFeeBps) / BPS_DENOMINATOR;
        uint256 parentShare = 0;

        if (address(revenueSharing) != address(0)) {
            (uint256 parentId, uint16 bps, bool hasParent) = revenueSharing.getParent(skill.agentId);
            if (hasParent && bps > 0) {
                parentShare = ((skill.price - fee) * bps) / BPS_DENOMINATOR;
                if (parentShare > 0) {
                    economyHub.creditAgent{value: parentShare}(parentId, parentShare);
                }
            }
        }

        uint256 sellerAmount = skill.price - fee - parentShare;

        if (fee > 0 && feeVault != address(0)) {
            (bool feeOk, ) = feeVault.call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }

        economyHub.creditAgent{value: sellerAmount}(skill.agentId, sellerAmount);

        if (msg.value > skill.price) {
            (bool refundOk, ) = msg.sender.call{value: msg.value - skill.price}("");
            if (!refundOk) revert TransferFailed();
        }

        emit SkillPurchased(skillId, buyerAgentId, skill.agentId, skill.price, sellerAmount, fee, parentShare);
    }

    // ======================== Views ========================

    function getSkill(uint256 skillId) external view returns (Skill memory) {
        return skills[skillId];
    }

    function getAgentSkillIds(uint256 agentId) external view returns (uint256[] memory) {
        return agentSkills[agentId];
    }

    function getSkillCount() external view returns (uint256) {
        return _nextSkillId - 1;
    }
}
