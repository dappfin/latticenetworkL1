// contracts/SubscriptionNFT.sol
pragma solidity ^0.8.20;

contract SubscriptionNFT {
    mapping(address => uint256) public expiresAt;
    mapping(address => uint8) public tier; // 1=Solo, 2=Team

    function mint(address user, uint8 subscriptionTier, uint256 duration) external {
        tier[user] = subscriptionTier;
        expiresAt[user] = block.timestamp + duration;
    }

    function active(address user) external view returns (bool) {
        return expiresAt[user] > block.timestamp;
    }
}
