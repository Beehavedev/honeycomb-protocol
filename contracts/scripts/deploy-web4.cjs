const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== Web4 Autonomous Economy Deployment ===\n");
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "BNB\n");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "(chainId:", network.chainId.toString(), ")\n");

  const BAP578_TOKEN_ADDRESS = process.env.BAP578_TOKEN_ADDRESS;
  const FEE_VAULT_ADDRESS = process.env.FEE_VAULT_ADDRESS || deployer.address;

  const isLiveNetwork = network.chainId !== 31337n;
  
  if (!BAP578_TOKEN_ADDRESS && isLiveNetwork) {
    console.error("ERROR: BAP578_TOKEN_ADDRESS is required for live network deployment.");
    console.error("Set it to the deployed BAP-578 NFA token contract address.");
    process.exit(1);
  }

  if (!process.env.DEPLOYER_PRIVATE_KEY && !process.env.TOURNAMENT_WALLET_PRIVATE_KEY && isLiveNetwork) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY is required for live network deployment.");
    process.exit(1);
  }

  if (!BAP578_TOKEN_ADDRESS) {
    console.log("NOTE: BAP578_TOKEN_ADDRESS not set. Using deployer address (local network only).\n");
  }

  const agentTokenAddress = BAP578_TOKEN_ADDRESS || deployer.address;

  // ==================== 1. Deploy AgentEconomyHub ====================
  console.log("1/4 Deploying AgentEconomyHub...");
  const AgentEconomyHub = await ethers.getContractFactory("AgentEconomyHub");
  const economyHub = await AgentEconomyHub.deploy(agentTokenAddress);
  await economyHub.waitForDeployment();
  const economyHubAddress = await economyHub.getAddress();
  console.log("  AgentEconomyHub:", economyHubAddress);

  // ==================== 2. Deploy SkillMarketplace ====================
  console.log("2/4 Deploying SkillMarketplace...");
  const SkillMarketplace = await ethers.getContractFactory("SkillMarketplace");
  const skillMarketplace = await SkillMarketplace.deploy(
    agentTokenAddress,
    economyHubAddress,
    FEE_VAULT_ADDRESS
  );
  await skillMarketplace.waitForDeployment();
  const skillMarketplaceAddress = await skillMarketplace.getAddress();
  console.log("  SkillMarketplace:", skillMarketplaceAddress);

  // ==================== 3. Deploy AgentReplication ====================
  console.log("3/4 Deploying AgentReplication...");
  const AgentReplication = await ethers.getContractFactory("AgentReplication");
  const replication = await AgentReplication.deploy(
    agentTokenAddress,
    economyHubAddress
  );
  await replication.waitForDeployment();
  const replicationAddress = await replication.getAddress();
  console.log("  AgentReplication:", replicationAddress);

  // ==================== 4. Deploy ConstitutionRegistry ====================
  console.log("4/4 Deploying ConstitutionRegistry...");
  const ConstitutionRegistry = await ethers.getContractFactory("ConstitutionRegistry");
  const constitution = await ConstitutionRegistry.deploy(agentTokenAddress);
  await constitution.waitForDeployment();
  const constitutionAddress = await constitution.getAddress();
  console.log("  ConstitutionRegistry:", constitutionAddress, "\n");

  // ==================== Wire contracts together ====================
  console.log("Wiring contracts together...");

  // Authorize SkillMarketplace to credit agent balances in the hub
  console.log("  Authorizing SkillMarketplace as module on AgentEconomyHub...");
  let tx = await economyHub.setModuleAuthorized(skillMarketplaceAddress, true);
  await tx.wait();

  // Authorize AgentReplication to debit/credit agent balances in the hub
  console.log("  Authorizing AgentReplication as module on AgentEconomyHub...");
  tx = await economyHub.setModuleAuthorized(replicationAddress, true);
  await tx.wait();

  // Point SkillMarketplace to AgentReplication for revenue sharing lookups
  console.log("  Setting AgentReplication as revenue sharing source on SkillMarketplace...");
  tx = await skillMarketplace.setRevenueSharing(replicationAddress);
  await tx.wait();

  // Authorize SkillMarketplace to record revenue shared on AgentReplication
  console.log("  Authorizing SkillMarketplace as module on AgentReplication...");
  tx = await replication.setModuleAuthorized(skillMarketplaceAddress, true);
  await tx.wait();

  console.log("  All contracts wired.\n");

  // ==================== Save deployment addresses ====================
  const deployment = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentEconomyHub: economyHubAddress,
      SkillMarketplace: skillMarketplaceAddress,
      AgentReplication: replicationAddress,
      ConstitutionRegistry: constitutionAddress,
    },
    dependencies: {
      BAP578Token: agentTokenAddress,
      FeeVault: FEE_VAULT_ADDRESS,
    },
    wiring: {
      "AgentEconomyHub.authorizedModules": [skillMarketplaceAddress, replicationAddress],
      "SkillMarketplace.revenueSharing": replicationAddress,
      "AgentReplication.authorizedModules": [skillMarketplaceAddress],
    },
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `web4-${network.chainId.toString()}-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));
  console.log("Deployment saved to:", filepath);

  // Also save as latest
  const latestPath = path.join(outputDir, `web4-${network.chainId.toString()}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deployment, null, 2));
  console.log("Latest deployment:", latestPath);

  // ==================== Summary ====================
  console.log("\n=== Deployment Complete ===");
  console.log("AgentEconomyHub:     ", economyHubAddress);
  console.log("SkillMarketplace:    ", skillMarketplaceAddress);
  console.log("AgentReplication:    ", replicationAddress);
  console.log("ConstitutionRegistry:", constitutionAddress);
  console.log("\nTo verify on BscScan:");
  console.log(`  npx hardhat verify --config hardhat.config.web4.cjs --network bscTestnet ${economyHubAddress} ${agentTokenAddress}`);
  console.log(`  npx hardhat verify --config hardhat.config.web4.cjs --network bscTestnet ${skillMarketplaceAddress} ${agentTokenAddress} ${economyHubAddress} ${FEE_VAULT_ADDRESS}`);
  console.log(`  npx hardhat verify --config hardhat.config.web4.cjs --network bscTestnet ${replicationAddress} ${agentTokenAddress} ${economyHubAddress}`);
  console.log(`  npx hardhat verify --config hardhat.config.web4.cjs --network bscTestnet ${constitutionAddress} ${agentTokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
