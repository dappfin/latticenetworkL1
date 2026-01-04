// scripts/test_lattice_paymaster.ts
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Lattice Paymaster - Final Gas & Payment Model", function () {
    let paymaster: any;
    let priceOracle: any;
    let subscription: any;
    let gateway: any;
    let usdt: any;
    let usdc: any;
    let owner: any;
    let user: any;
    let gatewayAddress: any;
    
    const USDT_AMOUNT = ethers.parseUnits("100", 6); // 100 USDT
    const USDC_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC
    const ETH_AMOUNT = ethers.parseEther("0.05"); // 0.05 ETH
    
    beforeEach(async function () {
        [owner, user, gatewayAddress] = await ethers.getSigners();
        
        // Deploy mock USDT
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        usdt = await MockERC20.deploy("USDT", "USDT", 6);
        await usdt.waitForDeployment();
        
        // Deploy mock USDC
        usdc = await MockERC20.deploy("USDC", "USDC", 6);
        await usdc.waitForDeployment();
        
        // Deploy PriceOracle
        const PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy(await usdt.getAddress());
        await priceOracle.waitForDeployment();
        
        // Set up prices
        await priceOracle.addToken(await usdc.getAddress(), ethers.parseUnits("1", 12)); // 1 USDC = 1 USDT
        
        // Deploy Gateway
        const Gateway = await ethers.getContractFactory("Gateway");
        gateway = await Gateway.deploy();
        await gateway.waitForDeployment();
        
        // Add gateway and caller
        await gateway.addGateway(await gatewayAddress.getAddress(), 1000);
        await gateway.addCaller(await gatewayAddress.getAddress());
        
        // Deploy Subscription
        const Subscription = await ethers.getContractFactory("Subscription");
        subscription = await Subscription.deploy(await usdt.getAddress());
        await subscription.waitForDeployment();
        
        // Deploy Paymaster
        const LatticePaymaster = await ethers.getContractFactory("LatticePaymaster");
        paymaster = await LatticePaymaster.deploy(
            await subscription.getAddress(),
            await gateway.getAddress(),
            await priceOracle.getAddress(),
            await usdt.getAddress()
        );
        await paymaster.waitForDeployment();
        
        // Add supported tokens
        await paymaster.addSupportedToken(await usdc.getAddress());
        
        // Mint tokens to user
        await usdt.mint(user.address, USDT_AMOUNT * 10n);
        await usdc.mint(user.address, USDC_AMOUNT * 10n);
        
        // Approve tokens
        await usdt.connect(user).approve(await subscription.getAddress(), USDT_AMOUNT * 10n);
        await usdt.connect(user).approve(await paymaster.getAddress(), USDT_AMOUNT * 10n);
        await usdc.connect(user).approve(await paymaster.getAddress(), USDC_AMOUNT * 10n);
        
        // Purchase subscription
        await subscription.connect(user).purchaseSubscription(0, 1); // Basic tier, 1 month
    });
    
    describe("Payment Normalization", function () {
        it("Should normalize USDT payment directly", async function () {
            const usdtAmount = ethers.parseUnits("50", 6);
            const normalized = await paymaster.normalizePayment(await usdt.getAddress(), usdtAmount);
            expect(normalized).to.equal(usdtAmount);
        });
        
        it("Should normalize USDC payment to USDT", async function () {
            const usdcAmount = ethers.parseUnits("50", 6);
            const normalized = await paymaster.normalizePayment(await usdc.getAddress(), usdcAmount);
            expect(normalized).to.equal(usdcAmount); // 1:1 ratio
        });
        
        it("Should reject unsupported tokens", async function () {
            const randomToken = ethers.Wallet.createRandom().address;
            await expect(
                paymaster.normalizePayment(randomToken, ethers.parseUnits("50", 6))
            ).to.be.revertedWith("Token not supported");
        });
    });
    
    describe("Session Management", function () {
        it("Should start session with USDT payment", async function () {
            const paymentAmount = ethers.parseUnits("50", 6);
            const tx = await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdt.getAddress(),
                paymentAmount
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => log.fragment?.name === "SessionStarted");
            expect(event).to.not.be.undefined;
            expect(event.args.user).to.equal(user.address);
            expect(event.args.paymentToken).to.equal(await usdt.getAddress());
            expect(event.args.paymentAmount).to.equal(paymentAmount);
        });
        
        it("Should start session with USDC payment", async function () {
            const paymentAmount = ethers.parseUnits("50", 6);
            const tx = await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdc.getAddress(),
                paymentAmount
            );
            
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => log.fragment?.name === "PaymentNormalized");
            expect(event).to.not.be.undefined;
            expect(event.args.token).to.equal(await usdc.getAddress());
            expect(event.args.usdtAmount).to.equal(paymentAmount);
        });
        
        it("Should reject session for non-subscribed user", async function () {
            const nonSubscribed = ethers.Wallet.createRandom().address;
            await expect(
                paymaster.connect(gatewayAddress).startSession(
                    nonSubscribed,
                    await usdt.getAddress(),
                    ethers.parseUnits("50", 6)
                )
            ).to.be.revertedWith("NO_SUBSCRIPTION");
        });
        
        it("Should reject duplicate active sessions", async function () {
            const paymentAmount = ethers.parseUnits("50", 6);
            
            await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdt.getAddress(),
                paymentAmount
            );
            
            await expect(
                paymaster.connect(gatewayAddress).startSession(
                    user.address,
                    await usdt.getAddress(),
                    paymentAmount
                )
            ).to.be.revertedWith("Session already active");
        });
    });
    
    describe("Settlement Engine", function () {
        it("Should settle session with correct fee calculation", async function () {
            const sessionValue = ethers.parseUnits("100", 6); // 100 USDT
            const gasUsed = ethers.parseEther("1000"); // 1000 LGU
            
            // Start session
            const tx = await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdt.getAddress(),
                sessionValue
            );
            const receipt = await tx.wait();
            const sessionEvent = receipt.logs.find((log: any) => log.fragment?.name === "SessionStarted");
            const sessionId = sessionEvent.args.sessionId;
            
            // Record gas usage
            await paymaster.connect(gatewayAddress).recordGasUsage(sessionId, gasUsed);
            
            // End session
            const endTx = await paymaster.connect(gatewayAddress).endSession(sessionId);
            const endReceipt = await endTx.wait();
            const settleEvent = endReceipt.logs.find((log: any) => log.fragment?.name === "SessionEnded");
            
            // Verify settlement
            expect(settleEvent.args.sessionValueUSDT).to.equal(sessionValue);
            expect(settleEvent.args.feeUSDT).to.equal(sessionValue / 100n); // 1% fee
            expect(settleEvent.args.gasUsedLGU).to.equal(gasUsed);
            
            // Verify profit metrics
            const metrics = await paymaster.getProfitMetrics();
            expect(metrics.revenue).to.equal(sessionValue / 100n); // 1% fee
            expect(metrics.totalGas).to.equal(gasUsed);
            expect(metrics.sessionCount).to.equal(1);
        });
        
        it("Should handle LGU accounting correctly", async function () {
            const initialBalance = await paymaster.paymasterLGUBalance();
            const gasUsed = ethers.parseEther("500");
            
            // Start and end session
            const tx = await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdt.getAddress(),
                ethers.parseUnits("50", 6)
            );
            const receipt = await tx.wait();
            const sessionEvent = receipt.logs.find((log: any) => log.fragment?.name === "SessionStarted");
            const sessionId = sessionEvent.args.sessionId;
            
            await paymaster.connect(gatewayAddress).recordGasUsage(sessionId, gasUsed);
            await paymaster.connect(gatewayAddress).endSession(sessionId);
            
            // Verify LGU balance decreased
            const finalBalance = await paymaster.paymasterLGUBalance();
            expect(finalBalance).to.equal(initialBalance - gasUsed);
            
            // Verify user LGU usage tracked
            const userUsage = await paymaster.userLGUUsage(user.address);
            expect(userUsage).to.equal(gasUsed);
        });
    });
    
    describe("Profit Model", function () {
        it("Should track revenue correctly across multiple sessions", async function () {
            const sessionValue = ethers.parseUnits("200", 6);
            const expectedRevenue = sessionValue / 100n; // 1% fee
            
            // Create multiple sessions
            for (let i = 0; i < 3; i++) {
                const tx = await paymaster.connect(gatewayAddress).startSession(
                    user.address,
                    await usdt.getAddress(),
                    sessionValue
                );
                const receipt = await tx.wait();
                const sessionEvent = receipt.logs.find((log: any) => log.fragment?.name === "SessionStarted");
                const sessionId = sessionEvent.args.sessionId;
                
                await paymaster.connect(gatewayAddress).endSession(sessionId);
            }
            
            // Verify total revenue
            const metrics = await paymaster.getProfitMetrics();
            expect(metrics.revenue).to.equal(expectedRevenue * 3n);
            expect(metrics.sessionCount).to.equal(3);
        });
        
        it("Should record profit events correctly", async function () {
            const sessionValue = ethers.parseUnits("100", 6);
            const gasUsed = ethers.parseEther("1000");
            const expectedFee = sessionValue / 100n; // 1% fee
            const expectedGasCost = gasUsed * ethers.parseUnits("1", 6); // 1 USDT per LGU
            
            // Start and end session
            const tx = await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdt.getAddress(),
                sessionValue
            );
            const receipt = await tx.wait();
            const sessionEvent = receipt.logs.find((log: any) => log.fragment?.name === "SessionStarted");
            const sessionId = sessionEvent.args.sessionId;
            
            await paymaster.connect(gatewayAddress).recordGasUsage(sessionId, gasUsed);
            const endTx = await paymaster.connect(gatewayAddress).endSession(sessionId);
            const endReceipt = await endTx.wait();
            
            // Verify profit event
            const profitEvent = endReceipt.logs.find((log: any) => log.fragment?.name === "ProfitRecorded");
            expect(profitEvent.args.revenueUSDT).to.equal(expectedFee);
            expect(profitEvent.args.gasCostUSDT).to.equal(expectedGasCost);
        });
    });
    
    describe("Validation Functions", function () {
        it("Should validate user subscription correctly", async function () {
            const isValid = await paymaster.validateUser(user.address);
            expect(isValid).to.be.true;
            
            const nonSubscribed = ethers.Wallet.createRandom().address;
            const isInvalid = await paymaster.validateUser(nonSubscribed);
            expect(isInvalid).to.be.false;
        });
        
        it("Should validate gateway access correctly", async function () {
            const isValid = await paymaster.validateGateway(gatewayAddress.address);
            expect(isValid).to.be.true;
            
            const invalidGateway = ethers.Wallet.createRandom().address;
            const isInvalid = await paymaster.validateGateway(invalidGateway);
            expect(isInvalid).to.be.false;
        });
    });
    
    describe("Edge Cases", function () {
        it("Should reject zero payment amounts", async function () {
            await expect(
                paymaster.connect(gatewayAddress).startSession(
                    user.address,
                    await usdt.getAddress(),
                    0
                )
            ).to.be.revertedWith("Invalid payment amount");
        });
        
        it("Should reject ending non-existent sessions", async function () {
            const fakeSessionId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
            await expect(
                paymaster.connect(gatewayAddress).endSession(fakeSessionId)
            ).to.be.revertedWith("Session not active");
        });
        
        it("Should reject insufficient LGU balance", async function () {
            // Drain LGU balance completely
            const currentBalance = await paymaster.paymasterLGUBalance();
            
            // Start session with minimal gas usage
            const tx = await paymaster.connect(gatewayAddress).startSession(
                user.address,
                await usdt.getAddress(),
                ethers.parseUnits("10", 6)
            );
            const receipt = await tx.wait();
            const sessionEvent = receipt.logs.find((log: any) => log.fragment?.name === "SessionStarted");
            const sessionId = sessionEvent.args.sessionId;
            
            // Try to use more than available
            const gasUsed = currentBalance + ethers.parseEther("1");
            
            await paymaster.connect(gatewayAddress).recordGasUsage(sessionId, gasUsed);
            
            await expect(
                paymaster.connect(gatewayAddress).endSession(sessionId)
            ).to.be.revertedWith("Insufficient LGU balance");
        });
    });
});
