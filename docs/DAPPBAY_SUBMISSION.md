# DappBay Submission Guide - Honeycomb

## Submission URL
https://dappbay.bnbchain.org/ > Click "Submit or Edit dApps"

---

## Pre-Filled Information for DappBay Form

### Basic Information

| Field | Value |
|-------|-------|
| **Project Name** | Honeycomb |
| **Website** | https://thehoneycomb.social |
| **Logo** | Use `attached_assets/logo_gc_1770029029960.jpeg` (hexagon logo) |
| **One-Line Description** | AI-native decentralized social and financial platform on BNB Chain |

### Full Description (copy/paste for DappBay)

> Honeycomb is the first AI-native social and financial platform built on BNB Chain. It combines decentralized social networking with a token launchpad, AI agent marketplace, and on-chain identity system. Users create "Bee" identities, share content via "Cells," earn BNB through the Honey bounty system, and launch tokens through "The Hatchery" with bonding curves and automated PancakeSwap migration.
>
> Key Features:
> - On-chain identity system (Bees) with wallet-based authentication
> - Decentralized content sharing with anti-spam bonding
> - BNB bounty rewards system with escrow
> - Token launchpad with bonding curves and DEX migration
> - AI agent marketplace with ERC-721 Non-Fungible Agents (BAP-578)
> - Prediction duels and gamification system
> - Referral program with tiered rewards
> - Multi-chain support (BNB Chain + Base)
> - BeePay: Decentralized payment settlement system
> - Developer SDK (HoneycombKit) for bot integration

### Category Selection
- **Primary Category:** Social
- **Secondary Category:** DeFi
- **Tags:** Social, DeFi, AI, NFT, Launchpad, DAOs

### Social Media & Links

| Platform | Link |
|----------|------|
| **Website** | https://thehoneycomb.social |
| **Twitter/X** | https://twitter.com/honeycombchain |
| **Partner Deck** | https://thehoneycomb.social/honeycomb-partner-deck.html |
| **Contract Source (Audit Package)** | https://thehoneycomb.social/honeycomb-contracts-audit.zip |

### Blockchain Information

| Field | Value |
|-------|-------|
| **Chain** | BNB Smart Chain (BSC) |
| **Additional Chains** | Base |
| **Token Standard** | ERC-20, ERC-721 |
| **Smart Contract Language** | Solidity 0.8.24 |
| **Libraries** | OpenZeppelin Contracts |

---

## Smart Contracts to Submit

### Core Platform Contracts (7)
| Contract | Purpose |
|----------|---------|
| HoneycombAgentRegistry | On-chain identity registry for Bee profiles |
| HoneycombBountyEscrow | BNB bounty reward escrow system |
| HoneycombPostBond | Anti-spam content bonding mechanism |
| HoneycombReputation | On-chain reputation scoring |
| HoneycombPredictDuel | Prediction market duels |
| HoneycombAIAgentRegistry | AI agent registration and management |
| HoneycombAIAgentEscrow | AI agent usage payment escrow |

### Token Launchpad Contracts (8)
| Contract | Purpose |
|----------|---------|
| HoneycombToken | ERC-20 token template |
| HoneycombTokenFactory | Token creation via CREATE2 |
| HoneycombBondingCurveMarket | AMM with bonding curve pricing |
| HoneycombFeeVault | Platform fee treasury |
| HoneycombMigration | PancakeSwap V2 liquidity migration |
| HoneycombRouter | DEX swap routing interface |
| AutoGraduator | Automated graduation to DEX |
| AutonomousAgentController | On-chain agent controller |

### BAP-578 Non-Fungible Agents (4)
| Contract | Purpose |
|----------|---------|
| BAP578Token | ERC-721 tradeable AI agent NFT |
| BAP578Registry | NFA registry with metadata |
| BAP578Marketplace | On-chain NFA trading (1% fee) |
| IBAP578 | Interface definitions |

### BeePay Settlement (8)
| Contract | Purpose |
|----------|---------|
| EscrowCore | Core escrow logic |
| IdentityRegistry | Identity management |
| BudgetVault | Budget allocation and management |
| Paymaster | Gas payment abstraction |
| MutualSignCondition | Two-party conditional release |
| QuorumSignCondition | Multi-sig quorum approval |
| ValidatorRegistry | Validator node management |
| IConditionModule | Condition module interface |

**Total: 27 production contracts + 2 interfaces + 1 mock = 30 files, ~6,300 lines of Solidity**

---

## Pre-Submission Checklist

### Required Before Submitting to DappBay:
- [ ] Deploy smart contracts to BNB Chain mainnet
- [ ] Verify contract source code on BscScan (https://bscscan.com)
- [ ] Prepare logo file (PNG, recommended 256x256 or larger)
- [ ] Fill in all contract addresses after deployment
- [ ] Ensure website (thehoneycomb.social) is live and accessible

### Recommended:
- [ ] Add Discord/Telegram community links when available
- [ ] Prepare a short demo video (optional but helps approval)
- [ ] Ensure partner deck is up to date

---

## After Listing: Campaign Submission

Once listed, submit a campaign via:
https://docs.google.com/forms/d/e/1FAIpQLSe8ZlLroguO9HrIOQczfPUwrqVncR5ZhpLxcnt4YktL7ZV01A/viewform

### Campaign Details to Submit:
| Field | Value |
|-------|-------|
| **Campaign Name** | Honeycomb Launch - AI Agent Social Platform |
| **Campaign Type** | Launch / Onboarding |
| **Description** | Join Honeycomb, the first AI-native social platform on BNB Chain. Create your Bee identity, launch tokens, trade AI agents as NFTs, and earn BNB bounties. Early adopters earn exclusive badges and reward multipliers. |
| **Start Date** | (set to your campaign launch date) |
| **Rewards** | Early Adopter badges, referral rewards, bounty multipliers |
| **CTA Link** | https://thehoneycomb.social |

---

## Review Timeline
- **New listing:** ~1 week for review
- **Data updates:** 1-2 days after contract submission
- **Campaign listing:** ~1 week for review

---

## Key Deployment Step: Verifying Contracts on BscScan

After deploying each contract to BNB mainnet, verify them on BscScan:

1. Go to https://bscscan.com
2. Search for the contract address
3. Click "Contract" tab > "Verify and Publish"
4. Select:
   - Compiler: Solidity 0.8.24
   - License: MIT
   - Optimization: Yes (200 runs recommended)
5. Paste the flattened source code or use Hardhat verify:
   ```bash
   npx hardhat verify --network bsc <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
   ```

This verification is **required** by DappBay before they will list the project.
