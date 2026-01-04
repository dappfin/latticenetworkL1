// contracts/SessionManager.sol
pragma solidity ^0.8.20;

contract SessionManager {
    event SessionStarted(address user);
    event SessionEnded(address user, uint256 value);

    function startSession() external {
        emit SessionStarted(msg.sender);
    }

    function endSession(uint256 value) external {
        emit SessionEnded(msg.sender, value);
    }
}
