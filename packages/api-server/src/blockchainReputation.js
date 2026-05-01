// Blockchain-based reputation score integration (Ethereum/Polygon placeholder)
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL;
const contractAddress = process.env.REPUTATION_CONTRACT_ADDRESS;
let contractABI = null;
try {
  const abiPath = path.join(__dirname, 'ReputationContractABI.json');
  const addrPath = path.join(__dirname, 'DEPLOYED_ADDRESS.txt');
  if (fs.existsSync(abiPath) && fs.existsSync(addrPath)) {
    contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    contractAddress = fs.readFileSync(addrPath, 'utf8').trim();
  }
} catch (e) {
  // fallback to env
}

const provider = new ethers.JsonRpcProvider(providerUrl);
let contract;
try {
  contract = new ethers.Contract(contractAddress, contractABI, provider);
} catch (e) {
  console.error('Failed to initialize blockchain contract:', e);
  contract = null;
}

async function getReputationScore(userId) {
  if (!contract) throw new Error('Blockchain contract not initialized');
  return contract.getReputation(userId);
}

async function setReputationScore(userId, score, adminSigner) {
  if (!contract) throw new Error('Blockchain contract not initialized');
  const contractWithSigner = contract.connect(adminSigner);
  return contractWithSigner.setReputation(userId, score);
}

module.exports = { getReputationScore, setReputationScore };
