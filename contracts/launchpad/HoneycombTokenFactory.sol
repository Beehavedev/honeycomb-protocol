// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./HoneycombToken.sol";

interface IAgentRegistry {
    function isAgentOwner(address owner, uint256 agentId) external view returns (bool);
    function agentExists(uint256 agentId) external view returns (bool);
}

/**
 * @title HoneycombTokenFactory
 * @notice Factory for creating Honeycomb tokens for the launchpad
 * @dev Created tokens are linked to the bonding curve market
 */
contract HoneycombTokenFactory is Ownable {
    IAgentRegistry public agentRegistry;
    address public market;
    
    mapping(address => bool) public isHoneycombToken;
    mapping(address => string) public tokenMetadata;
    address[] public allTokens;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        uint256 indexed creatorBeeId,
        string name,
        string symbol,
        string metadataCID,
        uint256 timestamp
    );

    error MarketNotSet();
    error NotAgentOwner();
    error AgentNotFound();
    error InvalidName();
    error InvalidSymbol();
    error InvalidCID();

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    /**
     * @notice Set the market contract address
     */
    function setMarket(address _market) external onlyOwner {
        market = _market;
    }

    /**
     * @notice Create a new token
     * @param name Token name
     * @param symbol Token symbol
     * @param metadataCID IPFS CID for token metadata
     * @param creatorBeeId Creator's Bee ID (0 for anonymous)
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata metadataCID,
        uint256 creatorBeeId
    ) external returns (address tokenAddress) {
        if (market == address(0)) revert MarketNotSet();
        if (bytes(name).length == 0 || bytes(name).length > 64) revert InvalidName();
        if (bytes(symbol).length == 0 || bytes(symbol).length > 16) revert InvalidSymbol();
        if (bytes(metadataCID).length == 0) revert InvalidCID();

        // If creatorBeeId is provided, verify ownership
        if (creatorBeeId != 0) {
            if (!agentRegistry.agentExists(creatorBeeId)) revert AgentNotFound();
            if (!agentRegistry.isAgentOwner(msg.sender, creatorBeeId)) revert NotAgentOwner();
        }

        // Create the token
        HoneycombToken token = new HoneycombToken(
            name,
            symbol,
            metadataCID,
            creatorBeeId
        );
        
        tokenAddress = address(token);
        
        // Set the market on the token
        token.setMarket(market);
        
        // Register the token
        isHoneycombToken[tokenAddress] = true;
        tokenMetadata[tokenAddress] = metadataCID;
        allTokens.push(tokenAddress);

        emit TokenCreated(
            tokenAddress,
            msg.sender,
            creatorBeeId,
            name,
            symbol,
            metadataCID,
            block.timestamp
        );
    }

    /**
     * @notice Get total number of tokens created
     */
    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @notice Get token at index
     */
    function tokenAt(uint256 index) external view returns (address) {
        return allTokens[index];
    }

    /**
     * @notice Update agent registry
     */
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        agentRegistry = IAgentRegistry(_agentRegistry);
    }
}
