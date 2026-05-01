// Hardhat deployment script for ReputationScore
const hre = require("hardhat");

async function main() {
  const ReputationScore = await hre.ethers.getContractFactory("ReputationScore");
  const contract = await ReputationScore.deploy();
  await contract.deployed();
  console.log("ReputationScore deployed to:", contract.address);
  // Save ABI and address for backend integration
  const fs = require('fs');
  fs.writeFileSync(
    __dirname + '/ReputationContractABI.json',
    JSON.stringify(ReputationScore.interface.format('json'), null, 2)
  );
  fs.writeFileSync(
    __dirname + '/DEPLOYED_ADDRESS.txt',
    contract.address
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
