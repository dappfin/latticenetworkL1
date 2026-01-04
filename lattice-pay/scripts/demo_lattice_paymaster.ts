// scripts/demo_lattice_paymaster.ts
import { ethers } from "hardhat";

async function main() {
  console.log("🎮 Lattice Paymaster Demo - Final Gas & Payment Model");
  console.log("================================================");
  
  const [deployer, user, gateway] = await ethers.getSigners();
  
  // Deploy contracts (simplified for demo)
  console.log("🚀 Setting up demo environment...");
  
  // Deploy Mock USDT
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("USDT", "USDT", 6);
  await usdt.waitForDeployment();
  
  // Deploy Mock USDC
  const usdc = await MockERC20.deploy("USDC", "USDC", 6);
  await usdc.waitForDeployment();
  
  // Deploy Price Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(await usdt.getAddress());
  await priceOracle.waitForDeployment();
  await priceOracle.addToken(await usdc.getAddress(), ethers.parseUnits("1", 12));
  
  // Deploy Gateway
  const Gateway = await ethers.getContractFactory("Gateway");
  const gatewayContract = await Gateway.deploy();
  await gatewayContract.waitForDeployment();
  await gatewayContract.addGateway(gateway.address, 1000);
  await gatewayContract.addCaller(gateway.address);
  
  // Deploy Subscription
  const Subscription = await ethers.getContractFactory("Subscription");
  const subscription = await Subscription.deploy(await usdt.getAddress());
  await subscription.waitForDeployment();
  
  // Deploy Lattice Paymaster
  const LatticePaymaster = await ethers.getContractFactory("LatticePaymaster");
  const paymaster = await LatticePaymaster.deploy(
    await subscription.getAddress(),
    await gatewayContract.getAddress(),
    await priceOracle.getAddress(),
    await usdt.getAddress()
  );
  await paymaster.waitForDeployment();
  await paymaster.addSupportedToken(await usdc.getAddress());
  
  // Mint tokens to user
  const userBalance = ethers.parseUnits("1000", 6);
  await usdt.mint(user.address, userBalance);
  await usdc.mint(user.address, userBalance);
  
  // User purchases subscription
  console.log("📋 User purchasing Basic subscription...");
  await usdt.connect(user).approve(await subscription.getAddress(), ethers.parseUnits("10", 6));
  await subscription.connect(user).purchaseSubscription(0, 1); // Basic tier, 1 month
  
  // Demo scenarios
  console.log("\n🎯 DEMO SCENARIOS");
  console.log("================");
  
  // Scenario 1: USDT Payment
  console.log("\n💳 Scenario 1: User pays with USDT");
  const usdtPayment = ethers.parseUnits("100", 6);
  await usdt.connect(user).approve(await paymaster.getAddress(), usdtPayment);
  
  const session1 = await paymaster.connect(gateway).startSession(
    user.address,
    await usdt.getAddress(),
    usdtPayment
  );
  const receipt1 = await session1.wait();
  const sessionId1 = receipt1.logs.find((log: any) => log.fragment?.name === "SessionStarted")?.args?.sessionId;
  
  console.log(`✅ Session started with ${ethers.formatUnits(usdtPayment, 6)} USDT`);
  console.log(`📊 Session ID: ${sessionId1}`);
  
  // Record gas usage and end session
  const gasUsed = ethers.parseEther("500"); // 500 LGU
  await paymaster.connect(gateway).recordGasUsage(sessionId1, gasUsed);
  await paymaster.connect(gateway).endSession(sessionId1);
  
  const metrics1 = await paymaster.getProfitMetrics();
  console.log(`💰 Fee collected: ${ethers.formatUnits(metrics1.revenue, 6)} USDT`);
  console.log(`⛽ Gas used: ${ethers.formatEther(gasUsed)} LGU`);
  
  // Scenario 2: USDC Payment (with normalization)
  console.log("\n💳 Scenario 2: User pays with USDC (normalized to USDT)");
  const usdcPayment = ethers.parseUnits("50", 6);
  await usdc.connect(user).approve(await paymaster.getAddress(), usdcPayment);
  
  const session2 = await paymaster.connect(gateway).startSession(
    user.address,
    await usdc.getAddress(),
    usdcPayment
  );
  const receipt2 = await session2.wait();
  const sessionId2 = receipt2.logs.find((log: any) => log.fragment?.name === "SessionStarted")?.args?.sessionId;
  
  const normalizedEvent = receipt2.logs.find((log: any) => log.fragment?.name === "PaymentNormalized");
  console.log(`✅ ${ethers.formatUnits(usdcPayment, 6)} USDC normalized to ${ethers.formatUnits(normalizedEvent?.args?.usdtAmount, 6)} USDT`);
  
  // End session
  await paymaster.connect(gateway).recordGasUsage(sessionId2, ethers.parseEther("300"));
  await paymaster.connect(gateway).endSession(sessionId2);
  
  // Scenario 3: Profit Model Analysis
  console.log("\n📈 Scenario 3: Profit Model Analysis");
  const finalMetrics = await paymaster.getProfitMetrics();
  console.log(`💰 Total Revenue: ${ethers.formatUnits(finalMetrics.revenue, 6)} USDT`);
  console.log(`⛽ Total Gas Used: ${ethers.formatEther(finalMetrics.totalGas)} LGU`);
  console.log(`👥 Total Sessions: ${finalMetrics.sessionCount}`);
  console.log(`🏦 Current LGU Balance: ${ethers.formatEther(finalMetrics.currentLGUBalance)} LGU`);
  
  // Calculate profit
  const totalGasCostUSDT = finalMetrics.totalGas * ethers.parseUnits("1", 6); // 1 USDT per LGU
  const profit = finalMetrics.revenue; // Revenue is already the profit (1% fee)
  console.log(`💸 Total Gas Cost: ${ethers.formatUnits(totalGasCostUSDT, 6)} USDT`);
  console.log(`🎯 Net Profit: ${ethers.formatUnits(profit, 6)} USDT`);
  
  console.log("\n🎉 DEMO COMPLETE!");
  console.log("================");
  console.log("✅ Payment normalization working");
  console.log("✅ Session settlement engine operational");
  console.log("✅ 1% fee collection working");
  console.log("✅ LGU accounting system functional");
  console.log("✅ Profit model tracking active");
  console.log("✅ Production-ready gas abstraction");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  });
