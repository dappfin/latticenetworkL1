// contracts/Paymaster.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ISubscription {
    function active(address) external view returns (bool);
    function canStartSession(address user, uint256 sessionValueUSDT) external view returns (bool);
    function recordSession(address user) external;
}

interface IGateway {
    function isAllowed(address) external view returns (bool);
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
    function getUSDTPrice() external view returns (uint256);
}

contract LatticePaymaster is Ownable {
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant FEE_BPS = 100; // 1% fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant LGU_PRICE_USDT = 1 * 1e6; // 1 USDT per LGU (6 decimals for USDT)
    
    // State variables
    address public subscription;
    address public gateway;
    address public priceOracle;
    address public usdtToken;
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // LGU Accounting (internal ledger)
    uint256 public paymasterLGUBalance;
    mapping(address => uint256) public userLGUUsage;
    
    // Session tracking
    struct Session {
        address user;
        uint256 startTime;
        uint256 sessionValueUSDT;
        uint256 gasUsedLGU;
        bool active;
        address paymentToken;
        uint256 paymentAmount;
    }
    
    mapping(bytes32 => Session) public sessions;
    mapping(address => bytes32) public userActiveSession;
    
    // Profit tracking
    uint256 public totalRevenueUSDT;
    uint256 public totalSessions;
    uint256 public totalGasUsedLGU;
    
    // Events
    event SessionStarted(bytes32 indexed sessionId, address indexed user, address paymentToken, uint256 paymentAmount);
    event SessionEnded(bytes32 indexed sessionId, address indexed user, uint256 sessionValueUSDT, uint256 feeUSDT, uint256 gasUsedLGU);
    event PaymentNormalized(address indexed token, uint256 amount, uint256 usdtAmount);
    event LGUConsumed(address indexed user, uint256 amount);
    event ProfitRecorded(uint256 revenueUSDT, uint256 gasCostUSDT);
    
    constructor(
        address _subscription,
        address _gateway,
        address _priceOracle,
        address _usdtToken
    ) Ownable(msg.sender) {
        subscription = _subscription;
        gateway = _gateway;
        priceOracle = _priceOracle;
        usdtToken = _usdtToken;
        
        // Initialize with supported tokens
        supportedTokens[_usdtToken] = true;
        tokenList.push(_usdtToken);
        
        // Initialize paymaster LGU balance
        paymasterLGUBalance = 1_000_000 * 1e18; // 1M LGU initial balance
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function addSupportedToken(address token) external onlyOwner {
        if (!supportedTokens[token]) {
            supportedTokens[token] = true;
            tokenList.push(token);
        }
    }
    
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        // Remove from tokenList (simplified - in production, implement proper removal)
    }
    
    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = _priceOracle;
    }
    
    function topUpLGUBalance(uint256 amount) external onlyOwner {
        paymasterLGUBalance += amount;
    }
    
    // ============ PAYMENT NORMALIZATION ============
    
    function normalizePayment(address token, uint256 amount) public view returns (uint256 usdtAmount) {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        if (token == usdtToken) {
            // USDT - use directly (6 decimals)
            return amount;
        } else {
            // Other tokens - convert to USDT
            uint256 tokenPriceUSDT = IPriceOracle(priceOracle).getPrice(token);
            // Convert token amount (18 decimals) to USDT (6 decimals)
            // tokenPriceUSDT has 1e18 precision, amount has 18 decimals
            // Result should have 6 decimals
            return (amount * tokenPriceUSDT) / (1e18 * 1e12);
        }
    }
    
    // ============ PAYMENT PROCESSING ============
    
    function processPayment(
        address user,
        address paymentToken,
        uint256 paymentAmount
    ) internal returns (uint256 usdtAmount) {
        require(IGateway(gateway).isAllowed(msg.sender), "GATEWAY_NOT_ALLOWED");
        require(supportedTokens[paymentToken], "Token not supported");
        require(paymentAmount > 0, "Invalid payment amount");
        
        // Normalize to USDT
        usdtAmount = normalizePayment(paymentToken, paymentAmount);
        require(usdtAmount > 0, "Invalid USDT amount");
        
        // Transfer payment token to paymaster
        IERC20(paymentToken).safeTransferFrom(user, address(this), paymentAmount);
        
        emit PaymentNormalized(paymentToken, paymentAmount, usdtAmount);
        return usdtAmount;
    }
    
    // ============ SESSION MANAGEMENT ============
    
    function startSession(
        address user,
        address paymentToken,
        uint256 paymentAmount
    ) external returns (bytes32 sessionId) {
        require(ISubscription(subscription).active(user), "NO_SUBSCRIPTION");
        require(IGateway(gateway).isAllowed(msg.sender), "GATEWAY_NOT_ALLOWED");
        require(supportedTokens[paymentToken], "Token not supported");
        require(userActiveSession[user] != bytes32(0), "Session already active");
        
        // Process payment first (MANDATORY)
        uint256 sessionValueUSDT = processPayment(user, paymentToken, paymentAmount);
        require(sessionValueUSDT > 0, "Invalid payment amount");
        
        // Validate subscription limits
        require(ISubscription(subscription).canStartSession(user, sessionValueUSDT), "Session limit exceeded");
        
        // Create session
        sessionId = keccak256(abi.encodePacked(user, block.timestamp, msg.sender, sessionValueUSDT));
        sessions[sessionId] = Session({
            user: user,
            startTime: block.timestamp,
            sessionValueUSDT: sessionValueUSDT,
            gasUsedLGU: 0,
            active: true,
            paymentToken: paymentToken,
            paymentAmount: paymentAmount
        });
        
        userActiveSession[user] = sessionId;
        
        // Record session in subscription (optional - requires authorization)
        // ISubscription(subscription).recordSession(user);
        
        emit SessionStarted(sessionId, user, paymentToken, paymentAmount);
        
        return sessionId;
    }
    
    function endSession(bytes32 sessionId) external {
        require(sessions[sessionId].active, "Session not active");
        require(IGateway(gateway).isAllowed(msg.sender), "GATEWAY_NOT_ALLOWED");
        
        Session storage session = sessions[sessionId];
        session.active = false;
        delete userActiveSession[session.user];
        
        // Execute settlement in strict order
        _settleSession(sessionId);
        
        totalSessions++;
    }
    
    // ============ SETTLEMENT ENGINE (STRICT ORDER) ============
    
    function _settleSession(bytes32 sessionId) internal {
        Session storage session = sessions[sessionId];
        
        // STRICT ORDER - NOT CHANGEABLE
        
        // Step 1: Session ends (already happened)
        // Step 2: Total value calculated (already done)
        // Step 3: Value converted to USDT (already done in startSession)
        // Step 4: Paymaster settlement begins (this function)
        
        // Step 5: Fee calculation (1% always in USDT)
        uint256 feeUSDT = (session.sessionValueUSDT * FEE_BPS) / BPS_DENOMINATOR;
        
        // Step 6: Net value calculation
        uint256 netValueUSDT = session.sessionValueUSDT - feeUSDT;
        
        // Step 7: Gas cost calculation (INTERNAL ONLY)
        uint256 gasCostUSDT = session.gasUsedLGU * LGU_PRICE_USDT;
        
        // Step 8: LGU accounting (INTERNAL LEDGER)
        require(paymasterLGUBalance >= session.gasUsedLGU, "Insufficient LGU balance");
        paymasterLGUBalance -= session.gasUsedLGU;
        userLGUUsage[session.user] += session.gasUsedLGU;
        
        // Step 9: Record profit metrics
        totalRevenueUSDT += feeUSDT;
        totalGasUsedLGU += session.gasUsedLGU;
        
        // Step 10: Emit settlement events
        emit SessionEnded(sessionId, session.user, session.sessionValueUSDT, feeUSDT, session.gasUsedLGU);
        emit LGUConsumed(session.user, session.gasUsedLGU);
        emit ProfitRecorded(feeUSDT, gasCostUSDT);
        
        // Final money flow is complete:
        // - User paid USDT-equivalent
        // - Paymaster kept 1% fee
        // - LGU was consumed internally
        // - Gas was abstracted from user
    }
    
    // ============ LGU ACCOUNTING (INTERNAL LEDGER) ============
    
    function recordGasUsage(bytes32 sessionId, uint256 gasUsedLGU) external {
        require(IGateway(gateway).isAllowed(msg.sender), "GATEWAY_NOT_ALLOWED");
        require(sessions[sessionId].active, "Session not active");
        require(gasUsedLGU > 0, "Invalid gas amount");
        
        sessions[sessionId].gasUsedLGU = gasUsedLGU;
        emit LGUConsumed(sessions[sessionId].user, gasUsedLGU);
    }
    
    // ============ PRODUCTION ANALYTICS ============
    
    function getDetailedProfitMetrics() external view returns (
        uint256 revenue,
        uint256 totalGas,
        uint256 currentLGUBalance,
        uint256 sessionCount,
        uint256 avgFeePerSession,
        uint256 avgGasPerSession,
        uint256 totalProfitMargin
    ) {
        uint256 avgFee = sessionCount > 0 ? totalRevenueUSDT / sessionCount : 0;
        uint256 avgGas = sessionCount > 0 ? totalGasUsedLGU / sessionCount : 0;
        uint256 totalGasCostUSDT = totalGasUsedLGU * LGU_PRICE_USDT;
        uint256 profitMargin = totalRevenueUSDT > 0 ? 
            ((totalRevenueUSDT - totalGasCostUSDT) * 10000) / totalRevenueUSDT : 0;
        
        return (
            totalRevenueUSDT,
            totalGasUsedLGU,
            paymasterLGUBalance,
            totalSessions,
            avgFee,
            avgGas,
            profitMargin
        );
    }
    
    function getUserMetrics(address user) external view returns (
        uint256 totalLGUUsed,
        uint256 sessionCount,
        bytes32 currentSessionId,
        bool hasActiveSession
    ) {
        bytes32 activeSession = userActiveSession[user];
        return (
            userLGUUsage[user],
            0, // Could track session count per user if needed
            activeSession,
            activeSession != bytes32(0) && sessions[activeSession].active
        );
    }
    
    // ============ PRODUCTION VALIDATION ============
    
    function validateUser(address user) external view returns (bool) {
        return ISubscription(subscription).active(user);
    }
    
    function validateGateway(address caller) external view returns (bool) {
        return IGateway(gateway).isAllowed(caller);
    }
    
    function validateSession(bytes32 sessionId) external view returns (bool) {
        return sessions[sessionId].active;
    }
    
    function validatePaymentToken(address token) external view returns (bool) {
        return supportedTokens[token];
    }
    
    function calculateSessionFee(uint256 sessionValueUSDT) external pure returns (uint256) {
        return (sessionValueUSDT * FEE_BPS) / BPS_DENOMINATOR;
    }
    
    function estimateGasCostUSDT(uint256 gasUsedLGU) external pure returns (uint256) {
        return gasUsedLGU * LGU_PRICE_USDT;
    }
    
    // ============ PROFIT ANALYTICS ============
    
    function getProfitMetrics() external view returns (
        uint256 revenue,
        uint256 totalGas,
        uint256 currentLGUBalance,
        uint256 sessionCount
    ) {
        return (
            totalRevenueUSDT,
            totalGasUsedLGU,
            paymasterLGUBalance,
            totalSessions
        );
    }
    
    function getUserSession(address user) external view returns (bytes32 sessionId) {
        return userActiveSession[user];
    }
    
    function getSessionDetails(bytes32 sessionId) external view returns (
        address user,
        uint256 startTime,
        uint256 sessionValueUSDT,
        uint256 gasUsedLGU,
        bool active,
        address paymentToken,
        uint256 paymentAmount
    ) {
        Session storage session = sessions[sessionId];
        return (
            session.user,
            session.startTime,
            session.sessionValueUSDT,
            session.gasUsedLGU,
            session.active,
            session.paymentToken,
            session.paymentAmount
        );
    }
}
