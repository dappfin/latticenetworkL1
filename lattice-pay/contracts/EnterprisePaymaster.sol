// contracts/EnterprisePaymaster.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISubscription {
    function active(address) external view returns (bool);
    function canStartSession(address user, uint256 sessionValueUSDT) external view returns (bool);
}

interface IGateway {
    function isAllowed(address) external view returns (bool);
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
    function getUSDTPrice() external view returns (uint256);
}

contract EnterprisePaymaster is Ownable {
    using SafeERC20 for IERC20;
    
    // ============ ENTERPRISE CONTROLS ============
    
    // Paymaster Health Modes
    enum PaymasterMode {
        ACTIVE,      // Full gas sponsorship
        DEGRADED,    // Only subscriptions, no free sessions
        PAUSED       // No gas sponsorship (emergency)
    }
    
    // Partner Gateway Profile
    struct GatewayProfile {
        bool allowed;
        uint256 revenueShareBps;      // Future revenue sharing
        uint256 dailyLGULimit;        // Daily LGU quota
        uint256 dailyLGUUsed;         // Current daily usage
        uint256 lastUsageReset;       // Last reset timestamp
        string metadataURI;           // Partner metadata
    }
    
    // ============ GAS TANK CONTROLS ============
    
    // Real gas tank wallet
    address public immutable gasTankWallet = 0x1bd3841af088e60E7fDa94E461182D50B8364214;
    
    // LGU Gas Tank Parameters
    uint256 public lguBalance;
    uint256 public minLGUReserve = 100_000 * 1e18;        // 100K LGU minimum reserve
    uint256 public dailyLGULimit = 10_000_000 * 1e18;      // 10M LGU daily system limit
    uint256 public maxGasPerSession = 1_000 * 1e18;       // 1K LGU max per session
    
    // Gas Price Governor
    uint256 public lguPriceUSDT = 1 * 1e6;              // 1 USDT per LGU (6 decimals)
    uint256 public lguPriceUSDTScaled;                  // Scaled for calculations
    
    // Paymaster State
    PaymasterMode public paymasterMode = PaymasterMode.ACTIVE;
    
    // Gateway Management
    mapping(address => GatewayProfile) public gatewayProfiles;
    address[] public authorizedGateways;
    
    // Daily Usage Tracking
    uint256 public systemDailyLGUUsed;
    uint256 public lastSystemReset;
    
    // ============ EXISTING PAYMASTER STATE ============
    
    // Constants
    uint256 public constant FEE_BPS = 100; // 1% fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // State variables
    address public subscription;
    address public priceOracle;
    address public usdtToken;
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // Session tracking
    struct Session {
        address user;
        uint256 startTime;
        uint256 sessionValueUSDT;
        uint256 gasUsedLGU;
        bool active;
        address paymentToken;
        uint256 paymentAmount;
        address gateway; // Track which gateway processed it
    }
    
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32) public userActiveSession;
    
    // Profit tracking
    uint256 public totalRevenueUSDT;
    uint256 public totalSessions;
    uint256 public totalGasUsedLGU;
    
    // Events
    event SessionStarted(bytes32 indexed sessionId, address indexed user, address paymentToken, uint256 paymentAmount, address indexed gateway);
    event SessionEnded(bytes32 indexed sessionId, address indexed user, uint256 sessionValueUSDT, uint256 feeUSDT, uint256 gasUsedLGU);
    event PaymentNormalized(address indexed token, uint256 amount, uint256 usdtAmount);
    event LGUConsumed(address indexed user, uint256 amount, address indexed gateway);
    event ProfitRecorded(uint256 revenueUSDT, uint256 gasCostUSDT);
    
    // ============ ENTERPRISE EVENTS ============
    event PaymasterModeChanged(PaymasterMode oldMode, PaymasterMode newMode);
    event GatewayProfileUpdated(address indexed gateway, uint256 dailyLimit, string metadataURI);
    event LGUReserveWarning(uint256 currentBalance, uint256 reserveLevel);
    event DailyLimitWarning(address indexed gateway, uint256 used, uint256 limit);
    event EmergencyPauseTriggered(string reason);
    event GasPriceUpdated(uint256 oldPrice, uint256 newPrice);
    
    constructor(
        address _subscription,
        address _priceOracle,
        address _usdtToken
    ) Ownable(msg.sender) {
        subscription = _subscription;
        priceOracle = _priceOracle;
        usdtToken = _usdtToken;
        
        // Initialize gas tank
        lguBalance = 1_000_000 * 1e18; // 1M LGU initial balance
        lguPriceUSDTScaled = lguPriceUSDT * 1e12; // Scale for 18 decimals
        
        // Initialize supported tokens
        supportedTokens[_usdtToken] = true;
        tokenList.push(_usdtToken);
        
        // Initialize system timer
        lastSystemReset = block.timestamp;
    }
    
    // ============ ENTERPRISE ADMIN FUNCTIONS ============
    
    function setPaymasterMode(PaymasterMode mode) external onlyOwner {
        require(mode != paymasterMode, "Mode already set");
        PaymasterMode oldMode = paymasterMode;
        paymasterMode = mode;
        emit PaymasterModeChanged(oldMode, mode);
    }
    
    function setGasTankParameters(
        uint256 newMinReserve,
        uint256 newDailyLimit,
        uint256 newMaxGasPerSession
    ) external onlyOwner {
        require(newMinReserve > 0, "Invalid reserve");
        require(newDailyLimit > 0, "Invalid daily limit");
        require(newMaxGasPerSession > 0, "Invalid max gas");
        
        minLGUReserve = newMinReserve;
        dailyLGULimit = newDailyLimit;
        maxGasPerSession = newMaxGasPerSession;
    }
    
    function updateLGUPriceUSDT(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        uint256 oldPrice = lguPriceUSDT;
        lguPriceUSDT = newPrice;
        lguPriceUSDTScaled = newPrice * 1e12;
        emit GasPriceUpdated(oldPrice, newPrice);
    }
    
    function addGatewayProfile(
        address gateway,
        uint256 newDailyLGULimit,
        string memory metadataURI
    ) external onlyOwner {
        require(gateway != address(0), "Invalid gateway");
        require(newDailyLGULimit > 0, "Invalid limit");
        
        if (!gatewayProfiles[gateway].allowed) {
            authorizedGateways.push(gateway);
        }
        
        gatewayProfiles[gateway] = GatewayProfile({
            allowed: true,
            revenueShareBps: 0,
            dailyLGULimit: newDailyLGULimit,
            dailyLGUUsed: 0,
            lastUsageReset: block.timestamp,
            metadataURI: metadataURI
        });
        
        emit GatewayProfileUpdated(gateway, newDailyLGULimit, metadataURI);
    }
    
    function removeGateway(address gateway) external onlyOwner {
        require(gatewayProfiles[gateway].allowed, "Gateway not allowed");
        
        gatewayProfiles[gateway].allowed = false;
        // Remove from authorizedGateways array (simplified)
        
        emit GatewayProfileUpdated(gateway, 0, "");
    }
    
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        tokenList.push(token);
    }
    
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        supportedTokens[token] = false;
        // Remove from tokenList (simplified)
    }
    
    function topUpLGUBalance(uint256 amount) external onlyOwner {
        require(amount > 0, "Invalid amount");
        lguBalance += amount;
    }
    
    function emergencyPause(string memory reason) external onlyOwner {
        paymasterMode = PaymasterMode.PAUSED;
        emit EmergencyPauseTriggered(reason);
    }
    
    // ============ GAS TANK CONTROLS ============
    
    function _checkGasTankAvailability(uint256 gasNeeded) internal view returns (bool) {
        // Check minimum reserve
        if (lguBalance < minLGUReserve + gasNeeded) {
            return false;
        }
        
        // Check system daily limit
        if (systemDailyLGUUsed + gasNeeded > dailyLGULimit) {
            return false;
        }
        
        return true;
    }
    
    function _checkGatewayQuota(address gateway, uint256 gasNeeded) internal returns (bool) {
        GatewayProfile storage profile = gatewayProfiles[gateway];
        
        // Reset daily usage if needed
        if (block.timestamp >= profile.lastUsageReset + 24 hours) {
            profile.dailyLGUUsed = 0;
            profile.lastUsageReset = block.timestamp;
        }
        
        // Check gateway daily limit
        if (profile.dailyLGUUsed + gasNeeded > profile.dailyLGULimit) {
            emit DailyLimitWarning(gateway, profile.dailyLGUUsed + gasNeeded, profile.dailyLGULimit);
            return false;
        }
        
        return true;
    }
    
    function _consumeLGU(uint256 amount, address gateway) internal {
        require(_checkGasTankAvailability(amount), "Insufficient gas tank");
        require(_checkGatewayQuota(gateway, amount), "Gateway quota exceeded");
        
        // Update balances
        lguBalance -= amount;
        systemDailyLGUUsed += amount;
        gatewayProfiles[gateway].dailyLGUUsed += amount;
        
        // Check for warnings
        if (lguBalance <= minLGUReserve) {
            emit LGUReserveWarning(lguBalance, minLGUReserve);
        }
        
        // Reset system daily usage if needed
        if (block.timestamp >= lastSystemReset + 24 hours) {
            systemDailyLGUUsed = 0;
            lastSystemReset = block.timestamp;
        }
    }
    
    // ============ PAYMENT NORMALIZATION ============
    
    function normalizePayment(address token, uint256 amount) public view returns (uint256 usdtAmount) {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == usdtToken) {
            return amount;
        } else {
            uint256 tokenPriceUSDT = IPriceOracle(priceOracle).getPrice(token);
            return (amount * tokenPriceUSDT) / (1e18 * 1e12);
        }
    }
    
    // ============ SESSION MANAGEMENT ============
    
    function startSession(
        address user,
        address paymentToken,
        uint256 paymentAmount
    ) external returns (bytes32 sessionId) {
        // Check paymaster mode
        if (paymasterMode == PaymasterMode.PAUSED) {
            revert("Paymaster paused");
        }
        
        // Check gateway authorization
        require(gatewayProfiles[msg.sender].allowed, "Gateway not authorized");
        
        // Validate user subscription (only in DEGRADED mode)
        if (paymasterMode == PaymasterMode.DEGRADED) {
            require(ISubscription(subscription).active(user), "Subscription required in degraded mode");
        }
        
        require(supportedTokens[paymentToken], "Token not supported");
        require(userActiveSession[user] != bytes32(0), "Session already active");
        
        // Process payment
        uint256 sessionValueUSDT = normalizePayment(paymentToken, paymentAmount);
        require(sessionValueUSDT > 0, "Invalid payment amount");
        
        // Create session
        sessionId = keccak256(abi.encodePacked(user, block.timestamp, msg.sender, sessionValueUSDT));
        sessions[sessionId] = Session({
            user: user,
            startTime: block.timestamp,
            sessionValueUSDT: sessionValueUSDT,
            gasUsedLGU: 0,
            active: true,
            paymentToken: paymentToken,
            paymentAmount: paymentAmount,
            gateway: msg.sender
        });
        
        userActiveSession[user] = sessionId;
        
        // Transfer payment token to gas tank wallet
        IERC20(paymentToken).safeTransferFrom(user, gasTankWallet, paymentAmount);
        
        emit SessionStarted(sessionId, user, paymentToken, paymentAmount, msg.sender);
        emit PaymentNormalized(paymentToken, paymentAmount, sessionValueUSDT);
        
        return sessionId;
    }
    
    function endSession(bytes32 sessionId) external {
        require(sessions[sessionId].active, "Session not active");
        require(gatewayProfiles[msg.sender].allowed, "Gateway not authorized");
        
        Session storage session = sessions[sessionId];
        session.active = false;
        delete userActiveSession[session.user];
        
        // Execute settlement
        _settleSession(sessionId);
        
        totalSessions++;
    }
    
    // ============ SETTLEMENT ENGINE ============
    
    function _settleSession(bytes32 sessionId) internal {
        Session storage session = sessions[sessionId];
        
        // Step 1: Fee calculation (1% always in USDT)
        uint256 feeUSDT = (session.sessionValueUSDT * FEE_BPS) / BPS_DENOMINATOR;
        
        // Step 2: Net value calculation
        uint256 netValueUSDT = session.sessionValueUSDT - feeUSDT;
        
        // Step 3: Gas cost calculation (INTERNAL ONLY)
        uint256 gasCostUSDT = session.gasUsedLGU * lguPriceUSDT;
        
        // Step 4: LGU accounting (INTERNAL LEDGER)
        _consumeLGU(session.gasUsedLGU, session.gateway);
        
        // Step 5: Record profit metrics
        totalRevenueUSDT += feeUSDT;
        totalGasUsedLGU += session.gasUsedLGU;
        
        // Step 6: Emit settlement events
        emit SessionEnded(sessionId, session.user, session.sessionValueUSDT, feeUSDT, session.gasUsedLGU);
        emit LGUConsumed(session.user, session.gasUsedLGU, session.gateway);
        emit ProfitRecorded(feeUSDT, gasCostUSDT);
    }
    
    // ============ LGU ACCOUNTING ============
    
    function recordGasUsage(bytes32 sessionId, uint256 gasUsedLGU) external {
        require(gatewayProfiles[msg.sender].allowed, "Gateway not authorized");
        require(sessions[sessionId].active, "Session not active");
        require(gasUsedLGU > 0, "Invalid gas amount");
        require(gasUsedLGU <= maxGasPerSession, "Gas exceeds session limit");
        
        sessions[sessionId].gasUsedLGU = gasUsedLGU;
        emit LGUConsumed(sessions[sessionId].user, gasUsedLGU, msg.sender);
    }
    
    // ============ VALIDATION ============
    
    function validateUser(address user) external view returns (bool) {
        return ISubscription(subscription).active(user);
    }
    
    function validateGateway(address caller) external view returns (bool) {
        return gatewayProfiles[caller].allowed;
    }
    
    function validateSession(bytes32 sessionId) external view returns (bool) {
        return sessions[sessionId].active;
    }
    
    // ============ ENTERPRISE ANALYTICS ============
    
    function getGasTankStatus() external view returns (
        uint256 currentBalance,
        uint256 minReserve,
        uint256 dailySystemUsed,
        uint256 dailySystemLimit,
        PaymasterMode currentMode
    ) {
        return (
            lguBalance,
            minLGUReserve,
            systemDailyLGUUsed,
            dailyLGULimit,
            paymasterMode
        );
    }
    
    function getGatewayStatus(address gateway) external view returns (
        bool allowed,
        uint256 dailyLimit,
        uint256 dailyUsed,
        uint256 lastReset,
        string memory metadataURI
    ) {
        GatewayProfile storage profile = gatewayProfiles[gateway];
        return (
            profile.allowed,
            profile.dailyLGULimit,
            profile.dailyLGUUsed,
            profile.lastUsageReset,
            profile.metadataURI
        );
    }
    
    function getProfitMetrics() external view returns (
        uint256 revenue,
        uint256 totalGas,
        uint256 currentLGUBalance,
        uint256 sessionCount
    ) {
        return (
            totalRevenueUSDT,
            totalGasUsedLGU,
            lguBalance,
            totalSessions
        );
    }
    
    function getSessionDetails(bytes32 sessionId) external view returns (
        address user,
        uint256 startTime,
        uint256 sessionValueUSDT,
        uint256 gasUsedLGU,
        bool active,
        address paymentToken,
        uint256 paymentAmount,
        address gateway
    ) {
        Session storage session = sessions[sessionId];
        return (
            session.user,
            session.startTime,
            session.sessionValueUSDT,
            session.gasUsedLGU,
            session.active,
            session.paymentToken,
            session.paymentAmount,
            session.gateway
        );
    }
}
