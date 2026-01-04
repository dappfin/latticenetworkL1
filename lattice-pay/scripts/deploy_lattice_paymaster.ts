// scripts/deploy_lattice_paymaster.ts
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Lattice Paymaster System...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Deploy Mock USDT (for testing)
  console.log("🪙 Deploying Mock USDT...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdt = await MockERC20.deploy("USDT", "USDT", 6);
  await usdt.waitForDeployment();
  console.log("✅ USDT deployed to:", await usdt.getAddress());
  
  // Deploy Mock USDC (for testing)
  console.log("🪙 Deploying Mock USDC...");
  const usdc = await MockERC20.deploy("USDC", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("✅ USDC deployed to:", await usdc.getAddress());
  
  // Deploy Price Oracle
  console.log("🔮 Deploying Price Oracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy(await usdt.getAddress());
  await priceOracle.waitForDeployment();
  console.log("✅ Price Oracle deployed to:", await priceOracle.getAddress());
  
  // Set up token prices
  console.log("💰 Setting up token prices...");
  await priceOracle.addToken(await usdc.getAddress(), ethers.parseUnits("1", 12)); // 1 USDC = 1 USDT
  console.log("✅ Token prices configured");
  
  // Deploy Gateway
  console.log("🚪 Deploying Gateway...");
  const Gateway = await ethers.getContractFactory("Gateway");
  const gateway = await Gateway.deploy();
  await gateway.waitForDeployment();
  console.log("✅ Gateway deployed to:", await gateway.getAddress());
  
  // Deploy Subscription
  console.log("📋 Deploying Subscription...");
  const Subscription = await ethers.getContractFactory("Subscription");
  const subscription = await Subscription.deploy(await usdt.getAddress());
  await subscription.waitForDeployment();
  console.log("✅ Subscription deployed to:", await subscription.getAddress());
  
  // Deploy Lattice Paymaster
  console.log("💳 Deploying Lattice Paymaster...");
  const LatticePaymaster = await ethers.getContractFactory("LatticePaymaster");
  const paymaster = await LatticePaymaster.deploy(
    await subscription.getAddress(),
    await gateway.getAddress(),
    await priceOracle.getAddress(),
    await usdt.getAddress()
  );
  await paymaster.waitForDeployment();
  console.log("✅ Lattice Paymaster deployed to:", await paymaster.getAddress());
  
  // Configure supported tokens
  console.log("🔧 Configuring supported tokens...");
  await paymaster.addSupportedToken(await usdc.getAddress());
  console.log("✅ USDC added to supported tokens");
  
  // Configure gateway
  console.log("🔧 Configuring gateway...");
  const testGateway = deployer.address; // Use deployer as test gateway
  await gateway.addGateway(testGateway, 1000); // 1000 calls per hour
  await gateway.addCaller(testGateway);
  console.log("✅ Gateway configured");
  
  // Mint test tokens
  console.log("🪙 Minting test tokens...");
  const testAmount = ethers.parseUnits("1000000", 6); // 1M tokens
  
  await usdt.mint(deployer.address, testAmount);
  await usdc.mint(deployer.address, testAmount);
  console.log("✅ Test tokens minted to deployer");
  
  // Create deployment summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("===========================================");
  console.log("📊 Contract Addresses:");
  console.log(`  USDT: ${await usdt.getAddress()}`);
  console.log(`  USDC: ${await usdc.getAddress()}`);
  console.log(`  Price Oracle: ${await priceOracle.getAddress()}`);
  console.log(`  Gateway: ${await gateway.getAddress()}`);
  console.log(`  Subscription: ${await subscription.getAddress()}`);
  console.log(`  Lattice Paymaster: ${await paymaster.getAddress()}`);
  console.log("===========================================");
  
  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      USDT: await usdt.getAddress(),
      USDC: await usdc.getAddress(),
      PriceOracle: await priceOracle.getAddress(),
      Gateway: await gateway.getAddress(),
      Subscription: await subscription.getAddress(),
      LatticePaymaster: await paymaster.getAddress()
    },
    timestamp: new Date().toISOString()
  };
  
  // Write to file (in a real deployment)
  console.log("📝 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
