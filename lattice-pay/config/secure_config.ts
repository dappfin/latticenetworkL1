// config/secure_config.ts
import { ethers } from "hardhat";

// SECURE CONFIGURATION - NEVER COMMIT REAL VALUES
export const SECURE_CONFIG = {
  // Real gas tank wallet address (public)
  GAS_TANK_WALLET: "0x1bd3841af088e60E7fDa94E461182D50B8364214",
  
  // Network configuration
  NETWORK: "mainnet",
  CHAIN_ID: 88401,
  
  // Enterprise parameters
  GAS_TANK_PARAMS: {
    minLGUReserve: ethers.parseEther("100000"),    // 100K LGU minimum reserve
    dailyLGULimit: ethers.parseEther("10000000"),  // 10M LGU daily limit
    maxGasPerSession: ethers.parseEther("1000"),   // 1K LGU max per session
    initialBalance: ethers.parseEther("1000000")   // 1M LGU initial balance
  },
  
  // Monitoring thresholds
  ALERT_THRESHOLDS: {
    lgubalanceWarning: ethers.parseEther("200000"),   // 200K LGU
    lgubalanceCritical: ethers.parseEther("100000"),  // 100K LGU
    dailyUsageWarning: ethers.parseEther("8000000"),  // 8M LGU
    dailyUsageCritical: ethers.parseEther("9500000"), // 9.5M LGU
    gatewayUsageWarning: ethers.parseEther("800000"), // 800K LGU
    gatewayUsageCritical: ethers.parseEther("950000")  // 950K LGU
  },
  
  // Partner gateway limits
  GATEWAY_LIMITS: {
    partner1: ethers.parseEther("1000000"), // 1M LGU daily limit
    partner2: ethers.parseEther("500000"),  // 500K LGU daily limit
    default: ethers.parseEther("1000000")   // Default limit
  }
};

// Security validation
export function validateGasTankWallet(address: string): boolean {
  return ethers.isAddress(address) && address === SECURE_CONFIG.GAS_TANK_WALLET;
}

export function getGasTankWallet(): string {
  return SECURE_CONFIG.GAS_TANK_WALLET;
}

// WARNING: Never log or expose private keys
export const SECURITY_WARNINGS = {
  NEVER_COMMIT_PRIVATE_KEYS: true,
  NEVER_LOG_WALLET_KEYS: true,
  ALWAYS_USE_ENVIRONMENT_VARIABLES: true,
  VERIFY_GAS_TANK_WALLET: "0x1bd3841af088e60E7fDa94E461182D50B8364214"
};
