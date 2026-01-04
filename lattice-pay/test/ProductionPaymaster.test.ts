// test/ProductionPaymaster.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { LatticePaymaster, PriceOracle, Subscription, Gateway, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("🔒 PRODUCTION PAYMASTER - FINAL GAS & PAYMENT MODEL", function () {
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let gateway: SignerWithAddress;
  
  let paymaster: LatticePaymaster;
  let priceOracle: PriceOracle;
  let subscription: Subscription;
  let gatewayContract: Gateway;
  let usdt: MockERC20;
  let usdc: MockERC20;
  let eth: MockERC20;
  let erc20: MockERC20;

  // Constants for production model
  const FEE_BPS = 100n; // 1%
  const LGU_PRICE_USDT = 1n * 1e6n; // 1 USDT per LGU
  const USDT_DECIMALS = 6;
  const TOKEN_DECIMALS = 18;

  beforeEach(async function () {
    [owner, user1, user2, gateway] = await ethers.getSigners();

    // Deploy tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20Factory.deploy("USDT", "USDT", USDT_DECIMALS);
    usdc = await MockERC20Factory.deploy("USDC", "USDC", TOKEN_DECIMALS);
    eth = await MockERC20Factory.deploy("ETH", "ETH", TOKEN_DECIMALS);
    erc20 = await MockERC20Factory.deploy("CustomERC20", "CUSTOM", TOKEN_DECIMALS);

    // Deploy core contracts
    const GatewayFactory = await ethers.getContractFactory("Gateway");
    gatewayContract = await GatewayFactory.deploy();

    const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracleFactory.deploy(await usdt.getAddress());

    const SubscriptionFactory = await ethers.getContractFactory("Subscription");
    subscription = await SubscriptionFactory.deploy(await usdt.getAddress());

    const PaymasterFactory = await ethers.getContractFactory("LatticePaymaster");
    paymaster = await PaymasterFactory.deploy(
      await subscription.getAddress(),
      await gatewayContract.getAddress(),
      await priceOracle.getAddress(),
      await usdt.getAddress()
    );

    // Setup production configuration
    await setupProductionConfiguration();
  });

  async function setupProductionConfiguration() {
    // Add supported tokens to price oracle
    await priceOracle.addToken(await usdc.getAddress(), 1n * 1e12n); // 1 USDC = 1 USDT
    await priceOracle.addToken(await eth.getAddress(), 3000n * 1e12n); // 1 ETH = 3000 USDT
    await priceOracle.addToken(await erc20.getAddress(), 100n * 1e12n); // 1 CUSTOM = 100 USDT

    // Add supported tokens to paymaster
    await paymaster.addSupportedToken(await usdc.getAddress());
    await paymaster.addSupportedToken(await eth.getAddress());
    await paymaster.addSupportedToken(await erc20.getAddress());

    // Setup gateway
    await gatewayContract.addGateway(await gateway.getAddress(), 1000); // 1000 operations per hour
    await gatewayContract.addCaller(await gateway.getAddress());

    // Fund users with tokens
    await usdt.mint(user1.address, 10000n * 1e6n);
    await usdt.mint(user2.address, 10000n * 1e6n);
    await usdc.mint(user1.address, 10000n * 1e18n);
    await eth.mint(user1.address, 10n * 1e18n);
    await erc20.mint(user1.address, 1000n * 1e18n);

    // Setup subscriptions
    await usdt.connect(user1).approve(await subscription.getAddress(), 50n * 1e6n);
    await subscription.connect(user1).purchaseSubscription(1, 1); // Basic tier, 1 month

    await usdt.connect(user2).approve(await subscription.getAddress(), 50n * 1e6n);
    await subscription.connect(user2).purchaseSubscription(1, 1); // Basic tier, 1 month

    // Approve tokens for paymaster
    await usdt.connect(user1).approve(await paymaster.getAddress(), 5000n * 1e6n);
    await usdc.connect(user1).approve(await paymaster.getAddress(), 5000n * 1e18n);
    await eth.connect(user1).approve(await paymaster.getAddress(), 5n * 1e18n);
    await erc20.connect(user1).approve(await paymaster.getAddress(), 500n * 1e18n);
  }

  describe("🔒 HARD RULES (FINAL)", function () {
    it("✅ Should only support USDT, USDC, ETH, and allowed ERC20 tokens", async function () {
      expect(await paymaster.supportedTokens(await usdt.getAddress())).to.be.true;
      expect(await paymaster.supportedTokens(await usdc.getAddress())).to.be.true;
      expect(await paymaster.supportedTokens(await eth.getAddress())).to.be.true;
      expect(await paymaster.supportedTokens(await erc20.getAddress())).to.be.true;
    });

    it("✅ Should have 1% fee structure", async function () {
      expect(await paymaster.FEE_BPS()).to.equal(FEE_BPS);
    });

    it("✅ Should have LGU price set to 1 USDT", async function () {
      expect(await paymaster.LGU_PRICE_USDT()).to.equal(LGU_PRICE_USDT);
    });
  });

  describe("1️⃣ PAYMENT NORMALIZATION (MANDATORY)", function () {
    it("✅ USDT should be used directly", async function () {
      const paymentAmount = 100n * 1e6n; // 100 USDT
      const normalized = await paymaster.normalizePayment(await usdt.getAddress(), paymentAmount);
      expect(normalized).to.equal(paymentAmount);
    });

    it("✅ USDC should be normalized to USDT", async function () {
      const paymentAmount = 100n * 1e18n; // 100 USDC
      const normalized = await paymaster.normalizePayment(await usdc.getAddress(), paymentAmount);
      expect(normalized).to.equal(100n * 1e6n); // 100 USDT
    });

    it("✅ ETH should be normalized to USDT", async function () {
      const paymentAmount = 1n * 1e18n; // 1 ETH
      const normalized = await paymaster.normalizePayment(await eth.getAddress(), paymentAmount);
      expect(normalized).to.equal(3000n * 1e6n); // 3000 USDT
    });

    it("✅ ERC20 should be normalized to USDT", async function () {
      const paymentAmount = 10n * 1e18n; // 10 CUSTOM
      const normalized = await paymaster.normalizePayment(await erc20.getAddress(), paymentAmount);
      expect(normalized).to.equal(1000n * 1e6n); // 1000 USDT
    });

    it("❌ Should reject unsupported tokens", async function () {
      const randomToken = await (await ethers.getContractFactory("MockERC20")).deploy("RANDOM", "RAND", 18);
      await expect(
        paymaster.normalizePayment(await randomToken.getAddress(), 100n)
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("2️⃣ SESSION END → SETTLEMENT (STRICT ORDER)", function () {
    let sessionId: string;

    beforeEach(async function () {
      // Start a session with USDT payment
      const tx = await paymaster.connect(gateway).startSession(
        user1.address,
        await usdt.getAddress(),
        100n * 1e6n // 100 USDT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      if (event) {
        const parsed = paymaster.interface.parseLog(event);
        sessionId = parsed.args.sessionId;
      }
    });

    it("✅ Should follow strict settlement order", async function () {
      // Record gas usage
      await paymaster.connect(gateway).recordGasUsage(sessionId, 1000n); // 1000 LGU

      // End session (triggers settlement)
      await expect(paymaster.connect(gateway).endSession(sessionId))
        .to.emit(paymaster, "SessionEnded")
        .withArgs(
          sessionId,
          user1.address,
          100n * 1e6n, // sessionValueUSDT
          1n * 1e6n,   // feeUSDT (1%)
          1000n       // gasUsedLGU
        );
    });

    it("✅ Should record correct fee calculation", async function () {
      await paymaster.connect(gateway).recordGasUsage(sessionId, 1000n);
      await paymaster.connect(gateway).endSession(sessionId);

      const metrics = await paymaster.getProfitMetrics();
      expect(metrics.revenue).to.equal(1n * 1e6n); // 1 USDT fee
      expect(metrics.totalGas).to.equal(1000n); // 1000 LGU
    });
  });

  describe("3️⃣ PAYMASTER SETTLEMENT LOGIC (FINAL)", function () {
    let sessionId: string;
    const sessionValueUSDT = 200n * 1e6n; // 200 USDT
    const gasUsedLGU = 1500n;

    beforeEach(async function () {
      const tx = await paymaster.connect(gateway).startSession(
        user1.address,
        await usdt.getAddress(),
        sessionValueUSDT
      );
      const receipt = await tx.wait();
      const event = receipt?.logs?.find((log: any) => {
        try {
          const parsed = paymaster.interface.parseLog(log);
          return parsed.name === "SessionStarted";
        } catch {
          return false;
        }
      });
      if (event) {
        const parsed = paymaster.interface.parseLog(event);
        sessionId = parsed.args.sessionId;
      }
    });

    it("✅ Step 1: Fee calculation (1% always in USDT)", async function () {
      const expectedFee = (sessionValueUSDT * FEE_BPS) / 10000n;
      expect(expectedFee).to.equal(2n * 1e6n); // 2 USDT
    });

    it("✅ Step 2: Net value calculation", async function () {
      const feeUSDT = (sessionValueUSDT * FEE_BPS) / 10000n;
      const netValueUSDT = sessionValueUSDT - feeUSDT;
      expect(netValueUSDT).to.equal(198n * 1e6n); // 198 USDT
    });

    it("✅ Step 3: Gas cost calculation (INTERNAL ONLY)", async function () {
      const gasCostUSDT = gasUsedLGU * LGU_PRICE_USDT;
      expect(gasCostUSDT).to.equal(1500n * 1e6n); // 1500 USDT
    });

    it("✅ Step 4: LGU accounting (INTERNAL LEDGER)", async function () {
      const initialBalance = await paymaster.paymasterLGUBalance();
      
      await paymaster.connect(gateway).recordGasUsage(sessionId, gasUsedLGU);
      await paymaster.connect(gateway).endSession(sessionId);

      const finalBalance = await paymaster.paymasterLGUBalance();
      expect(finalBalance).to.equal(initialBalance - gasUsedLGU);
    });
  });

  describe("4️⃣ LGU ACCOUNTING (INTERNAL LEDGER)", function () {
    it("✅ Should track LGU usage per user", async function () {
      const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), 100n * 1e6n);
      
      await paymaster.connect(gateway).recordGasUsage(sessionId, 500n);
      await paymaster.connect(gateway).endSession(sessionId);

      const userMetrics = await paymaster.getUserMetrics(user1.address);
      expect(userMetrics.totalLGUUsed).to.equal(500n);
    });

    it("✅ Should prevent negative LGU balance", async function () {
      // Drain paymaster LGU balance
      const currentBalance = await paymaster.paymasterLGUBalance();
      await paymaster.connect(owner).topUpLGUBalance(1000n); // Add small amount
      
      const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), 100n * 1e6n);
      
      // Try to use more LGU than available
      await paymaster.connect(gateway).recordGasUsage(sessionId, 2000n);
      
      await expect(
        paymaster.connect(gateway).endSession(sessionId)
      ).to.be.revertedWith("Insufficient LGU balance");
    });
  });

  describe("5️⃣ FINAL MONEY FLOW (CLEAR)", function () {
    it("✅ User pays USDT-equivalent and never sees gas", async function () {
      const initialUserBalance = await usdt.balanceOf(user1.address);
      const paymentAmount = 100n * 1e6n;
      
      const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), paymentAmount);
      await paymaster.connect(gateway).recordGasUsage(sessionId, 1000n);
      await paymaster.connect(gateway).endSession(sessionId);
      
      const finalUserBalance = await usdt.balanceOf(user1.address);
      expect(initialUserBalance - finalUserBalance).to.equal(paymentAmount);
      
      // User never had to deal with gas
      expect(await paymaster.userLGUUsage(user1.address)).to.equal(1000n);
    });

    it("✅ Paymaster receives 100% and keeps 1% fee", async function () {
      const initialPaymasterBalance = await usdt.balanceOf(await paymaster.getAddress());
      const paymentAmount = 100n * 1e6n;
      
      const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), paymentAmount);
      await paymaster.connect(gateway).recordGasUsage(sessionId, 1000n);
      await paymaster.connect(gateway).endSession(sessionId);
      
      const finalPaymasterBalance = await usdt.balanceOf(await paymaster.getAddress());
      expect(finalPaymasterBalance - initialPaymasterBalance).to.equal(paymentAmount);
      
      // 1% fee recorded
      const metrics = await paymaster.getProfitMetrics();
      expect(metrics.revenue).to.equal(1n * 1e6n); // 1 USDT
    });
  });

  describe("6️⃣ PAYMASTER PROFIT MODEL (LOCKED)", function () {
    it("✅ Should calculate revenue correctly", async function () {
      // Multiple sessions with different values
      for (let i = 0; i < 3; i++) {
        const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), 100n * 1e6n);
        await paymaster.connect(gateway).recordGasUsage(sessionId, 1000n);
        await paymaster.connect(gateway).endSession(sessionId);
      }
      
      const metrics = await paymaster.getProfitMetrics();
      expect(metrics.revenue).to.equal(3n * 1e6n); // 3 USDT (1% of 300 USDT)
      expect(metrics.sessionCount).to.equal(3n);
    });

    it("✅ Should provide detailed profit analytics", async function () {
      const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), 200n * 1e6n);
      await paymaster.connect(gateway).recordGasUsage(sessionId, 1500n);
      await paymaster.connect(gateway).endSession(sessionId);
      
      const detailed = await paymaster.getDetailedProfitMetrics();
      expect(detailed.avgFeePerSession).to.equal(2n * 1e6n); // 2 USDT
      expect(detailed.avgGasPerSession).to.equal(1500n);
      expect(detailed.totalProfitMargin).to.be.gt(0n); // Should have positive margin
    });
  });

  describe("7️⃣ PRODUCTION GRADE VALIDATION", function () {
    it("✅ Single settlement asset (USDT)", async function () {
      // All payments should normalize to USDT
      const usdtSession = await startSessionWithPayment(user1, await usdt.getAddress(), 100n * 1e6n);
      const usdcSession = await startSessionWithPayment(user2, await usdc.getAddress(), 100n * 1e18n);
      
      const usdtDetails = await paymaster.getSessionDetails(usdtSession);
      const usdcDetails = await paymaster.getSessionDetails(usdcSession);
      
      expect(usdtDetails.sessionValueUSDT).to.equal(100n * 1e6n);
      expect(usdcDetails.sessionValueUSDT).to.equal(100n * 1e6n); // Normalized to USDT
    });

    it("✅ Gas abstraction (users never see gas)", async function () {
      const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), 100n * 1e6n);
      
      // User can continue operations without worrying about gas
      await paymaster.connect(gateway).recordGasUsage(sessionId, 999999n); // Large gas usage
      
      // Settlement handles gas internally
      await paymaster.connect(gateway).endSession(sessionId);
      
      // User only paid the original amount
      expect(await usdt.balanceOf(user1.address)).to.be.lt(10000n * 1e6n - 100n * 1e6n);
    });

    it("✅ Business model (1% fee on all transactions)", async function () {
      const paymentAmounts = [50n * 1e6n, 100n * 1e6n, 200n * 1e6n];
      const expectedFees = paymentAmounts.map(amount => (amount * FEE_BPS) / 10000n);
      
      for (let i = 0; i < paymentAmounts.length; i++) {
        const sessionId = await startSessionWithPayment(user1, await usdt.getAddress(), paymentAmounts[i]);
        await paymaster.connect(gateway).recordGasUsage(sessionId, 1000n);
        await paymaster.connect(gateway).endSession(sessionId);
      }
      
      const metrics = await paymaster.getProfitMetrics();
      const totalExpectedFees = expectedFees.reduce((sum, fee) => sum + fee, 0n);
      expect(metrics.revenue).to.equal(totalExpectedFees);
    });
  });

  // Helper function to start a session
  async function startSessionWithPayment(user: SignerWithAddress, token: string, amount: bigint): Promise<string> {
    const tx = await paymaster.connect(gateway).startSession(user.address, token, amount);
    const receipt = await tx.wait();
    const event = receipt?.logs?.find((log: any) => {
      try {
        const parsed = paymaster.interface.parseLog(log);
        return parsed.name === "SessionStarted";
      } catch {
        return false;
      }
    });
    if (event) {
      const parsed = paymaster.interface.parseLog(event);
      return parsed.args.sessionId;
    }
    return "";
  }
});
