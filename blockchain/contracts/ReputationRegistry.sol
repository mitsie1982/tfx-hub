// blockchain/contracts/ReputationRegistry.sol
// Minimal reputation registry: stores immutable reputation events and provides read API.
// IMPORTANT: This is a scaffold. Audit and gas‑optimise before production.

pragma solidity ^0.8.19;

contract ReputationRegistry {
    address public owner;

    event ReputationRecorded(address indexed member, uint256 indexed organisationId, uint256 score, uint256 timestamp, string metadataHash);

    struct Reputation {
        uint256 organisationId;
        uint256 score;
        uint256 timestamp;
        string metadataHash;
    }

    // Mapping member address => array of reputations (append-only)
    mapping(address => Reputation[]) private reputations;

    modifier onlyOwner() {
        require(msg.sender == owner, 'Not owner');
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Record a reputation event (append-only)
    function recordReputation(address member, uint256 organisationId, uint256 score, string calldata metadataHash) external onlyOwner {
        Reputation memory r = Reputation({ organisationId: organisationId, score: score, timestamp: block.timestamp, metadataHash: metadataHash });
        reputations[member].push(r);
        emit ReputationRecorded(member, organisationId, score, block.timestamp, metadataHash);
    }

    // Read count of reputation events for a member
    function getReputationCount(address member) external view returns (uint256) {
        return reputations[member].length;
    }

    // Read a reputation event by index
    function getReputationByIndex(address member, uint256 index) external view returns (uint256 organisationId, uint256 score, uint256 timestamp, string memory metadataHash) {
        Reputation storage r = reputations[member][index];
        return (r.organisationId, r.score, r.timestamp, r.metadataHash);
    }
}
