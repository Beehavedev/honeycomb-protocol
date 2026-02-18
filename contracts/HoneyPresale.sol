// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HoneyPresale
 * @notice Presale contract for $HONEY token on BNB Smart Chain
 * @dev Supports multiple phases (private/public), whitelist, per-wallet caps,
 *      progressive pricing tiers, referral tracking, and Gnosis Safe treasury
 *
 * Flow: Private Presale (whitelisted) → Public Presale (open) → Token Launch
 * Funds are forwarded to a configurable Gnosis Safe multisig treasury
 */
contract HoneyPresale is Ownable, ReentrancyGuard {

    struct Phase {
        string name;
        PhaseType phaseType;
        uint256 tokenPrice;       // price in wei per token (18 decimals)
        uint256 hardCapBnb;       // max BNB for this phase (18 decimals)
        uint256 softCapBnb;       // min BNB target (18 decimals)
        uint256 minContribution;  // min BNB per tx (18 decimals)
        uint256 maxContribution;  // max BNB per wallet total (18 decimals)
        uint256 totalTokens;      // total tokens available (18 decimals)
        uint256 startTime;
        uint256 endTime;
        uint256 totalRaisedBnb;
        uint256 totalTokensSold;
        uint256 participants;
        bool paused;
        bool exists;
    }

    enum PhaseType { PRIVATE, PUBLIC }

    address public treasury;   // Gnosis Safe multisig address
    uint256 public phaseCount;
    bool public presaleFinalized;

    mapping(uint256 => Phase) public phases;
    mapping(uint256 => mapping(address => bool)) public whitelisted;
    mapping(uint256 => mapping(address => uint256)) public contributions;  // phaseId => wallet => totalBnb
    mapping(uint256 => mapping(address => uint256)) public tokenAllocations; // phaseId => wallet => tokens
    mapping(address => string) public referralCodes;  // wallet => code
    mapping(string => address) public codeToReferrer;  // code => wallet
    mapping(string => uint256) public referralBonuses;  // code => total bonus tokens earned

    event PhaseCreated(uint256 indexed phaseId, string name, PhaseType phaseType);
    event PhaseUpdated(uint256 indexed phaseId);
    event PhasePaused(uint256 indexed phaseId, bool paused);
    event Contributed(
        uint256 indexed phaseId,
        address indexed contributor,
        uint256 bnbAmount,
        uint256 tokensReceived,
        string referralCode
    );
    event WhitelistUpdated(uint256 indexed phaseId, address[] wallets, bool status);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FundsForwarded(address indexed treasury, uint256 amount);
    event PresaleFinalized(uint256 totalRaised);

    error PhaseNotActive();
    error PhaseNotExists();
    error NotWhitelisted();
    error BelowMinContribution();
    error ExceedsMaxContribution();
    error ExceedsHardCap();
    error PresaleAlreadyFinalized();
    error InvalidTreasury();
    error InvalidPhaseParams();
    error NothingToWithdraw();

    constructor(address _treasury) Ownable(msg.sender) {
        if (_treasury == address(0)) revert InvalidTreasury();
        treasury = _treasury;
    }

    // ============= Admin Functions =============

    function createPhase(
        string calldata _name,
        PhaseType _phaseType,
        uint256 _tokenPrice,
        uint256 _hardCapBnb,
        uint256 _softCapBnb,
        uint256 _minContribution,
        uint256 _maxContribution,
        uint256 _totalTokens,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner returns (uint256) {
        if (_tokenPrice == 0 || _hardCapBnb == 0 || _totalTokens == 0) revert InvalidPhaseParams();
        if (_startTime >= _endTime) revert InvalidPhaseParams();
        if (_minContribution > _maxContribution) revert InvalidPhaseParams();

        uint256 phaseId = phaseCount++;
        Phase storage p = phases[phaseId];
        p.name = _name;
        p.phaseType = _phaseType;
        p.tokenPrice = _tokenPrice;
        p.hardCapBnb = _hardCapBnb;
        p.softCapBnb = _softCapBnb;
        p.minContribution = _minContribution;
        p.maxContribution = _maxContribution;
        p.totalTokens = _totalTokens;
        p.startTime = _startTime;
        p.endTime = _endTime;
        p.exists = true;

        emit PhaseCreated(phaseId, _name, _phaseType);
        return phaseId;
    }

    function pausePhase(uint256 _phaseId, bool _paused) external onlyOwner {
        if (!phases[_phaseId].exists) revert PhaseNotExists();
        phases[_phaseId].paused = _paused;
        emit PhasePaused(_phaseId, _paused);
    }

    function setWhitelist(uint256 _phaseId, address[] calldata _wallets, bool _status) external onlyOwner {
        if (!phases[_phaseId].exists) revert PhaseNotExists();
        for (uint256 i = 0; i < _wallets.length; i++) {
            whitelisted[_phaseId][_wallets[i]] = _status;
        }
        emit WhitelistUpdated(_phaseId, _wallets, _status);
    }

    function setTreasury(address _newTreasury) external onlyOwner {
        if (_newTreasury == address(0)) revert InvalidTreasury();
        address old = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }

    function forwardFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();
        (bool sent, ) = treasury.call{value: balance}("");
        require(sent, "Transfer failed");
        emit FundsForwarded(treasury, balance);
    }

    function finalizePresale() external onlyOwner {
        if (presaleFinalized) revert PresaleAlreadyFinalized();
        presaleFinalized = true;

        uint256 totalRaised;
        for (uint256 i = 0; i < phaseCount; i++) {
            totalRaised += phases[i].totalRaisedBnb;
        }

        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool sent, ) = treasury.call{value: balance}("");
            require(sent, "Transfer failed");
            emit FundsForwarded(treasury, balance);
        }

        emit PresaleFinalized(totalRaised);
    }

    // ============= User Functions =============

    function contribute(uint256 _phaseId, string calldata _referralCode) external payable nonReentrant {
        if (presaleFinalized) revert PresaleAlreadyFinalized();
        Phase storage p = phases[_phaseId];
        if (!p.exists) revert PhaseNotExists();
        if (p.paused || block.timestamp < p.startTime || block.timestamp > p.endTime) revert PhaseNotActive();

        if (p.phaseType == PhaseType.PRIVATE && !whitelisted[_phaseId][msg.sender]) revert NotWhitelisted();

        uint256 amount = msg.value;
        if (amount < p.minContribution) revert BelowMinContribution();

        uint256 walletTotal = contributions[_phaseId][msg.sender] + amount;
        if (walletTotal > p.maxContribution) revert ExceedsMaxContribution();

        if (p.totalRaisedBnb + amount > p.hardCapBnb) revert ExceedsHardCap();

        uint256 tokens = (amount * 1e18) / p.tokenPrice;
        if (p.totalTokensSold + tokens > p.totalTokens) revert ExceedsHardCap();

        if (contributions[_phaseId][msg.sender] == 0) {
            p.participants++;
        }

        contributions[_phaseId][msg.sender] = walletTotal;
        tokenAllocations[_phaseId][msg.sender] += tokens;
        p.totalRaisedBnb += amount;
        p.totalTokensSold += tokens;

        emit Contributed(_phaseId, msg.sender, amount, tokens, _referralCode);
    }

    function registerReferralCode(string calldata _code) external {
        require(bytes(_code).length > 0 && bytes(_code).length <= 20, "Invalid code length");
        require(codeToReferrer[_code] == address(0), "Code already taken");
        referralCodes[msg.sender] = _code;
        codeToReferrer[_code] = msg.sender;
    }

    // ============= View Functions =============

    function getPhase(uint256 _phaseId) external view returns (Phase memory) {
        return phases[_phaseId];
    }

    function getContribution(uint256 _phaseId, address _wallet) external view returns (uint256 bnb, uint256 tokens) {
        return (contributions[_phaseId][_wallet], tokenAllocations[_phaseId][_wallet]);
    }

    function isWhitelisted(uint256 _phaseId, address _wallet) external view returns (bool) {
        return whitelisted[_phaseId][_wallet];
    }

    function getPresaleStats() external view returns (
        uint256 totalRaised,
        uint256 totalTokens,
        uint256 totalParticipants,
        uint256 totalPhases
    ) {
        for (uint256 i = 0; i < phaseCount; i++) {
            totalRaised += phases[i].totalRaisedBnb;
            totalTokens += phases[i].totalTokensSold;
            totalParticipants += phases[i].participants;
        }
        return (totalRaised, totalTokens, totalParticipants, phaseCount);
    }

    receive() external payable {}
}
