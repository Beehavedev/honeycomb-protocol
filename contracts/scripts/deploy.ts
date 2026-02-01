import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Use deployer as treasury for now
  const treasury = deployer.address;

  // Configuration (can be overridden via env)
  const config = {
    graduationThreshold: ethers.parseEther(process.env.GRADUATION_THRESHOLD || "10"), // 10 BNB
    cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS || "10"),
    maxBuyPerTx: ethers.parseEther(process.env.MAX_BUY_PER_TX || "10000000"), // 1% of 1B = 10M tokens
    launchDelay: parseInt(process.env.LAUNCH_DELAY || "0"),
    initialVirtualNative: ethers.parseEther(process.env.INITIAL_VIRTUAL_NATIVE || "1"),
    initialVirtualToken: ethers.parseEther(process.env.INITIAL_VIRTUAL_TOKEN || "1000000000"), // 1B virtual tokens
  };

  // 1. Deploy HoneycombAgentRegistry
  console.log("\n1. Deploying HoneycombAgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("HoneycombAgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("   HoneycombAgentRegistry deployed to:", agentRegistryAddress);

  // 2. Deploy HoneycombBountyEscrow
  console.log("\n2. Deploying HoneycombBountyEscrow...");
  const BountyEscrow = await ethers.getContractFactory("HoneycombBountyEscrow");
  const bountyEscrow = await BountyEscrow.deploy(agentRegistryAddress);
  await bountyEscrow.waitForDeployment();
  const bountyEscrowAddress = await bountyEscrow.getAddress();
  console.log("   HoneycombBountyEscrow deployed to:", bountyEscrowAddress);

  // 3. Deploy HoneycombPostBond
  console.log("\n3. Deploying HoneycombPostBond...");
  const PostBond = await ethers.getContractFactory("HoneycombPostBond");
  const postBond = await PostBond.deploy(agentRegistryAddress, treasury);
  await postBond.waitForDeployment();
  const postBondAddress = await postBond.getAddress();
  console.log("   HoneycombPostBond deployed to:", postBondAddress);

  // 4. Deploy HoneycombReputation
  console.log("\n4. Deploying HoneycombReputation...");
  const Reputation = await ethers.getContractFactory("HoneycombReputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("   HoneycombReputation deployed to:", reputationAddress);

  // 5. Deploy HoneycombFeeVault
  console.log("\n5. Deploying HoneycombFeeVault...");
  const FeeVault = await ethers.getContractFactory("contracts/launchpad/HoneycombFeeVault.sol:HoneycombFeeVault");
  const feeVault = await FeeVault.deploy();
  await feeVault.waitForDeployment();
  const feeVaultAddress = await feeVault.getAddress();
  console.log("   HoneycombFeeVault deployed to:", feeVaultAddress);

  // 6. Deploy HoneycombTokenFactory
  console.log("\n6. Deploying HoneycombTokenFactory...");
  const TokenFactory = await ethers.getContractFactory("contracts/launchpad/HoneycombTokenFactory.sol:HoneycombTokenFactory");
  const tokenFactory = await TokenFactory.deploy(agentRegistryAddress);
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  console.log("   HoneycombTokenFactory deployed to:", tokenFactoryAddress);

  // 7. Deploy HoneycombBondingCurveMarket
  console.log("\n7. Deploying HoneycombBondingCurveMarket...");
  const BondingCurveMarket = await ethers.getContractFactory("contracts/launchpad/HoneycombBondingCurveMarket.sol:HoneycombBondingCurveMarket");
  const bondingCurveMarket = await BondingCurveMarket.deploy(
    tokenFactoryAddress,
    feeVaultAddress,
    config.graduationThreshold,
    config.cooldownSeconds,
    config.maxBuyPerTx,
    config.launchDelay,
    config.initialVirtualNative,
    config.initialVirtualToken
  );
  await bondingCurveMarket.waitForDeployment();
  const bondingCurveMarketAddress = await bondingCurveMarket.getAddress();
  console.log("   HoneycombBondingCurveMarket deployed to:", bondingCurveMarketAddress);

  // 8. Wire up Factory with Market
  console.log("\n8. Wiring TokenFactory with BondingCurveMarket...");
  await tokenFactory.setMarket(bondingCurveMarketAddress);
  console.log("   TokenFactory market set successfully");

  // Save deployment addresses
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    chainId: Number(network.chainId),
    networkName: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      HoneycombAgentRegistry: agentRegistryAddress,
      HoneycombBountyEscrow: bountyEscrowAddress,
      HoneycombPostBond: postBondAddress,
      HoneycombReputation: reputationAddress,
      HoneycombFeeVault: feeVaultAddress,
      HoneycombTokenFactory: tokenFactoryAddress,
      HoneycombBondingCurveMarket: bondingCurveMarketAddress,
    },
    config: {
      graduationThreshold: config.graduationThreshold.toString(),
      cooldownSeconds: config.cooldownSeconds,
      maxBuyPerTx: config.maxBuyPerTx.toString(),
      launchDelay: config.launchDelay,
      initialVirtualNative: config.initialVirtualNative.toString(),
      initialVirtualToken: config.initialVirtualToken.toString(),
    },
  };

  const deploymentsDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${network.chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentFile}`);

  console.log("\n✅ All contracts deployed successfully!");
  console.log("\nContract Addresses:");
  console.log("==================");
  console.log("HoneycombAgentRegistry:", agentRegistryAddress);
  console.log("HoneycombBountyEscrow:", bountyEscrowAddress);
  console.log("HoneycombPostBond:", postBondAddress);
  console.log("HoneycombReputation:", reputationAddress);
  console.log("HoneycombFeeVault:", feeVaultAddress);
  console.log("HoneycombTokenFactory:", tokenFactoryAddress);
  console.log("HoneycombBondingCurveMarket:", bondingCurveMarketAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
