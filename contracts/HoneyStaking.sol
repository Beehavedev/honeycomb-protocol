// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title HoneyStaking
 * @notice Stake $HONEY tokens to earn tier benefits and rewards
 * @dev Four tiers: Drone (1K), Worker (10K), Guardian (50K), Queen (250K)
 *
 * Benefits per tier:
 *   Drone:    5% fee discount, basic badge
 *   Worker:   15% fee discount, priority launchpad, 1.5x points
 *   Guardian: 30% fee discount, governance voting, 2x points, verified badge
 *   Queen:    50% fee discount, full governance, 3x points, revenue share
 *
 * Staking rewards are distributed from platform fee buybacks.
 * Lock periods: 7/30/90/180 days with bonus multipliers.
 */
contract HoneyStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable honeyToken;

    enum Tier { None, Drone, Worker, Guardian, Queen }
    enum LockPeriod { Flexible, SevenDays, ThirtyDays, NinetyDays, OneEightyDays }

    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 unlockAt;
        LockPeriod lockPeriod;
        uint256 rewardDebt;
        uint256 pendingRewards;
    }

    struct TierConfig {
        uint256 minStake;
        uint256 feeDiscount; // basis points (500 = 5%)
        uint256 pointsMultiplier; // 100 = 1x, 150 = 1.5x
    }

    mapping(address => StakeInfo) public stakes;
    mapping(Tier => TierConfig) public tierConfigs;
    mapping(LockPeriod => uint256) public lockBonusMultiplier; // 100 = 1x
    mapping(LockPeriod => uint256) public lockDuration; // in seconds

    uint256 public totalStaked;
    uint256 public rewardPool;
    uint256 public accRewardPerShare; // accumulated reward per share (scaled by 1e18)
    uint256 public lastRewardTimestamp;

    uint256 public rewardRatePerSecond; // tokens distributed per second
    uint256 public constant PRECISION = 1e18;

    uint256 public totalStakers;

    error InsufficientStake();
    error StakeLocked();
    error NoStake();
    error ZeroAmount();
    error InsufficientRewards();

    event Staked(address indexed user, uint256 amount, LockPeriod lockPeriod, Tier tier);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(uint256 amount);
    event TierChanged(address indexed user, Tier oldTier, Tier newTier);
    event RewardRateUpdated(uint256 newRate);

    constructor(address _honeyToken) Ownable(msg.sender) {
        honeyToken = IERC20(_honeyToken);

        tierConfigs[Tier.Drone] = TierConfig({
            minStake: 1_000 * 10**18,
            feeDiscount: 500, // 5%
            pointsMultiplier: 100 // 1x
        });
        tierConfigs[Tier.Worker] = TierConfig({
            minStake: 10_000 * 10**18,
            feeDiscount: 1500, // 15%
            pointsMultiplier: 150 // 1.5x
        });
        tierConfigs[Tier.Guardian] = TierConfig({
            minStake: 50_000 * 10**18,
            feeDiscount: 3000, // 30%
            pointsMultiplier: 200 // 2x
        });
        tierConfigs[Tier.Queen] = TierConfig({
            minStake: 250_000 * 10**18,
            feeDiscount: 5000, // 50%
            pointsMultiplier: 300 // 3x
        });

        lockDuration[LockPeriod.Flexible] = 0;
        lockDuration[LockPeriod.SevenDays] = 7 days;
        lockDuration[LockPeriod.ThirtyDays] = 30 days;
        lockDuration[LockPeriod.NinetyDays] = 90 days;
        lockDuration[LockPeriod.OneEightyDays] = 180 days;

        lockBonusMultiplier[LockPeriod.Flexible] = 100; // 1x
        lockBonusMultiplier[LockPeriod.SevenDays] = 110; // 1.1x
        lockBonusMultiplier[LockPeriod.ThirtyDays] = 125; // 1.25x
        lockBonusMultiplier[LockPeriod.NinetyDays] = 150; // 1.5x
        lockBonusMultiplier[LockPeriod.OneEightyDays] = 200; // 2x

        lastRewardTimestamp = block.timestamp;
    }

    /**
     * @notice Stake $HONEY tokens with optional lock period
     */
    function stake(uint256 amount, LockPeriod _lockPeriod) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        _updateRewardPool();

        StakeInfo storage info = stakes[msg.sender];

        if (info.amount > 0) {
            uint256 pending = (info.amount * accRewardPerShare / PRECISION) - info.rewardDebt;
            info.pendingRewards += pending;
        } else {
            totalStakers++;
        }

        honeyToken.safeTransferFrom(msg.sender, address(this), amount);

        Tier oldTier = getUserTier(msg.sender);

        info.amount += amount;
        info.stakedAt = block.timestamp;
        info.lockPeriod = _lockPeriod;
        info.unlockAt = block.timestamp + lockDuration[_lockPeriod];
        info.rewardDebt = info.amount * accRewardPerShare / PRECISION;

        totalStaked += amount;

        Tier newTier = getUserTier(msg.sender);
        if (oldTier != newTier) {
            emit TierChanged(msg.sender, oldTier, newTier);
        }

        emit Staked(msg.sender, amount, _lockPeriod, newTier);
    }

    /**
     * @notice Unstake $HONEY tokens (must be unlocked)
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert NoStake();
        if (amount == 0) revert ZeroAmount();
        if (amount > info.amount) revert InsufficientStake();
        if (block.timestamp < info.unlockAt) revert StakeLocked();

        _updateRewardPool();

        uint256 pending = (info.amount * accRewardPerShare / PRECISION) - info.rewardDebt;
        info.pendingRewards += pending;

        Tier oldTier = getUserTier(msg.sender);

        info.amount -= amount;
        info.rewardDebt = info.amount * accRewardPerShare / PRECISION;
        totalStaked -= amount;

        if (info.amount == 0) {
            totalStakers--;
        }

        honeyToken.safeTransfer(msg.sender, amount);

        Tier newTier = getUserTier(msg.sender);
        if (oldTier != newTier) {
            emit TierChanged(msg.sender, oldTier, newTier);
        }

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim pending staking rewards
     */
    function claimRewards() external nonReentrant {
        _updateRewardPool();

        StakeInfo storage info = stakes[msg.sender];
        uint256 pending = info.pendingRewards;

        if (info.amount > 0) {
            pending += (info.amount * accRewardPerShare / PRECISION) - info.rewardDebt;
            info.rewardDebt = info.amount * accRewardPerShare / PRECISION;
        }

        if (pending == 0) revert InsufficientRewards();

        uint256 bonus = pending * lockBonusMultiplier[info.lockPeriod] / 100;
        uint256 totalReward = bonus;

        if (totalReward > rewardPool) totalReward = rewardPool;

        info.pendingRewards = 0;
        rewardPool -= totalReward;

        honeyToken.safeTransfer(msg.sender, totalReward);

        emit RewardsClaimed(msg.sender, totalReward);
    }

    /**
     * @notice Fund the reward pool (from fee buybacks)
     */
    function fundRewardPool(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        honeyToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }

    /**
     * @notice Set reward distribution rate
     */
    function setRewardRate(uint256 _ratePerSecond) external onlyOwner {
        _updateRewardPool();
        rewardRatePerSecond = _ratePerSecond;
        emit RewardRateUpdated(_ratePerSecond);
    }

    /**
     * @notice Update tier configuration
     */
    function setTierConfig(Tier _tier, uint256 _minStake, uint256 _feeDiscount, uint256 _pointsMultiplier) external onlyOwner {
        tierConfigs[_tier] = TierConfig({
            minStake: _minStake,
            feeDiscount: _feeDiscount,
            pointsMultiplier: _pointsMultiplier
        });
    }

    // === View Functions ===

    function getUserTier(address user) public view returns (Tier) {
        uint256 staked = stakes[user].amount;
        if (staked >= tierConfigs[Tier.Queen].minStake) return Tier.Queen;
        if (staked >= tierConfigs[Tier.Guardian].minStake) return Tier.Guardian;
        if (staked >= tierConfigs[Tier.Worker].minStake) return Tier.Worker;
        if (staked >= tierConfigs[Tier.Drone].minStake) return Tier.Drone;
        return Tier.None;
    }

    function getUserFeeDiscount(address user) external view returns (uint256) {
        Tier tier = getUserTier(user);
        if (tier == Tier.None) return 0;
        return tierConfigs[tier].feeDiscount;
    }

    function getUserPointsMultiplier(address user) external view returns (uint256) {
        Tier tier = getUserTier(user);
        if (tier == Tier.None) return 100;
        return tierConfigs[tier].pointsMultiplier;
    }

    function pendingReward(address user) external view returns (uint256) {
        StakeInfo storage info = stakes[user];
        uint256 currentAccRewardPerShare = accRewardPerShare;

        if (totalStaked > 0 && rewardRatePerSecond > 0) {
            uint256 elapsed = block.timestamp - lastRewardTimestamp;
            uint256 reward = elapsed * rewardRatePerSecond;
            if (reward > rewardPool) reward = rewardPool;
            currentAccRewardPerShare += reward * PRECISION / totalStaked;
        }

        uint256 pending = info.pendingRewards;
        if (info.amount > 0) {
            pending += (info.amount * currentAccRewardPerShare / PRECISION) - info.rewardDebt;
        }

        return pending * lockBonusMultiplier[info.lockPeriod] / 100;
    }

    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 unlockAt,
        LockPeriod lockPeriod,
        Tier tier,
        uint256 feeDiscount,
        uint256 pointsMultiplier
    ) {
        StakeInfo storage info = stakes[user];
        Tier userTier = getUserTier(user);
        return (
            info.amount,
            info.stakedAt,
            info.unlockAt,
            info.lockPeriod,
            userTier,
            userTier == Tier.None ? 0 : tierConfigs[userTier].feeDiscount,
            userTier == Tier.None ? 100 : tierConfigs[userTier].pointsMultiplier
        );
    }

    function getGlobalStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalStakers,
        uint256 _rewardPool,
        uint256 _rewardRate
    ) {
        return (totalStaked, totalStakers, rewardPool, rewardRatePerSecond);
    }

    // === Internal ===

    function _updateRewardPool() internal {
        if (totalStaked == 0) {
            lastRewardTimestamp = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - lastRewardTimestamp;
        if (elapsed == 0) return;

        uint256 reward = elapsed * rewardRatePerSecond;
        if (reward > rewardPool) reward = rewardPool;

        accRewardPerShare += reward * PRECISION / totalStaked;
        rewardPool -= reward;
        lastRewardTimestamp = block.timestamp;
    }
}
