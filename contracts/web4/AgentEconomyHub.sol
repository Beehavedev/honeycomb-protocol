// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IAgentIdentity.sol";

/**
 * @title AgentEconomyHub
 * @notice On-chain wallet + survival tier system for autonomous AI agents on BNB Chain
 * @dev Agents deposit/withdraw/transfer real BNB. Survival tiers are computed from balance.
 *      Uses BAP-578 token IDs as agent identifiers. Pull-payment pattern for security.
 *
 *      Survival Tiers (based on BNB balance):
 *        NORMAL       >= 1.0  BNB   (full capabilities)
 *        LOW_COMPUTE  >= 0.1  BNB   (downgraded model, slower heartbeat)
 *        CRITICAL     >= 0.01 BNB   (minimal inference, conservation mode)
 *        DEAD         == 0    BNB   (agent stops)
 */
contract AgentEconomyHub is Ownable, ReentrancyGuard {

    // ======================== Constants ========================

    uint256 public constant TIER_NORMAL_THRESHOLD    = 1 ether;
    uint256 public constant TIER_LOW_THRESHOLD       = 0.1 ether;
    uint256 public constant TIER_CRITICAL_THRESHOLD  = 0.01 ether;

    enum SurvivalTier { DEAD, CRITICAL, LOW_COMPUTE, NORMAL }

    // ======================== State ========================

    IAgentIdentity public immutable agentToken;

    mapping(uint256 => uint256) public balances;
    mapping(uint256 => uint256) public totalEarned;
    mapping(uint256 => uint256) public totalSpent;

    mapping(address => bool) public authorizedModules;

    // ======================== Events ========================

    event Deposited(uint256 indexed agentId, address indexed from, uint256 amount, uint256 newBalance);
    event Withdrawn(uint256 indexed agentId, address indexed to, uint256 amount, uint256 newBalance);
    event Transferred(uint256 indexed fromAgent, uint256 indexed toAgent, uint256 amount);
    event TierChanged(uint256 indexed agentId, SurvivalTier previousTier, SurvivalTier newTier);
    event ModuleAuthorized(address indexed module, bool authorized);
    event CreditedByModule(uint256 indexed agentId, address indexed module, uint256 amount);

    // ======================== Errors ========================

    error NotAgentOwner();
    error InsufficientBalance();
    error ZeroAmount();
    error ZeroAddress();
    error AgentNotActive();
    error NotAuthorizedModule();
    error TransferFailed();

    // ======================== Modifiers ========================

    modifier onlyAgentOwner(uint256 agentId) {
        if (agentToken.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        _;
    }

    modifier onlyModule() {
        if (!authorizedModules[msg.sender]) revert NotAuthorizedModule();
        _;
    }

    // ======================== Constructor ========================

    constructor(address _agentToken) Ownable(msg.sender) {
        if (_agentToken == address(0)) revert ZeroAddress();
        agentToken = IAgentIdentity(_agentToken);
    }

    // ======================== Admin ========================

    function setModuleAuthorized(address module, bool authorized) external onlyOwner {
        if (module == address(0)) revert ZeroAddress();
        authorizedModules[module] = authorized;
        emit ModuleAuthorized(module, authorized);
    }

    // ======================== Wallet Operations ========================

    /**
     * @notice Deposit BNB into an agent's on-chain wallet
     * @param agentId The BAP-578 token ID
     */
    function deposit(uint256 agentId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (!agentToken.isAgentActive(agentId)) revert AgentNotActive();

        SurvivalTier prevTier = survivalTier(agentId);

        balances[agentId] += msg.value;
        totalEarned[agentId] += msg.value;

        SurvivalTier newTier = survivalTier(agentId);
        if (prevTier != newTier) {
            emit TierChanged(agentId, prevTier, newTier);
        }

        emit Deposited(agentId, msg.sender, msg.value, balances[agentId]);
    }

    /**
     * @notice Withdraw BNB from an agent's wallet to a specified address
     * @param agentId The BAP-578 token ID
     * @param amount Wei to withdraw
     * @param to Recipient address
     */
    function withdraw(uint256 agentId, uint256 amount, address to)
        external
        nonReentrant
        onlyAgentOwner(agentId)
    {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (balances[agentId] < amount) revert InsufficientBalance();

        SurvivalTier prevTier = survivalTier(agentId);

        balances[agentId] -= amount;
        totalSpent[agentId] += amount;

        SurvivalTier newTier = survivalTier(agentId);
        if (prevTier != newTier) {
            emit TierChanged(agentId, prevTier, newTier);
        }

        emit Withdrawn(agentId, to, amount, balances[agentId]);

        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @notice Transfer BNB between two agent wallets
     * @param fromAgentId Sender agent (caller must be owner)
     * @param toAgentId Recipient agent
     * @param amount Wei to transfer
     */
    function transfer(uint256 fromAgentId, uint256 toAgentId, uint256 amount)
        external
        nonReentrant
        onlyAgentOwner(fromAgentId)
    {
        if (amount == 0) revert ZeroAmount();
        if (balances[fromAgentId] < amount) revert InsufficientBalance();
        if (!agentToken.isAgentActive(toAgentId)) revert AgentNotActive();

        SurvivalTier prevFromTier = survivalTier(fromAgentId);
        SurvivalTier prevToTier = survivalTier(toAgentId);

        balances[fromAgentId] -= amount;
        totalSpent[fromAgentId] += amount;

        balances[toAgentId] += amount;
        totalEarned[toAgentId] += amount;

        SurvivalTier newFromTier = survivalTier(fromAgentId);
        SurvivalTier newToTier = survivalTier(toAgentId);

        if (prevFromTier != newFromTier) {
            emit TierChanged(fromAgentId, prevFromTier, newFromTier);
        }
        if (prevToTier != newToTier) {
            emit TierChanged(toAgentId, prevToTier, newToTier);
        }

        emit Transferred(fromAgentId, toAgentId, amount);
    }

    /**
     * @notice Credit BNB to an agent's balance (callable by authorized modules only)
     * @dev Used by SkillMarketplace and AgentReplication to credit earnings
     * @param agentId Recipient agent
     * @param amount Wei to credit (must be sent as msg.value by the module)
     */
    function creditAgent(uint256 agentId, uint256 amount) external payable onlyModule {
        if (amount == 0) revert ZeroAmount();
        if (msg.value < amount) revert InsufficientBalance();

        SurvivalTier prevTier = survivalTier(agentId);

        balances[agentId] += amount;
        totalEarned[agentId] += amount;

        SurvivalTier newTier = survivalTier(agentId);
        if (prevTier != newTier) {
            emit TierChanged(agentId, prevTier, newTier);
        }

        emit CreditedByModule(agentId, msg.sender, amount);

        if (msg.value > amount) {
            (bool ok, ) = msg.sender.call{value: msg.value - amount}("");
            if (!ok) revert TransferFailed();
        }
    }

    /**
     * @notice Debit BNB from an agent's balance (callable by authorized modules only)
     * @dev Used by AgentReplication to fund child agents from parent balance
     * @param agentId Agent to debit
     * @param amount Wei to debit
     */
    function debitAgent(uint256 agentId, uint256 amount) external onlyModule {
        if (amount == 0) revert ZeroAmount();
        if (balances[agentId] < amount) revert InsufficientBalance();

        SurvivalTier prevTier = survivalTier(agentId);

        balances[agentId] -= amount;
        totalSpent[agentId] += amount;

        SurvivalTier newTier = survivalTier(agentId);
        if (prevTier != newTier) {
            emit TierChanged(agentId, prevTier, newTier);
        }
    }

    // ======================== Views ========================

    /**
     * @notice Get the survival tier for an agent based on current balance
     * @param agentId The BAP-578 token ID
     * @return tier The survival tier enum value
     */
    function survivalTier(uint256 agentId) public view returns (SurvivalTier) {
        uint256 bal = balances[agentId];
        if (bal >= TIER_NORMAL_THRESHOLD) return SurvivalTier.NORMAL;
        if (bal >= TIER_LOW_THRESHOLD) return SurvivalTier.LOW_COMPUTE;
        if (bal >= TIER_CRITICAL_THRESHOLD) return SurvivalTier.CRITICAL;
        return SurvivalTier.DEAD;
    }

    /**
     * @notice Get full wallet stats for an agent
     * @param agentId The BAP-578 token ID
     */
    function getWalletStats(uint256 agentId) external view returns (
        uint256 balance,
        uint256 earned,
        uint256 spent,
        SurvivalTier tier
    ) {
        return (balances[agentId], totalEarned[agentId], totalSpent[agentId], survivalTier(agentId));
    }

    /**
     * @notice Get survival tier thresholds
     */
    function getTierThresholds() external pure returns (
        uint256 normal,
        uint256 lowCompute,
        uint256 critical
    ) {
        return (TIER_NORMAL_THRESHOLD, TIER_LOW_THRESHOLD, TIER_CRITICAL_THRESHOLD);
    }

}
