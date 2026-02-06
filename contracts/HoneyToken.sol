// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HoneyToken
 * @notice $HONEY - The native utility token of the Honeycomb platform on BNB Smart Chain
 * @dev BEP-20 token with 1 billion fixed supply (no minting after deployment),
 *      anti-bot protections, and deflationary burn mechanics
 *
 * Use cases:
 *   - Prediction Duels: Stake $HONEY with reduced fees (5% vs 10% BNB)
 *   - Token Launchpad: Pay launch fees, get priority access to bonding curves
 *   - Bounty System: Post/claim bounties in $HONEY
 *   - AI Agent Marketplace: Price agents in $HONEY with reduced marketplace fees
 *   - NFA Trading: Trade BAP-578 agents with $HONEY, fee waiver
 *   - Staking: Lock $HONEY for tier benefits (Drone/Worker/Guardian/Queen)
 *   - Governance: Vote on platform parameters
 *   - Points Conversion: Convert earned points to $HONEY
 */
contract HoneyToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    uint256 public maxTransactionAmount;
    uint256 public maxWalletAmount;
    bool public tradingEnabled;
    bool public limitsEnabled;

    uint256 public cooldownTime;
    mapping(address => uint256) public lastTransferTime;

    mapping(address => bool) public isExcludedFromLimits;

    uint256 public totalBurned;

    error TradingNotEnabled();
    error MaxTransactionExceeded();
    error MaxWalletExceeded();
    error CooldownActive();
    error ZeroAddress();

    event TradingEnabled(uint256 timestamp);
    event LimitsUpdated(uint256 maxTx, uint256 maxWallet);
    event LimitsRemoved(uint256 timestamp);
    event TokensBurned(address indexed burner, uint256 amount, uint256 totalBurned);
    event CooldownUpdated(uint256 cooldownSeconds);

    constructor() ERC20("Honey Token", "HONEY") Ownable(msg.sender) {
        maxTransactionAmount = TOTAL_SUPPLY * 1 / 100; // 1% of supply
        maxWalletAmount = TOTAL_SUPPLY * 2 / 100; // 2% of supply
        cooldownTime = 30; // 30 seconds between transfers
        limitsEnabled = true;

        isExcludedFromLimits[msg.sender] = true;
        isExcludedFromLimits[address(this)] = true;
        isExcludedFromLimits[address(0)] = true;

        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /**
     * @notice Burn tokens and track total burned for deflationary stats
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount, totalBurned);
    }

    /**
     * @notice Burn tokens from an allowance and track total burned
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit TokensBurned(account, amount, totalBurned);
    }

    /**
     * @notice Enable trading (one-way, cannot be disabled)
     */
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled(block.timestamp);
    }

    /**
     * @notice Update transaction and wallet limits
     */
    function updateLimits(uint256 _maxTx, uint256 _maxWallet) external onlyOwner {
        maxTransactionAmount = _maxTx;
        maxWalletAmount = _maxWallet;
        emit LimitsUpdated(_maxTx, _maxWallet);
    }

    /**
     * @notice Remove all limits permanently
     */
    function removeLimits() external onlyOwner {
        limitsEnabled = false;
        emit LimitsRemoved(block.timestamp);
    }

    /**
     * @notice Update cooldown period
     */
    function setCooldownTime(uint256 _seconds) external onlyOwner {
        cooldownTime = _seconds;
        emit CooldownUpdated(_seconds);
    }

    /**
     * @notice Exclude address from limits (DEX pairs, contracts)
     */
    function setExcludedFromLimits(address _address, bool _excluded) external onlyOwner {
        isExcludedFromLimits[_address] = _excluded;
    }

    /**
     * @notice Override transfer to enforce anti-bot protections
     */
    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) {
            if (!tradingEnabled) {
                if (!isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
                    revert TradingNotEnabled();
                }
            }

            if (limitsEnabled && !isExcludedFromLimits[from] && !isExcludedFromLimits[to]) {
                if (amount > maxTransactionAmount) revert MaxTransactionExceeded();
                if (balanceOf(to) + amount > maxWalletAmount) revert MaxWalletExceeded();

                if (cooldownTime > 0) {
                    if (block.timestamp < lastTransferTime[from] + cooldownTime) revert CooldownActive();
                    lastTransferTime[from] = block.timestamp;
                }
            }
        }

        super._update(from, to, amount);
    }

    /**
     * @notice Get circulating supply (total minus burned)
     */
    function circulatingSupply() external view returns (uint256) {
        return totalSupply();
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
