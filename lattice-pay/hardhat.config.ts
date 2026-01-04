import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    lattice: {
      url: process.env.RPC_URL || "http://localhost:8545",
      chainId: parseInt(process.env.CHAIN_ID || "88401"),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  solidity: "0.8.20"
};

export default config;
