// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================
// Flattened HoneycombPredictDuel.sol
// Contract: 0x8A3698513850b6dEFA68dD59f4D7DC5E8c2e2650
// Network: BNB Smart Chain Mainnet (Chain ID 56)
// ============================================

// --- Source: node_modules/@openzeppelin/contracts/access/IAccessControl.sol ---

// OpenZeppelin Contracts (last updated v5.4.0) (access/IAccessControl.sol)


/**
 * @dev External interface of AccessControl declared to support ERC-165 detection.
 */
interface IAccessControl {
    /**
     * @dev The `account` is missing a role.
     */
    error AccessControlUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The caller of a function is not the expected one.
     *
     * NOTE: Don't confuse with {AccessControlUnauthorizedAccount}.
     */
    error AccessControlBadConfirmation();

    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted to signal this.
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call. This account bears the admin role (for the granted role).
     * Expected in cases where the role was granted using the internal {AccessControl-_grantRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {AccessControl-_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     */
    function renounceRole(bytes32 role, address callerConfirmation) external;
}

// --- Source: node_modules/@openzeppelin/contracts/utils/Context.sol ---

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)


/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// --- Source: node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol ---

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)


/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// --- Source: node_modules/@openzeppelin/contracts/utils/introspection/ERC165.sol ---

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/ERC165.sol)



/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC-165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 */
abstract contract ERC165 is IERC165 {
    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

// --- Source: node_modules/@openzeppelin/contracts/access/AccessControl.sol ---

// OpenZeppelin Contracts (last updated v5.4.0) (access/AccessControl.sol)



/**
 * @dev Contract module that allows children to implement role-based access
 * control mechanisms. This is a lightweight version that doesn't allow enumerating role
 * members except through off-chain means by accessing the contract event logs. Some
 * applications may benefit from on-chain enumerability, for those cases see
 * {AccessControlEnumerable}.
 *
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```solidity
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 *
 * Roles can be used to represent a set of permissions. To restrict access to a
 * function call, use {hasRole}:
 *
 * ```solidity
 * function foo() public {
 *     require(hasRole(MY_ROLE, msg.sender));
 *     ...
 * }
 * ```
 *
 * Roles can be granted and revoked dynamically via the {grantRole} and
 * {revokeRole} functions. Each role has an associated admin role, and only
 * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
 *
 * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
 * that only accounts with this role will be able to grant or revoke other
 * roles. More complex role relationships can be created by using
 * {_setRoleAdmin}.
 *
 * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
 * grant and revoke this role. Extra precautions should be taken to secure
 * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
 * to enforce additional security measures for this role.
 */
abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address account => bool) hasRole;
        bytes32 adminRole;
    }

    mapping(bytes32 role => RoleData) private _roles;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with an {AccessControlUnauthorizedAccount} error including the required role.
     */
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IAccessControl).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual returns (bool) {
        return _roles[role].hasRole[account];
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `_msgSender()`
     * is missing `role`. Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, _msgSender());
    }

    /**
     * @dev Reverts with an {AccessControlUnauthorizedAccount} error if `account`
     * is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert AccessControlUnauthorizedAccount(account, role);
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view virtual returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     *
     * May emit a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) public virtual onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been revoked `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `callerConfirmation`.
     *
     * May emit a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address callerConfirmation) public virtual {
        if (callerConfirmation != _msgSender()) {
            revert AccessControlBadConfirmation();
        }

        _revokeRole(role, callerConfirmation);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Attempts to grant `role` to `account` and returns a boolean indicating if `role` was granted.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleGranted} event.
     */
    function _grantRole(bytes32 role, address account) internal virtual returns (bool) {
        if (!hasRole(role, account)) {
            _roles[role].hasRole[account] = true;
            emit RoleGranted(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Attempts to revoke `role` from `account` and returns a boolean indicating if `role` was revoked.
     *
     * Internal function without access restriction.
     *
     * May emit a {RoleRevoked} event.
     */
    function _revokeRole(bytes32 role, address account) internal virtual returns (bool) {
        if (hasRole(role, account)) {
            _roles[role].hasRole[account] = false;
            emit RoleRevoked(role, account, _msgSender());
            return true;
        } else {
            return false;
        }
    }
}

// --- Source: node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol ---

// OpenZeppelin Contracts (last updated v5.1.0) (utils/ReentrancyGuard.sol)


/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// --- Source: contracts/HoneycombPredictDuel.sol ---

interface IAgentRegistry {
    function isAgentOwner(address owner, uint256 agentId) external view returns (bool);
    function agentExists(uint256 agentId) external view returns (bool);
}

// VRF Consumer interface for random duels
interface IVRFConsumer {
    function requestRandomWords(uint256 duelId) external returns (uint256 requestId);
}

/**
 * @title HoneycombPredictDuel
 * @notice On-chain prediction duels for cryptocurrency price betting + VRF random duels
 * @dev 1v1 duels with BNB escrow - 90% to winner, 10% platform fee
 */
contract HoneycombPredictDuel is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant VRF_ROLE = keccak256("VRF_ROLE");

    enum DuelStatus { OPEN, LIVE, PENDING_VRF, SETTLED, CANCELLED, EXPIRED }
    enum Direction { UP, DOWN }
    enum DuelType { PRICE, RANDOM }

    struct Duel {
        uint256 id;
        string assetId;
        DuelType duelType;
        uint256 creatorAgentId;
        address creatorAddress;
        Direction creatorDirection;
        uint256 stakeAmount;
        uint256 durationSeconds;
        uint256 joinerAgentId;
        address joinerAddress;
        uint256 startPrice;
        uint256 endPrice;
        uint256 startTs;
        uint256 endTs;
        DuelStatus status;
        address winner;
        uint256 payout;
        uint256 fee;
        uint256 createdAt;
        uint256 vrfRequestId;
        uint256 vrfRandomWord;
    }

    IAgentRegistry public agentRegistry;
    IVRFConsumer public vrfConsumer;
    address public feeTreasury;
    uint256 public feePercentage = 10;
    
    uint256 private _nextDuelId = 1;
    
    mapping(uint256 => Duel) public duels;
    mapping(uint256 => bool) public duelExists;
    mapping(uint256 => uint256) public vrfRequestToDuel; // VRF requestId => duelId

    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant MAX_STAKE = 100 ether;
    uint256 public constant MIN_DURATION = 1 minutes;
    uint256 public constant MAX_DURATION = 7 days;

    event DuelCreated(
        uint256 indexed duelId,
        uint256 indexed creatorAgentId,
        address indexed creator,
        string assetId,
        uint8 direction,
        uint8 duelType,
        uint256 stakeAmount,
        uint256 durationSeconds,
        uint256 timestamp
    );

    event DuelJoined(
        uint256 indexed duelId,
        uint256 indexed joinerAgentId,
        address indexed joiner,
        uint256 startPrice,
        uint256 startTs,
        uint256 endTs,
        uint256 timestamp
    );

    event DuelSettled(
        uint256 indexed duelId,
        address indexed winner,
        uint256 endPrice,
        uint256 payout,
        uint256 fee,
        uint256 timestamp
    );

    event RandomDuelSettled(
        uint256 indexed duelId,
        address indexed winner,
        uint256 randomWord,
        uint256 payout,
        uint256 fee,
        uint256 timestamp
    );

    event RandomnessRequested(
        uint256 indexed duelId,
        uint256 indexed requestId,
        uint256 timestamp
    );

    event RandomnessFulfilled(
        uint256 indexed duelId,
        uint256 indexed requestId,
        uint256 randomWord,
        uint256 timestamp
    );

    event DuelCancelled(
        uint256 indexed duelId,
        address indexed creator,
        uint256 refundAmount,
        uint256 timestamp
    );

    event DuelExpired(
        uint256 indexed duelId,
        uint256 refundAmount,
        uint256 timestamp
    );

    event FeeTransferred(
        uint256 indexed duelId,
        address indexed treasury,
        uint256 amount,
        uint256 timestamp
    );

    error DuelNotFound();
    error DuelNotOpen();
    error DuelNotLive();
    error DuelNotEnded();
    error DuelAlreadyEnded();
    error NotDuelCreator();
    error NotAgentOwner();
    error AgentNotFound();
    error InvalidStakeAmount();
    error InvalidDuration();
    error InvalidAssetId();
    error CannotJoinOwnDuel();
    error TransferFailed();
    error InvalidFeePercentage();
    error ZeroAddress();
    error StakeMismatch();
    error NoWinner();
    error InvalidDuelType();
    error VRFNotConfigured();
    error InvalidVRFRequest();
    error DuelNotPendingVRF();

    constructor(address _agentRegistry, address _feeTreasury) {
        if (_agentRegistry == address(0)) revert ZeroAddress();
        if (_feeTreasury == address(0)) revert ZeroAddress();
        
        agentRegistry = IAgentRegistry(_agentRegistry);
        feeTreasury = _feeTreasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
        _grantRole(VRF_ROLE, msg.sender);
    }

    /**
     * @notice Create a new prediction duel with escrowed stake
     * @param agentId The creator's agent ID
     * @param assetId Asset symbol (e.g., "BTC", "ETH", "BNB")
     * @param direction Creator's prediction (0 = UP, 1 = DOWN)
     * @param durationSeconds Duration of the duel once started
     */
    function createDuel(
        uint256 agentId,
        string calldata assetId,
        Direction direction,
        uint256 durationSeconds
    ) 
        external 
        payable 
        nonReentrant 
        returns (uint256 duelId) 
    {
        return _createDuel(agentId, assetId, direction, durationSeconds, DuelType.PRICE);
    }

    /**
     * @notice Create a new duel with specified type (PRICE or RANDOM)
     * @param agentId The creator's agent ID
     * @param assetId Asset symbol (e.g., "BTC", "ETH", "BNB") - used for display in RANDOM duels
     * @param direction Creator's prediction (0 = UP, 1 = DOWN)
     * @param durationSeconds Duration of the duel once started
     * @param duelType 0 = PRICE (oracle-settled), 1 = RANDOM (VRF-settled)
     */
    function createDuelWithType(
        uint256 agentId,
        string calldata assetId,
        Direction direction,
        uint256 durationSeconds,
        DuelType duelType
    ) 
        external 
        payable 
        nonReentrant 
        returns (uint256 duelId) 
    {
        if (duelType == DuelType.RANDOM && address(vrfConsumer) == address(0)) {
            revert VRFNotConfigured();
        }
        return _createDuel(agentId, assetId, direction, durationSeconds, duelType);
    }

    function _createDuel(
        uint256 agentId,
        string calldata assetId,
        Direction direction,
        uint256 durationSeconds,
        DuelType duelType
    ) 
        internal 
        returns (uint256 duelId) 
    {
        if (!agentRegistry.agentExists(agentId)) revert AgentNotFound();
        if (!agentRegistry.isAgentOwner(msg.sender, agentId)) revert NotAgentOwner();
        if (bytes(assetId).length == 0) revert InvalidAssetId();
        if (msg.value < MIN_STAKE || msg.value > MAX_STAKE) revert InvalidStakeAmount();
        if (durationSeconds < MIN_DURATION || durationSeconds > MAX_DURATION) revert InvalidDuration();

        duelId = _nextDuelId++;
        
        duels[duelId] = Duel({
            id: duelId,
            assetId: assetId,
            duelType: duelType,
            creatorAgentId: agentId,
            creatorAddress: msg.sender,
            creatorDirection: direction,
            stakeAmount: msg.value,
            durationSeconds: durationSeconds,
            joinerAgentId: 0,
            joinerAddress: address(0),
            startPrice: 0,
            endPrice: 0,
            startTs: 0,
            endTs: 0,
            status: DuelStatus.OPEN,
            winner: address(0),
            payout: 0,
            fee: 0,
            createdAt: block.timestamp,
            vrfRequestId: 0,
            vrfRandomWord: 0
        });
        
        duelExists[duelId] = true;

        emit DuelCreated(
            duelId,
            agentId,
            msg.sender,
            assetId,
            uint8(direction),
            uint8(duelType),
            msg.value,
            durationSeconds,
            block.timestamp
        );
    }

    /**
     * @notice Join an open duel by matching the stake
     * @param duelId The duel to join
     * @param agentId The joiner's agent ID
     * @param startPrice Current price of the asset (set by oracle/backend)
     */
    function joinDuel(
        uint256 duelId,
        uint256 agentId,
        uint256 startPrice
    ) 
        external 
        payable 
        nonReentrant 
    {
        if (!duelExists[duelId]) revert DuelNotFound();
        
        Duel storage duel = duels[duelId];
        if (duel.status != DuelStatus.OPEN) revert DuelNotOpen();
        
        if (!agentRegistry.agentExists(agentId)) revert AgentNotFound();
        if (!agentRegistry.isAgentOwner(msg.sender, agentId)) revert NotAgentOwner();
        if (duel.creatorAgentId == agentId) revert CannotJoinOwnDuel();
        if (msg.value != duel.stakeAmount) revert StakeMismatch();

        duel.joinerAgentId = agentId;
        duel.joinerAddress = msg.sender;
        duel.startPrice = startPrice;
        duel.startTs = block.timestamp;
        duel.endTs = block.timestamp + duel.durationSeconds;
        duel.status = DuelStatus.LIVE;

        emit DuelJoined(
            duelId,
            agentId,
            msg.sender,
            startPrice,
            duel.startTs,
            duel.endTs,
            block.timestamp
        );
    }

    /**
     * @notice Settle a live PRICE duel after it ends (oracle/admin only)
     * @param duelId The duel to settle
     * @param endPrice Final price of the asset
     */
    function settleDuel(uint256 duelId, uint256 endPrice) 
        external 
        nonReentrant
        onlyRole(ORACLE_ROLE)
    {
        if (!duelExists[duelId]) revert DuelNotFound();
        
        Duel storage duel = duels[duelId];
        if (duel.status != DuelStatus.LIVE) revert DuelNotLive();
        if (block.timestamp < duel.endTs) revert DuelNotEnded();
        if (duel.duelType != DuelType.PRICE) revert InvalidDuelType();

        duel.endPrice = endPrice;
        duel.status = DuelStatus.SETTLED;

        uint256 pot = duel.stakeAmount * 2;
        uint256 fee = (pot * feePercentage) / 100;
        uint256 payout = pot - fee;

        address winner;
        if (endPrice > duel.startPrice) {
            winner = duel.creatorDirection == Direction.UP ? duel.creatorAddress : duel.joinerAddress;
        } else if (endPrice < duel.startPrice) {
            winner = duel.creatorDirection == Direction.DOWN ? duel.creatorAddress : duel.joinerAddress;
        } else {
            duel.payout = duel.stakeAmount;
            duel.fee = 0;
            (bool s1, ) = duel.creatorAddress.call{value: duel.stakeAmount}("");
            (bool s2, ) = duel.joinerAddress.call{value: duel.stakeAmount}("");
            if (!s1 || !s2) revert TransferFailed();
            
            emit DuelSettled(duelId, address(0), endPrice, 0, 0, block.timestamp);
            return;
        }

        duel.winner = winner;
        duel.payout = payout;
        duel.fee = fee;

        (bool successWinner, ) = winner.call{value: payout}("");
        if (!successWinner) revert TransferFailed();

        (bool successFee, ) = feeTreasury.call{value: fee}("");
        if (!successFee) revert TransferFailed();

        emit FeeTransferred(duelId, feeTreasury, fee, block.timestamp);
        emit DuelSettled(duelId, winner, endPrice, payout, fee, block.timestamp);
    }

    /**
     * @notice Request VRF randomness for a RANDOM duel (oracle/admin only)
     * @param duelId The duel to settle via VRF
     */
    function requestRandomSettlement(uint256 duelId) 
        external 
        nonReentrant
        onlyRole(ORACLE_ROLE)
    {
        if (!duelExists[duelId]) revert DuelNotFound();
        if (address(vrfConsumer) == address(0)) revert VRFNotConfigured();
        
        Duel storage duel = duels[duelId];
        if (duel.status != DuelStatus.LIVE) revert DuelNotLive();
        if (block.timestamp < duel.endTs) revert DuelNotEnded();
        if (duel.duelType != DuelType.RANDOM) revert InvalidDuelType();

        duel.status = DuelStatus.PENDING_VRF;
        
        uint256 requestId = vrfConsumer.requestRandomWords(duelId);
        duel.vrfRequestId = requestId;
        vrfRequestToDuel[requestId] = duelId;

        emit RandomnessRequested(duelId, requestId, block.timestamp);
    }

    /**
     * @notice Callback from VRF consumer with random result
     * @param requestId The VRF request ID
     * @param randomWord The random number from VRF
     */
    function fulfillRandomness(uint256 requestId, uint256 randomWord) 
        external 
        nonReentrant
        onlyRole(VRF_ROLE)
    {
        uint256 duelId = vrfRequestToDuel[requestId];
        if (duelId == 0) revert InvalidVRFRequest();
        
        Duel storage duel = duels[duelId];
        if (duel.status != DuelStatus.PENDING_VRF) revert DuelNotPendingVRF();
        
        // Replay protection: clear the mapping to prevent re-fulfillment
        delete vrfRequestToDuel[requestId];

        duel.vrfRandomWord = randomWord;
        duel.status = DuelStatus.SETTLED;

        emit RandomnessFulfilled(duelId, requestId, randomWord, block.timestamp);

        uint256 pot = duel.stakeAmount * 2;
        uint256 fee = (pot * feePercentage) / 100;
        uint256 payout = pot - fee;

        // randomWord % 2: 0 = UP wins, 1 = DOWN wins
        bool upWins = (randomWord % 2) == 0;
        address winner;
        
        if (upWins) {
            winner = duel.creatorDirection == Direction.UP ? duel.creatorAddress : duel.joinerAddress;
        } else {
            winner = duel.creatorDirection == Direction.DOWN ? duel.creatorAddress : duel.joinerAddress;
        }

        duel.winner = winner;
        duel.payout = payout;
        duel.fee = fee;

        (bool successWinner, ) = winner.call{value: payout}("");
        if (!successWinner) revert TransferFailed();

        (bool successFee, ) = feeTreasury.call{value: fee}("");
        if (!successFee) revert TransferFailed();

        emit FeeTransferred(duelId, feeTreasury, fee, block.timestamp);
        emit RandomDuelSettled(duelId, winner, randomWord, payout, fee, block.timestamp);
    }

    /**
     * @notice Cancel an open duel before anyone joins
     * @param duelId The duel to cancel
     */
    function cancelDuel(uint256 duelId) 
        external 
        nonReentrant 
    {
        if (!duelExists[duelId]) revert DuelNotFound();
        
        Duel storage duel = duels[duelId];
        if (duel.status != DuelStatus.OPEN) revert DuelNotOpen();
        if (duel.creatorAddress != msg.sender) revert NotDuelCreator();

        duel.status = DuelStatus.CANCELLED;

        uint256 refund = duel.stakeAmount;
        (bool success, ) = duel.creatorAddress.call{value: refund}("");
        if (!success) revert TransferFailed();

        emit DuelCancelled(duelId, duel.creatorAddress, refund, block.timestamp);
    }

    /**
     * @notice Expire an open duel that hasn't been joined (admin/oracle)
     * @param duelId The duel to expire
     */
    function expireDuel(uint256 duelId) 
        external 
        nonReentrant
        onlyRole(ORACLE_ROLE)
    {
        if (!duelExists[duelId]) revert DuelNotFound();
        
        Duel storage duel = duels[duelId];
        if (duel.status != DuelStatus.OPEN) revert DuelNotOpen();

        duel.status = DuelStatus.EXPIRED;

        uint256 refund = duel.stakeAmount;
        (bool success, ) = duel.creatorAddress.call{value: refund}("");
        if (!success) revert TransferFailed();

        emit DuelExpired(duelId, refund, block.timestamp);
    }

    /**
     * @notice Get duel details
     */
    function getDuel(uint256 duelId) 
        external 
        view 
        returns (Duel memory) 
    {
        if (!duelExists[duelId]) revert DuelNotFound();
        return duels[duelId];
    }

    /**
     * @notice Get total number of duels
     */
    function totalDuels() external view returns (uint256) {
        return _nextDuelId - 1;
    }

    /**
     * @notice Update fee treasury address (admin only)
     */
    function setFeeTreasury(address _feeTreasury) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (_feeTreasury == address(0)) revert ZeroAddress();
        feeTreasury = _feeTreasury;
    }

    /**
     * @notice Update fee percentage (admin only)
     */
    function setFeePercentage(uint256 _feePercentage) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (_feePercentage > 50) revert InvalidFeePercentage();
        feePercentage = _feePercentage;
    }

    /**
     * @notice Update agent registry address (admin only)
     */
    function setAgentRegistry(address _agentRegistry) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        if (_agentRegistry == address(0)) revert ZeroAddress();
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Set VRF consumer contract address (admin only)
     */
    function setVRFConsumer(address _vrfConsumer) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        vrfConsumer = IVRFConsumer(_vrfConsumer);
    }
}

