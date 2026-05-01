// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReputationScore {
    mapping(string => uint256) private scores;
    address public admin;

    event ReputationSet(string indexed userId, uint256 score);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function getReputation(string memory userId) public view returns (uint256) {
        return scores[userId];
    }

    function setReputation(string memory userId, uint256 score) public onlyAdmin {
        scores[userId] = score;
        emit ReputationSet(userId, score);
    }
}
