// blockchain/migrations/deploy_reputation.js
// Hardhat deployment script scaffold. Replace network config and private keys via environment variables.

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  const ReputationRegistry = await ethers.getContractFactory('ReputationRegistry');
  const registry = await ReputationRegistry.deploy();
  await registry.deployed();

  console.log('ReputationRegistry deployed to:', registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
