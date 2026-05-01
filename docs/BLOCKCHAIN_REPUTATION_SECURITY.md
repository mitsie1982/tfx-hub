BLOCKCHAIN REPUTATION SECURITY CHECKLIST

- Use secrets manager for DEPLOYER_PRIVATE_KEY and RPC credentials.
- Do not store private keys in repository or logs.
- Use short, auditable signer role; require multi-sig for production writes.
- Audit smart contract for reentrancy, overflow, access control and gas attacks.
- Minimise on-chain PII; use hashed metadata and off-chain storage (IPFS) for large payloads.
- Implement monitoring for failed transactions and gas anomalies.
- Provide a documented dispute resolution process and off-chain correction mechanism.
