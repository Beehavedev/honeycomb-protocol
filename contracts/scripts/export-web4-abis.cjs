const fs = require("fs");
const path = require("path");

const WEB4_CONTRACTS = [
  "AgentEconomyHub",
  "SkillMarketplace",
  "AgentReplication",
  "ConstitutionRegistry",
];

async function main() {
  console.log("Exporting Web4 contract ABIs for frontend...\n");

  const artifactsDir = path.join(__dirname, "../artifacts-web4/contracts/web4");
  const outputDir = path.join(__dirname, "../../client/src/contracts/web4");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const abis = {};
  const addresses = {};

  for (const contractName of WEB4_CONTRACTS) {
    const artifactPath = path.join(
      artifactsDir,
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      console.log(`  Artifact not found for ${contractName}, skipping...`);
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abis[contractName] = artifact.abi;

    const abiFile = path.join(outputDir, `${contractName}.json`);
    fs.writeFileSync(abiFile, JSON.stringify(artifact.abi, null, 2));
    console.log(`  Exported ${contractName} ABI (${artifact.abi.length} functions/events)`);
  }

  // Load deployment addresses if available
  const deploymentsDir = path.join(__dirname, "../deployments");
  let latestDeployment = null;

  for (const chainId of ["97", "56"]) {
    const latestPath = path.join(deploymentsDir, `web4-${chainId}-latest.json`);
    if (fs.existsSync(latestPath)) {
      const deployment = JSON.parse(fs.readFileSync(latestPath, "utf8"));
      addresses[chainId] = deployment.contracts;
      latestDeployment = deployment;
    }
  }

  // Write combined TypeScript module
  const combinedFile = path.join(outputDir, "index.ts");
  let content = `// Auto-generated Web4 contract ABIs and addresses
// Do not edit manually - run: node contracts/scripts/export-web4-abis.cjs

`;

  for (const name of WEB4_CONTRACTS) {
    if (abis[name]) {
      content += `export const ${name}ABI = ${JSON.stringify(abis[name], null, 2)} as const;\n\n`;
    }
  }

  content += `export const Web4ContractABIs = {\n`;
  for (const name of WEB4_CONTRACTS) {
    if (abis[name]) {
      content += `  ${name}: ${name}ABI,\n`;
    }
  }
  content += `} as const;\n\n`;

  if (Object.keys(addresses).length > 0) {
    content += `export const Web4Addresses: Record<string, Record<string, string>> = ${JSON.stringify(addresses, null, 2)};\n\n`;
  } else {
    content += `export const Web4Addresses: Record<string, Record<string, string>> = {};\n\n`;
  }

  content += `export function getWeb4Address(chainId: number | string, contract: keyof typeof Web4ContractABIs): string | undefined {\n`;
  content += `  return Web4Addresses[chainId.toString()]?.[contract];\n`;
  content += `}\n`;

  fs.writeFileSync(combinedFile, content);
  console.log(`\n  Combined module: ${combinedFile}`);

  console.log("\nDone. Import in frontend with:");
  console.log('  import { AgentEconomyHubABI, getWeb4Address } from "@/contracts/web4";');
}

main().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
