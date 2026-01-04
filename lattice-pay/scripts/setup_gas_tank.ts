import { ethers } from "hardhat";

async function main() {
  console.log("💰 Creating Paymaster Treasury Wallet...");
  
  const [signer] = await ethers.getSigners();
  console.log("Deployer address:", await signer.getAddress());

  // Create treasury wallet (this would be done via lattice CLI in production)
  // For now, we'll use the deployer as treasury
  const treasuryAddress = await signer.getAddress();
  console.log("🏦 Treasury wallet address:", treasuryAddress);

  // Fund paymaster with gas
  console.log("⛽ Funding paymaster with gas...");
  const paymasterAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
  
  // Send 1 ETH to paymaster for gas
  const tx = await signer.sendTransaction({
    to: paymasterAddress,
    value: ethers.parseEther("1.0")
  });
  await tx.wait();
  
  console.log("✅ Paymaster funded with 1 ETH");

  // Check paymaster balance
  const balance = await ethers.provider.getBalance(paymasterAddress);
  console.log("💰 Paymaster balance:", ethers.formatEther(balance), "ETH");

  console.log("\n📊 Gas Tank Setup Complete!");
  console.log("Treasury:", treasuryAddress);
  console.log("Paymaster:", paymasterAddress);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error("❌ Gas tank setup failed:", error);
  process.exit(1);
});
