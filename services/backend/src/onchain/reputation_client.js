// services/backend/src/onchain/reputation_client.js
// On-chain client scaffold using ethers.js. Use secure key management for private keys.

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const CONTRACT_ABI = JSON.parse(fs.readFileSync(path.join(__dirname,'../../../../blockchain/artifacts/ReputationRegistry.json'),'utf8')).abi;
const CONTRACT_ADDRESS = process.env.REPUTATION_CONTRACT_ADDRESS || '';

function getProvider() {
  const rpc = process.env.BLOCKCHAIN_RPC || 'http://localhost:8545';
  return new ethers.providers.JsonRpcProvider(rpc);
}

function getSigner() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || '';
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
}

async function recordReputation(memberAddress, organisationId, score, metadataHash) {
  const signer = getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  const tx = await contract.recordReputation(memberAddress, organisationId, score, metadataHash);
  const receipt = await tx.wait();
  return receipt;
}

async function getReputationCount(memberAddress) {
  const provider = getProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  return await contract.getReputationCount(memberAddress);
}

module.exports = { recordReputation, getReputationCount };
