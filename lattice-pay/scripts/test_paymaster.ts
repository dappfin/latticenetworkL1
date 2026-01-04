import { ethers } from "hardhat";

async function main() {
  const paymaster = new ethers.Contract(
    "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    ["function validate(address, address) external view returns (bool)"],
    (await ethers.getSigners())[0]
  );
  
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  const gatewayAddress = "0x000000000000000000000000000000000000dEaD"; // Test gateway (now allowlisted)
  const invalidUser = "0x0000000000000000000000000000000000000";
  const invalidGateway = "0x0000000000000000000000000000000000000";
  
  console.log("Testing Paymaster validation...");
  
  // Test 1: Valid user and allowed gateway (should pass if gateway is allowed)
  try {
    const result = await paymaster.validate.staticCall(userAddress, gatewayAddress);
    console.log("✅ Test 1 (Valid user + allowed gateway):", result);
  } catch (error: any) {
    console.log("❌ Test 1 (Valid user + allowed gateway):", error.message);
  }
  
  // Test 2: Invalid user (no subscription)
  try {
    const result = await paymaster.validate.staticCall(invalidUser, gatewayAddress);
    console.log("✅ Test 2 (Invalid user):", result);
  } catch (error: any) {
    console.log("❌ Test 2 (Invalid user):", error.message);
  }
  
  // Test 3: Invalid gateway
  try {
    const result = await paymaster.validate.staticCall(userAddress, invalidGateway);
    console.log("✅ Test 3 (Invalid gateway):", result);
  } catch (error: any) {
    console.log("❌ Test 3 (Invalid gateway):", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
