import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

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
  const treasury = deployer.address; // Use deployer as treasury for now
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
