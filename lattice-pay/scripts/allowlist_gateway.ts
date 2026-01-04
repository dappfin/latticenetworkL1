import { ethers } from "hardhat";

const GATEWAY_ADDRESS = "0x000000000000000000000000000000000000dEaD"; // replace with real gateway EOA

async function main() {
  const registryAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"; // GatewayRegistry

  const [signer] = await ethers.getSigners();

  // Use getAddress() to ensure proper address format and avoid ENS resolution
  const gatewayAddr = ethers.getAddress(GATEWAY_ADDRESS);
  const registryAddr = ethers.getAddress(registryAddress);

  const registry = new ethers.Contract(
    registryAddr,
    ["function allow(address) external", "function isAllowed(address) external view returns (bool)"],
    signer
  );

  const tx = await registry.allow(gatewayAddr);
  await tx.wait();

  console.log("✅ Gateway allowlisted:", gatewayAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
