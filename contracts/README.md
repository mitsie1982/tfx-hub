# ReputationScore Smart Contract

- Solidity contract for on-chain reputation scoring.
- Admin can set scores; anyone can read.
- Deploy to Ethereum/Polygon and use contract address/ABI in your API server.

## Deployment

1. Compile with Hardhat/Foundry/Remix.
2. Deploy to your preferred EVM-compatible network.
3. Update `REPUTATION_CONTRACT_ADDRESS` and ABI in your backend.

## Interface
- `function getReputation(string userId) view returns (uint256)`
- `function setReputation(string userId, uint256 score)` (admin only)
