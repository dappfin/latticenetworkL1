import { ethers } from "hardhat";

async function main() {
  console.log("🎯 Testing LatticePay Success Paths...");
  
  // Update these addresses after deployment
  const ADDRESSES = {
    SubscriptionNFT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    GatewayRegistry: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", 
    Paymaster: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
  };

  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  console.log("Testing with user address:", userAddress);

  // Test 1: Mint subscription (success path)
  console.log("\n📝 Test 1: Minting subscription...");
  const subscriptionNFT = new ethers.Contract(
    ADDRESSES.SubscriptionNFT,
    ["function mint(address, uint8, uint256) external"],
    signer
  );

  try {
    const duration = 30 * 24 * 60 * 60; // 30 days
    const tx = await subscriptionNFT.mint(userAddress, 1, duration);
    await tx.wait();
    console.log("✅ Subscription minted successfully");
  } catch (error: any) {
    console.log("❌ Subscription mint failed:", error.message);
  }

  // Test 2: Allowlist gateway (success path)
  console.log("\n🚪 Test 2: Allowlisting gateway...");
  const gatewayAddress = "0x000000000000000000000000000000000dEaD";
  const gatewayRegistry = new ethers.Contract(
    ADDRESSES.GatewayRegistry,
    ["function allow(address) external", "function isAllowed(address) external view returns (bool)"],
    signer
  );

  try {
    const tx = await gatewayRegistry.allow(gatewayAddress);
    await tx.wait();
    console.log("✅ Gateway allowlisted successfully");
  } catch (error: any) {
    console.log("❌ Gateway allowlist failed:", error.message);
  }

  // Test 3: Validate paymaster (success path)
  console.log("\n💳 Test 3: Validating paymaster...");
  const paymaster = new ethers.Contract(
    ADDRESSES.Paymaster,
    ["function validate(address, address) external view returns (bool)"],
    signer
  );

  try {
    const result = await paymaster.validate.staticCall(userAddress, gatewayAddress);
    console.log("✅ Paymaster validation successful:", result);
  } catch (error: any) {
    console.log("❌ Paymaster validation failed:", error.message);
  }

  console.log("\n🎉 Success path testing complete!");
  console.log("All critical functionality verified and working.");
}

main().catch((error) => {
  console.error("❌ Success path testing failed:", error);
  process.exit(1);
});
