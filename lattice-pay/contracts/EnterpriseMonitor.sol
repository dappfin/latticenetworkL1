// contracts/EnterpriseMonitor.sol
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./EnterprisePaymaster.sol";

contract EnterpriseMonitor is Ownable {
    
    // ============ MONITORING CONFIGURATION ============
    
    struct AlertThresholds {
        uint256 lguBalanceWarning;      // Warning level for LGU balance
        uint256 lguBalanceCritical;     // Critical level for LGU balance
        uint256 dailyUsageWarning;      // Warning for daily system usage
        uint256 dailyUsageCritical;     // Critical for daily system usage
        uint256 gatewayUsageWarning;    // Warning for gateway usage
        uint256 gatewayUsageCritical;   // Critical for gateway usage
    }
    
    struct MonitoringMetrics {
        uint256 timestamp;
        uint256 lguBalance;
        uint256 dailySystemUsage;
        uint256 totalSessions;
        uint256 totalRevenue;
        uint256 activeGateways;
        uint256 pausedGateways;
    }
    
    // ============ STATE VARIABLES ============
    
    EnterprisePaymaster public paymaster;
    AlertThresholds public alertThresholds;
    
    // Monitoring data
    MonitoringMetrics[] public historicalMetrics;
    mapping(address => uint256) public gatewayAlertCounts;
    mapping(string => uint256) public systemAlertCounts;
    
    // Alert tracking
    uint256 public lastAlertTime;
    bool public emergencyMode;
    uint256 public emergencyModeStart;
    
    // Events
    event AlertTriggered(
        string alertType,
        address indexed gateway,
        uint256 currentValue,
        uint256 threshold,
        uint256 timestamp
    );
    
    event EmergencyModeActivated(string reason, uint256 timestamp);
    event EmergencyModeDeactivated(uint256 timestamp);
    event MetricsReported(
        uint256 lguBalance,
        uint256 dailyUsage,
        uint256 totalSessions,
        uint256 timestamp
    );
    
    event GatewayHealthCheck(
        address indexed gateway,
        bool healthy,
        uint256 dailyUsage,
        uint256 limit,
        uint256 timestamp
    );
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _paymaster) Ownable(msg.sender) {
        paymaster = EnterprisePaymaster(_paymaster);
        _initializeAlertThresholds();
    }
    
    function _initializeAlertThresholds() internal {
        alertThresholds = AlertThresholds({
            lguBalanceWarning: 200_000 * 1e18,      // 200K LGU
            lguBalanceCritical: 100_000 * 1e18,     // 100K LGU
            dailyUsageWarning: 8_000_000 * 1e18,     // 8M LGU
            dailyUsageCritical: 9_500_000 * 1e18,    // 9.5M LGU
            gatewayUsageWarning: 800_000 * 1e18,     // 800K LGU
            gatewayUsageCritical: 950_000 * 1e18     // 950K LGU
        });
    }
    
    // ============ MONITORING FUNCTIONS ============
    
    function performHealthCheck() external returns (bool healthy) {
        (uint256 lguBalance, uint256 minReserve, uint256 dailyUsed, uint256 dailyLimit, ) = paymaster.getGasTankStatus();
        
        healthy = true;
        
        // Check LGU balance
        if (lguBalance <= alertThresholds.lguBalanceCritical) {
            // Trigger alerts BEFORE external call to prevent reentrancy
            _triggerAlert("LGU_BALANCE_CRITICAL", address(0), lguBalance, alertThresholds.lguBalanceCritical);
            healthy = false;
            
            // Auto-emergency if critically low
            if (!emergencyMode) {
                _activateEmergencyMode("Critical LGU balance");
            }
        } else if (lguBalance <= alertThresholds.lguBalanceWarning) {
            _triggerAlert("LGU_BALANCE_WARNING", address(0), lguBalance, alertThresholds.lguBalanceWarning);
        }
        
        // Check daily system usage
        if (dailyUsed >= alertThresholds.dailyUsageCritical) {
            _triggerAlert("DAILY_USAGE_CRITICAL", address(0), dailyUsed, alertThresholds.dailyUsageCritical);
            healthy = false;
        } else if (dailyUsed >= alertThresholds.dailyUsageWarning) {
            _triggerAlert("DAILY_USAGE_WARNING", address(0), dailyUsed, alertThresholds.dailyUsageWarning);
        }
        
        // Record metrics
        _recordMetrics();
        
        return healthy;
    }
    
    function checkGatewayHealth(address gateway) external returns (bool healthy) {
        (bool allowed, uint256 dailyLimit, uint256 dailyUsed, uint256 lastReset, string memory metadataURI) = paymaster.getGatewayStatus(gateway);
        
        if (!allowed) {
            emit GatewayHealthCheck(gateway, false, dailyUsed, dailyLimit, block.timestamp);
            return false;
        }
        
        healthy = true;
        
        // Check if gateway is approaching its limit
        if (dailyUsed >= alertThresholds.gatewayUsageCritical) {
            _triggerAlert("GATEWAY_USAGE_CRITICAL", gateway, dailyUsed, alertThresholds.gatewayUsageCritical);
            healthy = false;
        } else if (dailyUsed >= alertThresholds.gatewayUsageWarning) {
            _triggerAlert("GATEWAY_USAGE_WARNING", gateway, dailyUsed, alertThresholds.gatewayUsageWarning);
        }
        
        emit GatewayHealthCheck(gateway, healthy, dailyUsed, dailyLimit, block.timestamp);
        return healthy;
    }
    
    function performSystemDiagnostics() external returns (
        bool systemHealthy,
        uint256 activeGateways,
        uint256 alertCount,
        uint256 recommendations
    ) {
        systemHealthy = true;
        activeGateways = 0;
        alertCount = 0;
        recommendations = 0;
        
        // Check overall system health
        (uint256 lguBalance, uint256 minReserve, uint256 dailyUsed, uint256 dailyLimit, EnterprisePaymaster.PaymasterMode currentMode) = paymaster.getGasTankStatus();
        
        // LGU Balance Health
        if (lguBalance <= minReserve) {
            systemHealthy = false;
            recommendations |= 1; // Recommend top-up
        }
        
        // Daily Usage Health
        if (dailyUsed >= dailyLimit * 90 / 100) { // 90% threshold
            systemHealthy = false;
            recommendations |= 2; // Recommend limit adjustment
        }
        
        // Count total alerts in last hour
        if (block.timestamp <= lastAlertTime + 1 hours) {
            alertCount = systemAlertCounts["TOTAL"];
        }
        
        return (systemHealthy, activeGateways, alertCount, recommendations);
    }
    
    // ============ ALERT MANAGEMENT ============
    
    function _triggerAlert(
        string memory alertType,
        address gateway,
        uint256 currentValue,
        uint256 threshold
    ) internal {
        lastAlertTime = block.timestamp;
        
        // Update alert counts
        systemAlertCounts[alertType]++;
        systemAlertCounts["TOTAL"]++;
        
        if (gateway != address(0)) {
            gatewayAlertCounts[gateway]++;
        }
        
        emit AlertTriggered(alertType, gateway, currentValue, threshold, block.timestamp);
    }
    
    function _activateEmergencyMode(string memory reason) internal {
        emergencyMode = true;
        emergencyModeStart = block.timestamp;
        
        emit EmergencyModeActivated(reason, block.timestamp);
        
        // Set paymaster to PAUSED mode AFTER state changes to prevent reentrancy
        paymaster.setPaymasterMode(EnterprisePaymaster.PaymasterMode.PAUSED);
    }
    
    function deactivateEmergencyMode() external onlyOwner {
        require(emergencyMode, "Not in emergency mode");
        
        emergencyMode = false;
        paymaster.setPaymasterMode(EnterprisePaymaster.PaymasterMode.ACTIVE);
        
        emit EmergencyModeDeactivated(block.timestamp);
    }
    
    // ============ METRICS COLLECTION ============
    
    function _recordMetrics() internal {
        (uint256 lguBalance, uint256 minReserve, uint256 dailyUsed, uint256 dailyLimit, EnterprisePaymaster.PaymasterMode currentMode) = paymaster.getGasTankStatus();
        (uint256 revenue, uint256 totalGas, uint256 currentLGUBalance, uint256 sessionCount) = paymaster.getProfitMetrics();
        
        historicalMetrics.push(MonitoringMetrics({
            timestamp: block.timestamp,
            lguBalance: lguBalance,
            dailySystemUsage: dailyUsed,
            totalSessions: sessionCount,
            totalRevenue: revenue,
            activeGateways: 0, // Would need to track this separately
            pausedGateways: 0
        }));
        
        emit MetricsReported(lguBalance, dailyUsed, sessionCount, block.timestamp);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function updateAlertThresholds(
        uint256 _lguBalanceWarning,
        uint256 _lguBalanceCritical,
        uint256 _dailyUsageWarning,
        uint256 _dailyUsageCritical,
        uint256 _gatewayUsageWarning,
        uint256 _gatewayUsageCritical
    ) external onlyOwner {
        alertThresholds = AlertThresholds({
            lguBalanceWarning: _lguBalanceWarning,
            lguBalanceCritical: _lguBalanceCritical,
            dailyUsageWarning: _dailyUsageWarning,
            dailyUsageCritical: _dailyUsageCritical,
            gatewayUsageWarning: _gatewayUsageWarning,
            gatewayUsageCritical: _gatewayUsageCritical
        });
    }
    
    function forceEmergencyMode(string memory reason) external onlyOwner {
        _activateEmergencyMode(reason);
    }
    
    // ============ ANALYTICS FUNCTIONS ============
    
    function getMetricsHistory(uint256 offset, uint256 limit) external view returns (MonitoringMetrics[] memory) {
        uint256 end = offset + limit;
        if (end > historicalMetrics.length) {
            end = historicalMetrics.length;
        }
        
        MonitoringMetrics[] memory result = new MonitoringMetrics[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = historicalMetrics[i];
        }
        
        return result;
    }
    
    function getAlertSummary() external view returns (
        uint256 totalAlerts,
        uint256 lgubalanceAlerts,
        uint256 dailyUsageAlerts,
        uint256 gatewayAlerts,
        bool inEmergencyMode,
        uint256 emergencyDuration
    ) {
        return (
            systemAlertCounts["TOTAL"],
            systemAlertCounts["LGU_BALANCE_CRITICAL"] + systemAlertCounts["LGU_BALANCE_WARNING"],
            systemAlertCounts["DAILY_USAGE_CRITICAL"] + systemAlertCounts["DAILY_USAGE_WARNING"],
            systemAlertCounts["GATEWAY_USAGE_CRITICAL"] + systemAlertCounts["GATEWAY_USAGE_WARNING"],
            emergencyMode,
            emergencyMode ? block.timestamp - emergencyModeStart : 0
        );
    }
    
    function getGatewayAlertCount(address gateway) external view returns (uint256) {
        return gatewayAlertCounts[gateway];
    }
    
    function getSystemHealth() external view returns (
        bool healthy,
        string memory status,
        uint256 lguBalance,
        uint256 minReserve,
        uint256 dailyUsage,
        uint256 dailyLimit,
        EnterprisePaymaster.PaymasterMode currentMode
    ) {
        (lguBalance, minReserve, dailyUsage, dailyLimit, currentMode) = paymaster.getGasTankStatus();
        
        if (emergencyMode) {
            return (false, "EMERGENCY", lguBalance, minReserve, dailyUsage, dailyLimit, currentMode);
        } else if (lguBalance <= alertThresholds.lguBalanceCritical) {
            return (false, "CRITICAL", lguBalance, minReserve, dailyUsage, dailyLimit, currentMode);
        } else if (lguBalance <= alertThresholds.lguBalanceWarning || dailyUsage >= alertThresholds.dailyUsageWarning) {
            return (false, "WARNING", lguBalance, minReserve, dailyUsage, dailyLimit, currentMode);
        } else {
            return (true, "HEALTHY", lguBalance, minReserve, dailyUsage, dailyLimit, currentMode);
        }
    }
}
