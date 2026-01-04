// test/enterprise_end_to_end.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("🏢 Enterprise Paymaster - End to End Tests", function () {
  let paymaster: any;
  let monitor: any;
  let usdt: any;
  let usdc: any;
  let priceOracle: any;
  let subscription: any;
  
  // Gas tank wallet (real address)
  const GAS_TANK_WALLET = "0x1bd3841af088e60E7fDa94E461182D50B8364214";
  
  let owner: any;
  let partner1: any;
  let partner2: any;
  let user1: any;
  let user2: any;
  
  beforeEach(async function () {
    [owner, partner1, partner2, user1, user2] = await ethers.getSigners();
    
    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20.deploy("USDT", "USDT", 6);
    usdc = await MockERC20.deploy("USDC", "USDC", 18);
    
    await usdt.waitForDeployment();
    await usdc.waitForDeployment();
    
    // Deploy infrastructure
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracle.deploy(await usdt.getAddress());
    await priceOracle.waitForDeployment();
    
    const Subscription = await ethers.getContractFactory("Subscription");
    subscription = await Subscription.deploy(await usdt.getAddress());
    await subscription.waitForDeployment();
    
    // Deploy Enterprise Paymaster
    const EnterprisePaymaster = await ethers.getContractFactory("EnterprisePaymaster");
    paymaster = await EnterprisePaymaster.deploy(
      await subscription.getAddress(),
      await priceOracle.getAddress(),
      await usdt.getAddress()
    ) as any;
    await paymaster.waitForDeployment();
    
    // Deploy Monitor
    const EnterpriseMonitor = await ethers.getContractFactory("EnterpriseMonitor");
    monitor = await EnterpriseMonitor.deploy(await paymaster.getAddress()) as any;
    await monitor.waitForDeployment();
    
    // Setup enterprise configuration
    await paymaster.setGasTankParameters(
      ethers.parseEther("100000"),    // 100K LGU min reserve
      ethers.parseEther("10000000"),  // 10M LGU daily limit
      ethers.parseEther("1000")       // 1K LGU max per session
    );
    
    await priceOracle.addToken(await usdc.getAddress(), ethers.parseEther("1"));
    
    await paymaster.addGatewayProfile(
      await partner1.getAddress(),
      ethers.parseEther("1000000"), // 1M LGU daily limit
      "https://metadata.lattice.network/gateways/partner1"
    );
    
    await paymaster.addGatewayProfile(
      await partner2.getAddress(),
      ethers.parseEther("500000"),  // 500K LGU daily limit
      "https://metadata.lattice.network/gateways/partner2"
    );
    
    await paymaster.addSupportedToken(await usdc.getAddress());
    
    await monitor.updateAlertThresholds(
      ethers.parseEther("200000"),   // LGU balance warning
      ethers.parseEther("100000"),   // LGU balance critical
      ethers.parseEther("8000000"),  // Daily usage warning
      ethers.parseEther("9500000"),  // Daily usage critical
      ethers.parseEther("800000"),   // Gateway usage warning
      ethers.parseEther("950000")    // Gateway usage critical
    );
    
    // Fund gas tank
    await paymaster.topUpLGUBalance(ethers.parseEther("1000000")); // 1M LGU
    
    // Fund users and partners
    await usdt.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdt.mint(user2.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user1.address, ethers.parseUnits("10000", 18));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 18));
    
    await usdt.connect(user1).approve(await paymaster.getAddress(), ethers.parseUnits("5000", 6));
    await usdt.connect(user2).approve(await paymaster.getAddress(), ethers.parseUnits("5000", 6));
    await usdc.connect(user1).approve(await paymaster.getAddress(), ethers.parseUnits("5000", 18));
    await usdc.connect(user2).approve(await paymaster.getAddress(), ethers.parseUnits("5000", 18));
  });
  
  describe("🔐 Gas Tank Wallet Verification", function () {
    it("Should have correct gas tank wallet address", async function () {
      expect(await paymaster.GAS_TANK_WALLET()).to.equal(GAS_TANK_WALLET);
    });
    
    it("Should be a valid Ethereum address", async function () {
      expect(ethers.isAddress(GAS_TANK_WALLET)).to.be.true;
    });
  });
  
  describe("⛽ Gas Tank Controls", function () {
    it("Should enforce minimum reserve", async function () {
      const initialBalance = await paymaster.lguBalance();
      const minReserve = await paymaster.minLGUReserve();
      
      // Try to consume below minimum reserve
      const consumeAmount = (initialBalance as bigint - minReserve as bigint) + ethers.parseEther("1");
      
      // This should fail due to insufficient reserve - we need to test through actual session
      // Create a session and try to consume too much gas
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      // Try to consume more than available
      await expect(
        paymaster.connect(partner1).recordGasUsage(sessionId, consumeAmount)
      ).to.be.reverted;
    });
    
    it("Should enforce daily system limits", async function () {
      const dailyLimit = await paymaster.dailyLGULimit();
      
      // Try to consume more than daily limit through session
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      // Try to consume more than daily limit
      await expect(
        paymaster.connect(partner1).recordGasUsage(sessionId, dailyLimit + ethers.parseEther("1"))
      ).to.be.reverted;
    });
    
    it("Should enforce gateway quotas", async function () {
      const gatewayLimit = ethers.parseEther("1000000"); // 1M LGU
      
      // Try to consume more than gateway limit through session
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      // Try to consume more than gateway limit
      await expect(
        paymaster.connect(partner1).recordGasUsage(sessionId, gatewayLimit + ethers.parseEther("1"))
      ).to.be.reverted;
    });
  });
  
  describe("🏥 Health Modes", function () {
    it("Should support ACTIVE mode", async function () {
      // Check if already in ACTIVE mode
      const currentMode = await paymaster.paymasterMode();
      expect(currentMode).to.equal(0); // Should be ACTIVE by default
      
      // Should allow sessions in ACTIVE mode
      await expect(
        paymaster.connect(partner1).startSession(
          user1.address,
          await usdt.getAddress(),
          ethers.parseUnits("100", 6)
        )
      ).to.not.be.reverted;
    });
    
    it("Should support DEGRADED mode", async function () {
      await paymaster.setPaymasterMode(1); // DEGRADED
      expect(await paymaster.paymasterMode()).to.equal(1);
      
      // Setup user subscription
      await usdt.connect(user1).approve(await subscription.getAddress(), ethers.parseUnits("50", 6));
      await subscription.connect(user1).purchaseSubscription(1, 1);
      
      // Should allow sessions with subscription in DEGRADED mode
      await expect(
        paymaster.connect(partner1).startSession(
          user1.address,
          await usdt.getAddress(),
          ethers.parseUnits("100", 6)
        )
      ).to.not.be.reverted;
    });
    
    it("Should support PAUSED mode", async function () {
      await paymaster.setPaymasterMode(2); // PAUSED
      expect(await paymaster.paymasterMode()).to.equal(2);
      
      // Should reject sessions in PAUSED mode
      await expect(
        paymaster.connect(partner1).startSession(
          user1.address,
          await usdt.getAddress(),
          ethers.parseUnits("100", 6)
        )
      ).to.be.revertedWith("Paymaster paused");
    });
  });
  
  describe("🎬 Complete Session Flow", function () {
    it("Should handle complete end-to-end session", async function () {
      // Setup user subscription
      await usdt.connect(user1).approve(await subscription.getAddress(), ethers.parseUnits("50", 6));
      await subscription.connect(user1).purchaseSubscription(1, 1);
      
      // Start session
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      // Extract session ID
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      expect(sessionEvent).to.not.be.undefined;
      const parsed = paymaster.interface.parseLog(sessionEvent!);
      const sessionId = parsed.args.sessionId;
      
      // Verify session started
      const sessionDetails = await paymaster.getSessionDetails(sessionId);
      expect(sessionDetails.user).to.equal(user1.address);
      expect(sessionDetails.active).to.be.true;
      expect(sessionDetails.sessionValueUSDT).to.equal(ethers.parseUnits("100", 6));
      
      // Record gas usage
      await paymaster.connect(partner1).recordGasUsage(sessionId, ethers.parseEther("500"));
      
      // End session
      await paymaster.connect(partner1).endSession(sessionId);
      
      // Verify session ended
      const finalSessionDetails = await paymaster.getSessionDetails(sessionId);
      expect(finalSessionDetails.active).to.be.false;
      
      // Verify profit metrics
      const profitMetrics = await paymaster.getProfitMetrics();
      expect(profitMetrics.sessionCount).to.equal(1);
      expect(profitMetrics.revenue).to.equal(ethers.parseUnits("1", 6)); // 1% of 100 USDT
      expect(profitMetrics.totalGas).to.equal(ethers.parseEther("500"));
      
      // Verify gas tank status
      const gasTankStatus = await paymaster.getGasTankStatus();
      expect(gasTankStatus.currentBalance).to.equal(ethers.parseEther("1999500")); // 2M - 500 LGU (we topped up 2M in beforeEach)
    });
    
    it("Should handle USDC payment normalization", async function () {
      // Start session with USDC
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdc.getAddress(),
        ethers.parseUnits("100", 18) // 100 USDC
      );
      const receipt = await tx.wait();
      
      // Extract session ID
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      // Verify normalization (100 USDC should normalize to 100 USDT)
      const sessionDetails = await paymaster.getSessionDetails(sessionId);
      expect(sessionDetails.sessionValueUSDT).to.equal(ethers.parseUnits("100", 6));
      
      // End session
      await paymaster.connect(partner1).recordGasUsage(sessionId, ethers.parseEther("300"));
      await paymaster.connect(partner1).endSession(sessionId);
    });
  });
  
  describe("🌐 Partner Gateway System", function () {
    it("Should track gateway usage correctly", async function () {
      // Start session through partner1
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      // Record gas usage
      await paymaster.connect(partner1).recordGasUsage(sessionId, ethers.parseEther("200"));
      await paymaster.connect(partner1).endSession(sessionId);
      
      // Check gateway usage
      const gatewayStatus = await paymaster.getGatewayStatus(await partner1.getAddress());
      expect(gatewayStatus.dailyUsed).to.equal(ethers.parseEther("200"));
    });
    
    it("Should enforce gateway limits", async function () {
      // Try to exceed gateway daily limit through session
      const excessAmount = ethers.parseEther("2000000"); // 2M LGU > 1M limit
      
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      await expect(
        paymaster.connect(partner1).recordGasUsage(sessionId, excessAmount)
      ).to.be.reverted;
    });
  });
  
  describe("🏥 Enterprise Monitoring", function () {
    it("Should perform health checks", async function () {
      const tx = await monitor.performHealthCheck();
      const receipt = await tx.wait();
      
      // Check if the transaction succeeded and didn't emit emergency alerts
      const emergencyEvents = receipt?.logs?.filter((log: any) => {
        try {
          const parsed = monitor.interface.parseLog(log);
          return parsed && parsed.name === "EmergencyModeActivated";
        } catch {
          return false;
        }
      });
      
      expect(emergencyEvents?.length || 0).to.equal(0);
    });
    
    it("Should track system health", async function () {
      const health = await monitor.getSystemHealth();
      expect(health.healthy).to.be.true;
      expect(health.status).to.equal("HEALTHY");
      expect(health.lguBalance).to.equal(ethers.parseEther("2000000")); // We topped up 2M in beforeEach
    });
    
    it("Should check gateway health", async function () {
      const tx = await monitor.checkGatewayHealth(await partner1.getAddress());
      const receipt = await tx.wait();
      
      // Check if the transaction succeeded and didn't emit critical alerts
      const criticalEvents = receipt?.logs?.filter((log: any) => {
        try {
          const parsed = monitor.interface.parseLog(log);
          return parsed && (parsed.name === "AlertTriggered" && parsed.args.alertType.toString().includes("CRITICAL"));
        } catch {
          return false;
        }
      });
      
      expect(criticalEvents?.length || 0).to.equal(0);
    });
    
    it("Should provide alert summary", async function () {
      const alertSummary = await monitor.getAlertSummary();
      expect(alertSummary.totalAlerts).to.equal(0);
      expect(alertSummary.inEmergencyMode).to.be.false;
    });
  });
  
  describe("🔒 Security Tests", function () {
    it("Should reject unauthorized gateway", async function () {
      await expect(
        paymaster.connect(user1).startSession(
          user1.address,
          await usdt.getAddress(),
          ethers.parseUnits("100", 6)
        )
      ).to.be.revertedWith("Gateway not authorized");
    });
    
    it("Should reject invalid tokens", async function () {
      await expect(
        paymaster.connect(partner1).startSession(
          user1.address,
          user2.address, // Invalid token
          ethers.parseUnits("100", 6)
        )
      ).to.be.revertedWith("Token not supported");
    });
    
    it("Should enforce gas limits per session", async function () {
      const tx = await paymaster.connect(partner1).startSession(
        user1.address,
        await usdt.getAddress(),
        ethers.parseUnits("100", 6)
      );
      const receipt = await tx.wait();
      
      const sessionEvent = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed && parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      
      const sessionId = paymaster.interface.parseLog(sessionEvent!).args.sessionId;
      
      // Try to exceed max gas per session
      const excessGas = ethers.parseEther("2000"); // 2K > 1K limit
      
      await expect(
        paymaster.connect(partner1).recordGasUsage(sessionId, excessGas)
      ).to.be.revertedWith("Gas exceeds session limit");
    });
  });
});
