// contracts/GatewayRegistry.sol
pragma solidity ^0.8.20;

interface IGateway {
    function isAllowed(address) external view returns (bool);
}

contract GatewayRegistry is IGateway {
    mapping(address => bool) public allowed;

    function allow(address g) external {
        allowed[g] = true;
    }

    function isAllowed(address g) external view returns (bool) {
        return allowed[g];
    }
}
