// contracts/Subscription.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISubscription {
    function active(address) external view returns (bool);
    function canStartSession(address user, uint256 sessionValueUSDT) external view returns (bool);
    function recordSession(address user) external;
}

contract Subscription is Ownable, ISubscription {
    using SafeERC20 for IERC20;
    
    // Subscription tiers
    enum Tier { BASIC, PREMIUM, ENTERPRISE }
    
    struct SubscriptionPlan {
        uint256 monthlyFeeUSDT;
        uint256 maxSessionsPerDay;
        uint256 maxSessionValueUSDT;
        bool active;
    }
    
    struct UserSubscription {
        Tier tier;
        uint256 startDate;
        uint256 endDate;
        uint256 sessionsToday;
        uint256 lastSessionDate;
        bool active;
    }
    
    // State variables
    address public usdtToken;
    mapping(Tier => SubscriptionPlan) public plans;
    mapping(address => UserSubscription) public userSubscriptions;
    mapping(address => bool) public authorizedManagers;
    
    // Events
    event SubscriptionPurchased(address indexed user, Tier tier, uint256 duration);
    event SubscriptionExtended(address indexed user, uint256 newEndDate);
    event SubscriptionCancelled(address indexed user);
    event PlanUpdated(Tier tier, uint256 fee, uint256 maxSessions, uint256 maxValue);
    event ManagerAuthorized(address indexed manager);
    event ManagerRevoked(address indexed manager);
    
    constructor(address _usdt) Ownable(msg.sender) {
        usdtToken = _usdt;
        _initializePlans();
    }
    
    modifier onlyManager() {
        require(msg.sender == owner() || authorizedManagers[msg.sender], "Not authorized");
        _;
    }
    
    function _initializePlans() internal {
        // Basic tier: $10/month, 10 sessions/day, $100 max session value
        plans[Tier.BASIC] = SubscriptionPlan({
            monthlyFeeUSDT: 10 * 1e6, // 10 USDT (6 decimals)
            maxSessionsPerDay: 10,
            maxSessionValueUSDT: 100 * 1e6, // 100 USDT
            active: true
        });
        
        // Premium tier: $50/month, 50 sessions/day, $500 max session value
        plans[Tier.PREMIUM] = SubscriptionPlan({
            monthlyFeeUSDT: 50 * 1e6, // 50 USDT
            maxSessionsPerDay: 50,
            maxSessionValueUSDT: 500 * 1e6, // 500 USDT
            active: true
        });
        
        // Enterprise tier: $200/month, unlimited sessions, $5000 max session value
        plans[Tier.ENTERPRISE] = SubscriptionPlan({
            monthlyFeeUSDT: 200 * 1e6, // 200 USDT
            maxSessionsPerDay: 1_000, // Effectively unlimited
            maxSessionValueUSDT: 5_000 * 1e6, // 5000 USDT
            active: true
        });
    }
    
    function purchaseSubscription(Tier tier, uint256 months) external {
        require(plans[tier].active, "Plan not active");
        require(months > 0 && months <= 24, "Invalid duration");
        
        SubscriptionPlan storage plan = plans[tier];
        uint256 totalFee = plan.monthlyFeeUSDT * months;
        
        // Transfer USDT to contract
        IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), totalFee);
        
        // Calculate end date
        uint256 currentEndDate = userSubscriptions[msg.sender].endDate;
        uint256 newEndDate = currentEndDate > block.timestamp ? currentEndDate : block.timestamp;
        newEndDate += months * 30 days;
        
        // Update subscription
        userSubscriptions[msg.sender] = UserSubscription({
            tier: tier,
            startDate: block.timestamp,
            endDate: newEndDate,
            sessionsToday: 0,
            lastSessionDate: block.timestamp,
            active: true
        });
        
        emit SubscriptionPurchased(msg.sender, tier, months);
        emit SubscriptionExtended(msg.sender, newEndDate);
    }
    
    function extendSubscription(uint256 months) external {
        require(active(msg.sender), "No active subscription");
        require(months > 0 && months <= 24, "Invalid duration");
        
        UserSubscription storage sub = userSubscriptions[msg.sender];
        SubscriptionPlan storage plan = plans[sub.tier];
        uint256 totalFee = plan.monthlyFeeUSDT * months;
        
        // Transfer USDT to contract
        IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), totalFee);
        
        // Extend end date
        sub.endDate += months * 30 days;
        
        emit SubscriptionExtended(msg.sender, sub.endDate);
    }
    
    function cancelSubscription() external {
        require(active(msg.sender), "No active subscription");
        
        userSubscriptions[msg.sender].active = false;
        emit SubscriptionCancelled(msg.sender);
    }
    
    function active(address user) public view returns (bool) {
        UserSubscription storage sub = userSubscriptions[user];
        return sub.active && sub.endDate > block.timestamp;
    }
    
    function canStartSession(address user, uint256 sessionValueUSDT) external view returns (bool) {
        if (!active(user)) return false;
        
        UserSubscription storage sub = userSubscriptions[user];
        SubscriptionPlan storage plan = plans[sub.tier];
        
        // Check session value limit
        if (sessionValueUSDT > plan.maxSessionValueUSDT) return false;
        
        // Check daily session limit
        if (block.timestamp / 1 days > sub.lastSessionDate / 1 days) {
            // New day, reset counter
            return true;
        } else {
            // Same day, check remaining sessions
            return sub.sessionsToday < plan.maxSessionsPerDay;
        }
    }
    
    function recordSession(address user) external onlyManager {
        require(active(user), "No active subscription");
        
        UserSubscription storage sub = userSubscriptions[user];
        
        // Reset counter if new day
        if (block.timestamp / 1 days > sub.lastSessionDate / 1 days) {
            sub.sessionsToday = 1;
            sub.lastSessionDate = block.timestamp;
        } else {
            sub.sessionsToday++;
        }
    }
    
    function updatePlan(Tier tier, uint256 monthlyFeeUSDT, uint256 maxSessions, uint256 maxValue) external onlyOwner {
        plans[tier] = SubscriptionPlan({
            monthlyFeeUSDT: monthlyFeeUSDT,
            maxSessionsPerDay: maxSessions,
            maxSessionValueUSDT: maxValue,
            active: true
        });
        
        emit PlanUpdated(tier, monthlyFeeUSDT, maxSessions, maxValue);
    }
    
    function togglePlan(Tier tier) external onlyOwner {
        plans[tier].active = !plans[tier].active;
    }
    
    function authorizeManager(address manager) external onlyOwner {
        authorizedManagers[manager] = true;
        emit ManagerAuthorized(manager);
    }
    
    function revokeManager(address manager) external onlyOwner {
        authorizedManagers[manager] = false;
        emit ManagerRevoked(manager);
    }
    
    function getUserSubscription(address user) external view returns (
        Tier tier,
        uint256 startDate,
        uint256 endDate,
        uint256 sessionsToday,
        uint256 lastSessionDate,
        bool isActive
    ) {
        UserSubscription storage sub = userSubscriptions[user];
        return (
            sub.tier,
            sub.startDate,
            sub.endDate,
            sub.sessionsToday,
            sub.lastSessionDate,
            sub.active && sub.endDate > block.timestamp
        );
    }
    
    function getPlan(Tier tier) external view returns (
        uint256 monthlyFeeUSDT,
        uint256 maxSessionsPerDay,
        uint256 maxSessionValueUSDT,
        bool planActive
    ) {
        SubscriptionPlan storage plan = plans[tier];
        return (
            plan.monthlyFeeUSDT,
            plan.maxSessionsPerDay,
            plan.maxSessionValueUSDT,
            plan.active
        );
    }
    
    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = IERC20(usdtToken).balanceOf(address(this));
        if (balance > 0) {
            IERC20(usdtToken).safeTransfer(owner(), balance);
        }
    }
}
