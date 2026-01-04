import { ethers } from "hardhat";

async function main() {
  const sub = await ethers.getContractAt(
    "SubscriptionNFT",
    "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  );
  
  const [signer] = await ethers.getSigners();
  const userAddress = await signer.getAddress();
  
  // Mint 1 Solo subscription for 30 days (30 * 24 * 60 * 60 seconds)
  const duration = 30 * 24 * 60 * 60; // 30 days in seconds
  
  await sub.mint(userAddress, 1, duration);
  console.log(`Minted Solo subscription for ${userAddress}`);
  
  // Verify subscription is active
  const isActive = await sub.active(userAddress);
  console.log(`Subscription active: ${isActive}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
