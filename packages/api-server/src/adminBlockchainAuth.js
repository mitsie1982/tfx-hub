// Admin blockchain signer middleware (for on-chain writes)
const { ethers } = require('ethers');

function getAdminSigner() {
  const privateKey = process.env.BLOCKCHAIN_ADMIN_PRIVATE_KEY;
  if (!privateKey) throw new Error('Missing BLOCKCHAIN_ADMIN_PRIVATE_KEY');
  const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL;
  const provider = new ethers.JsonRpcProvider(providerUrl);
  return new ethers.Wallet(privateKey, provider);
}

module.exports = { getAdminSigner };
