import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const Sub = await ethers.getContractFactory("SubscriptionNFT");
  const sub = await Sub.deploy();
  await sub.waitForDeployment();
  const subAddress = await sub.getAddress();

  const Gate = await ethers.getContractFactory("GatewayRegistry");
  const gate = await Gate.deploy();
  await gate.waitForDeployment();
  const gateAddress = await gate.getAddress();

  const Pay = await ethers.getContractFactory("Paymaster");
  const pay = await Pay.deploy(subAddress, gateAddress);
  await pay.waitForDeployment();
  const payAddress = await pay.getAddress();

  console.log({
    SubscriptionNFT: subAddress,
    GatewayRegistry: gateAddress,
    Paymaster: payAddress
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
