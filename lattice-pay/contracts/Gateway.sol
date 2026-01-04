// contracts/Gateway.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IGateway {
    function isAllowed(address) external view returns (bool);
}

contract Gateway is Ownable, IGateway {
    // Gateway access control
    mapping(address => bool) public allowedGateways;
    mapping(address => bool) public allowedCallers;
    mapping(address => uint256) public gatewayRates; // Rate limit per gateway
    
    // Rate limiting
    struct RateLimit {
        uint256 lastCall;
        uint256 callCount;
        uint256 windowStart;
    }
    
    mapping(address => RateLimit) public rateLimits;
    
    // Events
    event GatewayAdded(address indexed gateway, uint256 rate);
    event GatewayRemoved(address indexed gateway);
    event CallerAdded(address indexed caller);
    event CallerRemoved(address indexed caller);
    event RateLimitUpdated(address indexed gateway, uint256 newRate);
    
    constructor() Ownable(msg.sender) {}
    
    modifier onlyAllowedGateway() {
        require(allowedGateways[msg.sender], "Gateway not allowed");
        _;
    }
    
    modifier rateLimited() {
        _checkRateLimit(msg.sender);
        _;
    }
    
    function _checkRateLimit(address gateway) internal {
        uint256 maxRate = gatewayRates[gateway];
        if (maxRate == 0) return; // No rate limit
        
        RateLimit storage limit = rateLimits[gateway];
        uint256 currentTime = block.timestamp;
        
        // Reset window if needed (1-hour window)
        if (currentTime - limit.windowStart >= 1 hours) {
            limit.windowStart = currentTime;
            limit.callCount = 1;
            limit.lastCall = currentTime;
        } else {
            require(limit.callCount < maxRate, "Rate limit exceeded");
            limit.callCount++;
            limit.lastCall = currentTime;
        }
    }
    
    function addGateway(address gateway, uint256 rateLimit) external onlyOwner {
        allowedGateways[gateway] = true;
        gatewayRates[gateway] = rateLimit;
        emit GatewayAdded(gateway, rateLimit);
    }
    
    function removeGateway(address gateway) external onlyOwner {
        allowedGateways[gateway] = false;
        delete gatewayRates[gateway];
        emit GatewayRemoved(gateway);
    }
    
    function updateRateLimit(address gateway, uint256 newRate) external onlyOwner {
        require(allowedGateways[gateway], "Gateway not allowed");
        gatewayRates[gateway] = newRate;
        emit RateLimitUpdated(gateway, newRate);
    }
    
    function addCaller(address caller) external onlyOwner {
        allowedCallers[caller] = true;
        emit CallerAdded(caller);
    }
    
    function removeCaller(address caller) external onlyOwner {
        allowedCallers[caller] = false;
        emit CallerRemoved(caller);
    }
    
    function isAllowed(address caller) external view returns (bool) {
        return allowedCallers[caller];
    }
    
    function validateOperation(address user, bytes calldata data) external onlyAllowedGateway rateLimited returns (bool) {
        // Add any additional validation logic here
        // For now, just return true if gateway is allowed and rate limited
        return true;
    }
    
    function getGatewayInfo(address gateway) external view returns (
        bool allowed,
        uint256 rateLimit,
        uint256 currentCalls,
        uint256 windowStart
    ) {
        RateLimit storage limit = rateLimits[gateway];
        return (
            allowedGateways[gateway],
            gatewayRates[gateway],
            limit.callCount,
            limit.windowStart
        );
    }
}
