const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying $HONEY Token + Staking with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const STAKING_REWARD_RATE = process.env.STAKING_REWARD_RATE || "0";
  const ENABLE_TRADING = process.env.ENABLE_TRADING === "true";

  console.log("\n=== Step 1: Deploy HoneyToken ===");
  const HoneyToken = await ethers.getContractFactory("HoneyToken");
  const honeyToken = await HoneyToken.deploy();
  await honeyToken.waitForDeployment();
  const honeyTokenAddress = await honeyToken.getAddress();
  console.log("HoneyToken deployed to:", honeyTokenAddress);

  const initialSupply = await honeyToken.totalSupply();
  console.log("Initial supply minted:", ethers.formatEther(initialSupply), "HONEY");

  console.log("\n=== Step 2: Deploy HoneyStaking ===");
  const HoneyStaking = await ethers.getContractFactory("HoneyStaking");
  const honeyStaking = await HoneyStaking.deploy(honeyTokenAddress);
  await honeyStaking.waitForDeployment();
  const honeyStakingAddress = await honeyStaking.getAddress();
  console.log("HoneyStaking deployed to:", honeyStakingAddress);

  console.log("\n=== Step 3: Configure Permissions ===");

  console.log("Setting HoneyStaking as authorized minter...");
  const setMinterTx = await honeyToken.setMinter(honeyStakingAddress, true);
  await setMinterTx.wait();
  console.log("HoneyStaking granted minter role");

  console.log("Excluding HoneyStaking from transfer limits...");
  const excludeTx = await honeyToken.setExcludedFromLimits(honeyStakingAddress, true);
  await excludeTx.wait();
  console.log("HoneyStaking excluded from limits");

  if (STAKING_REWARD_RATE !== "0") {
    console.log("\n=== Step 4: Set Staking Reward Rate ===");
    const rateWei = ethers.parseEther(STAKING_REWARD_RATE);
    const setRateTx = await honeyStaking.setRewardRate(rateWei);
    await setRateTx.wait();
    console.log("Reward rate set to:", STAKING_REWARD_RATE, "HONEY/second");
  }

  if (ENABLE_TRADING) {
    console.log("\n=== Step 5: Enable Trading ===");
    const enableTx = await honeyToken.enableTrading();
    await enableTx.wait();
    console.log("Trading enabled (permanent, cannot be disabled)");
  } else {
    console.log("\n=== Step 5: Trading NOT enabled (set ENABLE_TRADING=true to enable) ===");
  }

  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    chainId: Number(network.chainId),
    networkName: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      HoneyToken: honeyTokenAddress,
      HoneyStaking: honeyStakingAddress,
    },
    config: {
      initialSupply: ethers.formatEther(initialSupply),
      maxSupply: "1,000,000,000",
      stakingRewardRate: STAKING_REWARD_RATE,
      tradingEnabled: ENABLE_TRADING,
      stakingIsMinter: true,
      stakingExcludedFromLimits: true,
    },
    tiers: {
      Drone: "1,000 HONEY - 5% fee discount",
      Worker: "10,000 HONEY - 15% fee discount",
      Guardian: "50,000 HONEY - 30% fee discount",
      Queen: "250,000 HONEY - 50% fee discount",
    },
  };

  const deploymentsDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `honey-${network.chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("\nDeployment info saved to:", deploymentFile);

  console.log("\n=== Deployment Summary ===");
  console.log("HoneyToken:", honeyTokenAddress);
  console.log("HoneyStaking:", honeyStakingAddress);
  console.log("Chain ID:", Number(network.chainId));

  console.log("\n=== Next Steps ===");
  console.log("1. Verify contracts on BscScan:");
  console.log(`   npx hardhat verify --network bscMainnet ${honeyTokenAddress}`);
  console.log(`   npx hardhat verify --network bscMainnet ${honeyStakingAddress} ${honeyTokenAddress}`);
  console.log("2. Update client/src/contracts/addresses.ts with deployed addresses");
  console.log("3. Fund staking reward pool:");
  console.log(`   honeyToken.approve(honeyStakingAddress, amount)`);
  console.log(`   honeyStaking.fundRewardPool(amount)`);
  console.log("4. Enable trading if not done: honeyToken.enableTrading()");

  return { honeyTokenAddress, honeyStakingAddress };
}

main()
  .then(({ honeyTokenAddress, honeyStakingAddress }) => {
    console.log("\nDeployment complete!");
    console.log("HoneyToken:", honeyTokenAddress);
    console.log("HoneyStaking:", honeyStakingAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
