import "hardhat-deploy";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import { MyNetworksUserConfig } from "./types/HardhatConfigTypes";

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const config: MyNetworksUserConfig = {
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmation: 1,
        },
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY as string],
            chainId: 11155111,
            blockConfirmation: 5,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    solidity: "0.8.8",
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    mocha: {
        timeout: 200000,
    },
};

export default config;
