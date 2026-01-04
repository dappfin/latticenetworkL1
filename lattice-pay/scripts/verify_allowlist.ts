import { ethers } from "hardhat";

async function main() {
  const registryAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"; // GatewayRegistry
  const gatewayAddress = "0x000000000000000000000000000000000dEaD"; // Test gateway

  const [signer] = await ethers.getSigners();

  const registry = new ethers.Contract(
    registryAddress,
    ["function isAllowed(address) external view returns (bool)"],
    signer
  );

  const isAllowed = await registry.isAllowed(gatewayAddress);
  console.log("Gateway isAllowed:", isAllowed);
  console.log("Gateway address:", gatewayAddress);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
