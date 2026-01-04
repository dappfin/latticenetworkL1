import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying LatticePay contracts...");
  
  const [signer] = await ethers.getSigners();
  console.log("Deployer address:", await signer.getAddress());

  // Deploy SubscriptionNFT
  console.log("Deploying SubscriptionNFT...");
  const SubscriptionNFT = await ethers.getContractFactory("SubscriptionNFT");
  const subscriptionNFT = await SubscriptionNFT.deploy();
  await subscriptionNFT.waitForDeployment();
  const subscriptionNFTAddress = await subscriptionNFT.getAddress();
  console.log("✅ SubscriptionNFT deployed to:", subscriptionNFTAddress);

  // Deploy GatewayRegistry
  console.log("Deploying GatewayRegistry...");
  const GatewayRegistry = await ethers.getContractFactory("GatewayRegistry");
  const gatewayRegistry = await GatewayRegistry.deploy();
  await gatewayRegistry.waitForDeployment();
  const gatewayRegistryAddress = await gatewayRegistry.getAddress();
  console.log("✅ GatewayRegistry deployed to:", gatewayRegistryAddress);

  // Deploy Paymaster
  console.log("Deploying Paymaster...");
  const Paymaster = await ethers.getContractFactory("Paymaster");
  const paymaster = await Paymaster.deploy(subscriptionNFTAddress, gatewayRegistryAddress);
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log("✅ Paymaster deployed to:", paymasterAddress);

  // Save deployment addresses
  const deployments = {
    SubscriptionNFT: subscriptionNFTAddress,
    GatewayRegistry: gatewayRegistryAddress,
    Paymaster: paymasterAddress
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deployments, null, 2));

  console.log("\n🎉 LatticePay deployment complete!");
  console.log("Next steps:");
  console.log("1. Update deployment addresses in scripts");
  console.log("2. Allowlist gateway addresses");
  console.log("3. Test paymaster validation");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
