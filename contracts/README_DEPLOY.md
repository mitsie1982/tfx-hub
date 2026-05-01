# Deploying ReputationScore Smart Contract

## Prerequisites
- Node.js, npm
- Hardhat (`npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers dotenv`)
- Funded deployer account (Goerli/Polygon)
- .env file with RPC URLs and private key

## Steps
1. `cd contracts`
2. `cp .env.example .env` and fill in your secrets
3. `npx hardhat compile`
4. `npx hardhat run deploy.js --network goerli` (or `--network polygon`)
5. Contract address will be in DEPLOYED_ADDRESS.txt, ABI in ReputationContractABI.json

## Backend Integration
- Copy ABI and address to your API server config.
- Set `REPUTATION_CONTRACT_ADDRESS` and use the ABI for blockchainReputation.js.
